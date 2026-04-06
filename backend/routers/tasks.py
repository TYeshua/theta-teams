"""
routers/tasks.py — Rotas de Tasks com RBAC completo para o THETA Teams.

Regras de acesso:
  - GET  /tasks       → Líder: todas as tasks do team. Colaborador: apenas as suas.
  - POST /tasks       → Apenas Líder (require_leader).
  - PUT  /tasks/{id}  → Líder: todos os campos. Colaborador: apenas `status`.
  - DELETE /tasks/{id} → Apenas Líder.
  - Rotas de manutenção → Apenas Líder.
  - Workspace Pessoal → tasks com team_id=NULL visíveis apenas ao created_by.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

import models, schemas
from database import get_db
from auth import get_current_user, require_leader
from schemas import UserProfile, RoleEnum

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"],
    responses={404: {"description": "Not found"}},
)


# ---------------------------------------------------------------------------
# Motor de Prioridade Dinâmico (inalterado do B2C)
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
# Helper: serialização defensiva ORM → TaskResponse
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
        # Campos B2B
        team_id=task.team_id,
        assigned_to=task.assigned_to,
        created_by=task.created_by,
    )


# ---------------------------------------------------------------------------
# POST /tasks — Criar task (apenas Líder)
# ---------------------------------------------------------------------------
@router.post("", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=schemas.TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: UserProfile = Depends(require_leader),
):
    """
    Cria uma nova task. Restrito a Líderes.

    - Se `team_id` for None, a task será salva no Workspace Pessoal do líder.
    - `assigned_to` define o colaborador responsável (obrigatório para tasks de equipe).
    - `created_by` é preenchido automaticamente com o user_id do líder logado.
    """
    now = datetime.now(timezone.utc)

    urgency: Optional[int] = task.urgency
    effort: Optional[int] = task.effort

    priority_score = 0.0
    new_status = task.status or "backlog"

    # Calcula prioridade se urgência e esforço forem informados
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
        # Campos B2B — preenchidos automaticamente
        team_id=task.team_id or current_user.team_id,
        assigned_to=task.assigned_to,
        created_by=current_user.id,
    )

    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return _safe_task_response(db_task)


# ---------------------------------------------------------------------------
# GET /tasks/capacity — Neural Bandwidth (sem auth para manter compatibilidade)
# ---------------------------------------------------------------------------
@router.get("/capacity")
@router.get("/capacity/")
def get_capacity(db: Session = Depends(get_db)):
    """Telemetria de capacidade cognitiva ativa."""
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


# ---------------------------------------------------------------------------
# GET /tasks — Listar tasks (filtrado por role e team_id)
# ---------------------------------------------------------------------------
@router.get("", response_model=List[schemas.TaskResponse])
@router.get("/", response_model=List[schemas.TaskResponse])
def get_tasks(
    skip: int = 0,
    limit: int = 100,
    current_context: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Retorna tasks de acordo com o cargo do usuário:

    LIDER:
      - Vê todas as tasks do seu team_id.
      - Vê tasks do Workspace Pessoal (team_id = NULL e created_by = seu id).

    COLABORADOR:
      - Vê apenas tasks do seu team_id onde assigned_to = seu user_id.
    """
    import traceback
    try:
        query = db.query(models.Task)

        if current_user.role == RoleEnum.LIDER:
            # Líder: tasks do time + Workspace Pessoal
            query = query.filter(
                (
                    (models.Task.team_id == current_user.team_id) |
                    (
                        (models.Task.team_id == None) &
                        (models.Task.created_by == current_user.id)
                    )
                )
            )
        else:
            # Colaborador: apenas tasks atribuídas a ele na equipe
            query = query.filter(
                models.Task.team_id == current_user.team_id,
                models.Task.assigned_to == current_user.id,
            )

        tasks = query.all()

        # Aplica o motor de pontuação dinâmica
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


# ---------------------------------------------------------------------------
# GET /tasks/{task_id} — Buscar task por ID
# ---------------------------------------------------------------------------
@router.get("/{task_id}", response_model=schemas.TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: UserProfile = Depends(get_current_user),
):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task não encontrada")

    # Valida que o usuário tem permissão para ver esta task
    _check_task_access(db_task, current_user)

    return _safe_task_response(db_task)


