from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

import models, schemas
from database import get_db

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"],
    responses={404: {"description": "Not found"}},
)

# ---------------------------------------------------------------------------
# Motor de Prioridade Dinâmico
# ---------------------------------------------------------------------------
def calculate_dynamic_score(task: models.Task, current_context: Optional[str] = None) -> float:
    now_utc = datetime.now(timezone.utc)

    safe_urgency = task.urgency if task.urgency is not None else 0
    safe_effort = task.effort if (task.effort and task.effort > 0) else 1
    base_score = safe_urgency / safe_effort

    if task.category and "pesquisa" in task.category.lower():
        last_act = task.last_activity_at or task.created_at or datetime.now()
        if last_act.tzinfo is None:
            last_act = last_act.replace(tzinfo=timezone.utc)
        diff = now_utc - last_act
        days_idle = max(0, diff.days)
        if days_idle > 0:
            base_score += (days_idle * 1.5)

    if current_context == "intervalo" and task.category and "software" in task.category.lower():
        base_score *= 2.0

    persisted_score = task.priority_score if task.priority_score is not None else 0.0
    return round(persisted_score + base_score, 4)


# ---------------------------------------------------------------------------
# Helper: serialização 100% segura ORM → TaskResponse
# Evita "Input should be a valid dictionary or object to extract fields from"
# quando campos como priority_score, created_at, updated_at são NULL no banco.
# ---------------------------------------------------------------------------
def _safe_task_response(task: models.Task) -> schemas.TaskResponse:
    now_fallback = datetime.now(timezone.utc)
    return schemas.TaskResponse(
        id=task.id,
        title=task.title or "",
        description=task.description,
        category=task.category or "Geral",
        due_date=task.due_date,
        status=task.status or "backlog",
        parent_id=task.parent_id,
        is_fixed_schedule=task.is_fixed_schedule or False,
        start_time=task.start_time,
        end_time=task.end_time,
        last_activity_at=task.last_activity_at,
        urgency=task.urgency,
        effort=task.effort,
        priority_score=float(task.priority_score) if task.priority_score is not None else 0.0,
        created_at=task.created_at or now_fallback,
        updated_at=task.updated_at or now_fallback,
    )


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

@router.post("/", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
@router.post("", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)

    urgency: Optional[int] = task.urgency
    effort: Optional[int] = task.effort

    priority_score = 0.0
    new_status = task.status or "backlog"

    if urgency and effort and effort > 0:
        base_score = urgency / effort
        deadline_multiplier = 1.0

        if task.due_date:
            due = task.due_date
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            try:
                days_remaining = (due - now).total_seconds() / 86400
                if days_remaining < 0:
                    deadline_multiplier = 5.0
                elif days_remaining < 1:
                    deadline_multiplier = 4.0
                elif days_remaining < 3:
                    deadline_multiplier = 2.5
                elif days_remaining < 7:
                    deadline_multiplier = 1.5
            except TypeError:
                pass

        priority_score = round(base_score * deadline_multiplier, 4)
        if new_status in (None, "backlog"):
            new_status = "todo"

    db_task = models.Task(
        title=task.title,
        description=task.description,
        category=task.category or "Geral",
        due_date=task.due_date,
        status=new_status,
        parent_id=task.parent_id,
        is_fixed_schedule=task.is_fixed_schedule or False,
        start_time=task.start_time,
        end_time=task.end_time,
        last_activity_at=task.last_activity_at or now,
        urgency=urgency,
        effort=effort,
        priority_score=priority_score,
        created_at=now,
        updated_at=now,
    )

    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return _safe_task_response(db_task)


@router.get("/capacity")
@router.get("/capacity/")
def get_capacity(db: Session = Depends(get_db)):
    """
    Neural Bandwidth — Telemetria de capacidade cognitiva ativa.
    """
    MAX_CAPACITY = 40

    active_tasks = db.query(models.Task).filter(
        models.Task.status.in_(["todo", "in_progress"])
    ).all()

    current_load = sum(
        (t.effort if t.effort and t.effort > 0 else 0)
        for t in active_tasks
    )

    ratio = current_load / MAX_CAPACITY if MAX_CAPACITY > 0 else 0

    if ratio > 0.95:
        bandwidth_status = "Overload"
    elif ratio > 0.80:
        bandwidth_status = "High"
    else:
        bandwidth_status = "Optimal"

    return {
        "current_load": current_load,
        "max_capacity": MAX_CAPACITY,
        "status": bandwidth_status,
    }


@router.get("/", response_model=List[schemas.TaskResponse])
@router.get("", response_model=List[schemas.TaskResponse])
def get_tasks(skip: int = 0, limit: int = 100, current_context: Optional[str] = None, db: Session = Depends(get_db)):
    import traceback
    try:
        tasks = db.query(models.Task).all()
        for task in tasks:
            task._temp_score = calculate_dynamic_score(task, current_context)

        def sort_key(t):
            score = getattr(t, "_temp_score", 0.0)
            if t.due_date:
                due = t.due_date
                if due.tzinfo is None:
                    due = due.replace(tzinfo=timezone.utc)
                due_ts = due.timestamp()
            else:
                due_ts = float('inf')
            return (-score, due_ts)

        tasks.sort(key=sort_key)

        valid_tasks = []
        for task in tasks[skip: skip + limit]:
            task.priority_score = getattr(task, "_temp_score", 0.0)
            try:
                valid_tasks.append(_safe_task_response(task))
            except Exception as val_err:
                print(f"[SERIALIZATION ERROR] Task {task.id}: {str(val_err)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Erro de Schema na Task {task.id}: {str(val_err)}"
                )

        return valid_tasks

    except HTTPException:
        raise
    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"\n[CRITICAL ERROR] Motor THETA Breakdown:\n{error_trace}")
        raise HTTPException(
            status_code=500,
            detail=f"THETA_MOTOR_FAILURE: {error_trace}"
        )


@router.get("/{task_id}", response_model=schemas.TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task não encontrada")
    return _safe_task_response(db_task)


@router.put("/{task_id}", response_model=schemas.TaskResponse)
def update_task(task_id: int, task_update: schemas.TaskUpdate, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task não encontrada")

    old_status = db_task.status
    update_data = task_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_task, key, value)

    # --- Motor de Plasticidade Neural (Sistema de XP) ---
    if old_status != "done" and db_task.status == "done":
        base_xp = float(db_task.effort) if db_task.effort and db_task.effort > 0 else 1.0
        current_score = db_task.priority_score if db_task.priority_score else calculate_dynamic_score(db_task)
        final_xp = base_xp * 1.5 if current_score >= 2.5 else base_xp

        execution_log = models.ExecutionLog(
            task_id=db_task.id,
            category=db_task.category or "Geral",
            xp_gained=final_xp
        )
        db.add(execution_log)

    db.commit()
    db.refresh(db_task)

    db_task.priority_score = calculate_dynamic_score(db_task)
    return _safe_task_response(db_task)


@router.put("/{task_id}/calibrate", response_model=schemas.TaskResponse)
def calibrate_task(task_id: int, config: schemas.TaskCalibrate, db: Session = Depends(get_db)):
    """
    Motor de Prioridade Implacável — É aqui que a procrastinação paga o preço.

    Fórmula base:   score = urgency / effort

    Multiplicador de prazo (deadline_multiplier):
      • Prazo atrasado (já passou):        x 5.0
      • Menos de 1 dia restante:           x 4.0
      • Entre 1 e 3 dias restantes:        x 2.5
      • Entre 3 e 7 dias restantes:        x 1.5
      • Mais de 7 dias restantes:          x 1.0
      • Sem prazo definido:               x 1.0
    """
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task não encontrada")

    if config.effort <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O esforço (effort) precisa ser maior que zero. Valores Fibonacci válidos: 1, 2, 3, 5, 8, 13..."
        )

    now = datetime.now(timezone.utc)

    deadline_multiplier = 1.0
    if db_task.due_date:
        due = db_task.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)

        days_remaining = (due - now).total_seconds() / 86400

        if days_remaining < 0:
            deadline_multiplier = 5.0
        elif days_remaining < 1:
            deadline_multiplier = 4.0
        elif days_remaining < 3:
            deadline_multiplier = 2.5
        elif days_remaining < 7:
            deadline_multiplier = 1.5
        else:
            deadline_multiplier = 1.0

    children = db.query(models.Task).filter(models.Task.parent_id == task_id).all()
    for child in children:
        if child.due_date and child.status != "done":
            c_due = child.due_date
            if c_due.tzinfo is None:
                c_due = c_due.replace(tzinfo=timezone.utc)
            c_days = (c_due - now).total_seconds() / 86400

            c_mult = 1.0
            if c_days < 0: c_mult = 5.0
            elif c_days < 1: c_mult = 4.0
            elif c_days < 3: c_mult = 2.5
            elif c_days < 7: c_mult = 1.5

            if c_mult > deadline_multiplier:
                deadline_multiplier = c_mult

    base_score = config.urgency / config.effort

    research_bonus = 0.0
    if db_task.category and "pesquisa" in db_task.category.lower():
        up_at = db_task.updated_at or now
        if up_at.tzinfo is None:
            up_at = up_at.replace(tzinfo=timezone.utc)
        days_inactive = (now - up_at).total_seconds() / 86400
        if days_inactive > 0:
            research_bonus = min(10.0, days_inactive * 1.0)

    db_task.priority_score = round((base_score * deadline_multiplier) + research_bonus, 4)
    db_task.urgency = config.urgency
    db_task.effort = config.effort

    if db_task.status == "backlog":
        db_task.status = "todo"

    db.commit()
    db.refresh(db_task)
    return _safe_task_response(db_task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task não encontrada")
    db.delete(db_task)
    db.commit()
    return None


@router.delete("/maintenance/purge-done", status_code=status.HTTP_204_NO_CONTENT)
def purge_done_tasks(db: Session = Depends(get_db)):
    """Remove definitivamente todas as tasks com status 'done'."""
    done_tasks = db.query(models.Task).filter(models.Task.status == "done").all()
    for t in done_tasks:
        db.delete(t)
    db.commit()
    return None


@router.delete("/maintenance/factory-reset", status_code=status.HTTP_204_NO_CONTENT)
def factory_reset(db: Session = Depends(get_db)):
    """DANGER ZONE: Limpa todo o buffer de módulos (tasks)."""
    db.query(models.Task).delete()
    db.commit()
    return None