# ---------------------------------------------------------------------------
# PUT /tasks/{task_id} — Atualizar task
# ---------------------------------------------------------------------------
@router.put("/{task_id}", response_model=schemas.TaskResponse)
def update_task(
    task_id: int,
    task_update: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Atualiza uma task existente com regras de RBAC:

    LIDER: pode alterar qualquer campo (título, descrição, prazo, status, etc.)
    COLABORADOR: pode alterar APENAS o campo `status` de tasks atribuídas a ele.
                 Qualquer outro campo enviado será ignorado silenciosamente.
    """
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task não encontrada")

    _check_task_access(db_task, current_user)

    old_status = db_task.status
    update_data = task_update.model_dump(exclude_unset=True)

    if current_user.role == RoleEnum.COLABORADOR:
        # Colaborador: ignora tudo exceto `status`
        update_data = {k: v for k, v in update_data.items() if k == "status"}

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Colaboradores só podem alterar o status da demanda.",
            )

    for key, value in update_data.items():
        setattr(db_task, key, value)

    # Motor de XP: registra log ao completar uma task
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


# ---------------------------------------------------------------------------
# PUT /tasks/{task_id}/calibrate — Calibrar prioridade (apenas Líder)
# ---------------------------------------------------------------------------
@router.put("/{task_id}/calibrate", response_model=schemas.TaskResponse)
def calibrate_task(
    task_id: int,
    config: schemas.TaskCalibrate,
    db: Session = Depends(get_db),
    current_user: UserProfile = Depends(require_leader),
):
    """
    Motor de Prioridade Implacável.

    Fórmula base:   score = urgency / effort
    Multiplicadores de prazo:
      • Prazo atrasado:    x 5.0
      • < 1 dia:           x 4.0
      • 1–3 dias:          x 2.5
      • 3–7 dias:          x 1.5
      • 7+ dias ou sem:    x 1.0
    """
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task não encontrada")

    _check_task_access(db_task, current_user)

    if config.effort <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O esforço (effort) precisa ser maior que zero.",
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

    # Considera o prazo do filho mais urgente
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


# ---------------------------------------------------------------------------
# DELETE /tasks/{task_id} — Deletar task (apenas Líder)
# ---------------------------------------------------------------------------
@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: UserProfile = Depends(require_leader),
):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task não encontrada")
    db.delete(db_task)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# DELETE /tasks/maintenance/purge-done — Limpar tasks concluídas (Líder)
# ---------------------------------------------------------------------------
@router.delete("/maintenance/purge-done", status_code=status.HTTP_204_NO_CONTENT)
def purge_done_tasks(
    db: Session = Depends(get_db),
    current_user: UserProfile = Depends(require_leader),
):
    """Remove definitivamente todas as tasks com status 'done' da equipe."""
    query = db.query(models.Task).filter(models.Task.status == "done")

    if current_user.team_id:
        query = query.filter(models.Task.team_id == current_user.team_id)

    for t in query.all():
        db.delete(t)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# DELETE /tasks/maintenance/factory-reset — Reset total (Líder)
# ---------------------------------------------------------------------------
@router.delete("/maintenance/factory-reset", status_code=status.HTTP_204_NO_CONTENT)
def factory_reset(
    db: Session = Depends(get_db),
    current_user: UserProfile = Depends(require_leader),
):
    """DANGER ZONE: Limpa todas as tasks da equipe do Líder logado."""
    if current_user.team_id:
        db.query(models.Task).filter(
            models.Task.team_id == current_user.team_id
        ).delete()
    else:
        # Workspace Pessoal
        db.query(models.Task).filter(
            models.Task.created_by == current_user.id,
            models.Task.team_id == None,
        ).delete()
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Helper interno: verifica se o usuário tem acesso à task
# ---------------------------------------------------------------------------
def _check_task_access(task: models.Task, user: UserProfile) -> None:
    """
    Valida acesso à task baseado no cargo do usuário.
    Lança HTTP 403 se o acesso for negado.

    Regras:
    - Workspace Pessoal (team_id = None): apenas o created_by pode ver.
    - Líder: vê todas as tasks do seu team_id.
    - Colaborador: vê apenas tasks atribuídas a ele.
    """
    # Workspace Pessoal
    if task.team_id is None:
        if task.created_by != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: esta task pertence ao Workspace Pessoal de outro usuário.",
            )
        return

    # Verifica que a task pertence ao time do usuário
    if task.team_id != user.team_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: esta task não pertence à sua equipe.",
        )

    # Colaborador só vê tasks atribuídas a ele
    if user.role == RoleEnum.COLABORADOR and task.assigned_to != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: esta demanda não está atribuída a você.",
        )
