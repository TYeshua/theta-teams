"""
routers/teams.py — Rotas de gestão de equipes (Teams).

Apenas Líderes podem acessar estas rotas.
O convite de colaboradores usa a Admin API do Supabase (Service Role).
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timezone

import models, schemas
from database import get_db
from auth import require_leader, invite_user_by_email, get_current_user
from schemas import UserProfile, RoleEnum

router = APIRouter(
    prefix="/teams",
    tags=["teams"],
    responses={403: {"description": "Acesso negado — apenas Líderes"}},
)


# ---------------------------------------------------------------------------
# POST /teams — Criar uma nova equipe
# ---------------------------------------------------------------------------
@router.post("", response_model=schemas.TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    data: schemas.TeamCreate,
    db: Session = Depends(get_db),
    current_user: UserProfile = Depends(require_leader),
):
    """
    Cria uma nova equipe com o usuário logado como Líder.

    Regras:
    - Apenas usuários com role=LIDER podem criar equipes.
    - O líder é automaticamente vinculado ao novo time (team_id no seu profile).
    - Um líder não pode criar mais de uma equipe (regra de negócio simples).
    """
    # Verifica se o líder já possui uma equipe
    equipe_existente = db.query(models.Team).filter(
        models.Team.leader_id == current_user.id
    ).first()

    if equipe_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Você já possui uma equipe ativa. Delete-a antes de criar outra.",
        )

    # Cria a nova equipe
    novo_id = str(uuid.uuid4())
    nova_equipe = models.Team(
        id=novo_id,
        name=data.name,
        leader_id=current_user.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(nova_equipe)

    # Atualiza o team_id do perfil do líder na tabela profiles
    db.execute(
        text("UPDATE profiles SET team_id = :team_id WHERE id = :user_id"),
        {"team_id": novo_id, "user_id": current_user.id},
    )

    db.commit()
    db.refresh(nova_equipe)

    return schemas.TeamResponse(
        id=nova_equipe.id,
        name=nova_equipe.name,
        leader_id=nova_equipe.leader_id,
        created_at=nova_equipe.created_at,
    )


# ---------------------------------------------------------------------------
# GET /teams/me — Retorna a equipe do usuário logado
# ---------------------------------------------------------------------------
@router.get("/me", response_model=schemas.TeamResponse)
async def get_my_team(
    db: Session = Depends(get_db),
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Retorna dados da equipe do usuário logado (Líder ou Colaborador).
    Útil para o frontend exibir o nome da equipe no header.
    """
    if not current_user.team_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Você ainda não pertence a nenhuma equipe.",
        )

    equipe = db.query(models.Team).filter(
        models.Team.id == current_user.team_id
    ).first()

    if not equipe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipe não encontrada no banco de dados.",
        )

    return schemas.TeamResponse(
        id=equipe.id,
        name=equipe.name,
        leader_id=equipe.leader_id,
        created_at=equipe.created_at,
    )


# ---------------------------------------------------------------------------
# GET /teams/members — Lista os colaboradores da equipe
# ---------------------------------------------------------------------------
@router.get("/members")
async def list_members(
    db: Session = Depends(get_db),
    current_user: UserProfile = Depends(require_leader),
):
    """
    Lista todos os perfis de colaboradores da equipe do Líder logado.
    Retorna id, email, full_name e role de cada membro.
    """
    if not current_user.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você ainda não possui uma equipe. Crie uma primeiro.",
        )

    membros = db.execute(
        text("""
            SELECT id, email, full_name, role, team_id, created_at
            FROM profiles
            WHERE team_id = :team_id
            ORDER BY created_at ASC
        """),
        {"team_id": current_user.team_id},
    ).fetchall()

    return [
        {
            "id": str(m.id),
            "email": m.email,
            "full_name": m.full_name,
            "role": m.role,
            "team_id": str(m.team_id) if m.team_id else None,
        }
        for m in membros
    ]


# ---------------------------------------------------------------------------
# POST /teams/members — Convidar colaborador por e-mail (Service Role)
# ---------------------------------------------------------------------------
@router.post("/members", status_code=status.HTTP_200_OK)
async def invite_member(
    data: schemas.MemberInvite,
    db: Session = Depends(get_db),
    current_user: UserProfile = Depends(require_leader),
):
    """
    Convida um colaborador por e-mail usando a Admin API do Supabase.

    Fluxo completo:
    1. Backend valida que o solicitante é LIDER e possui um team_id.
    2. Chama invite_user_by_email() que usa a SUPABASE_SERVICE_ROLE_KEY para
       disparar um e-mail de convite via Supabase Auth.
    3. Se o usuário já existe no Supabase, associa diretamente ao team_id.
    4. Quando o convidado aceitar o e-mail, o trigger on_auth_user_created
       cria o perfil como COLABORADOR. Após isso, o líder pode atualizar
       manualmente o team_id pelo painel (ou via rota PATCH futura).
    """
    if not current_user.team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Crie uma equipe antes de convidar membros.",
        )

    # Verifica se o e-mail já é membro da equipe
    membro_existente = db.execute(
        text("SELECT id FROM profiles WHERE email = :email AND team_id = :team_id"),
        {"email": data.email, "team_id": current_user.team_id},
    ).fetchone()

    if membro_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{data.email} já é membro desta equipe.",
        )

    # Verifica se o usuário já existe no Supabase (conta criada anteriormente)
    perfil_existente = db.execute(
        text("SELECT id, team_id FROM profiles WHERE email = :email"),
        {"email": data.email},
    ).fetchone()

    if perfil_existente:
        # Usuário já tem conta: apenas associa ao team_id sem enviar e-mail
        db.execute(
            text("UPDATE profiles SET team_id = :team_id WHERE id = :user_id"),
            {"team_id": current_user.team_id, "user_id": str(perfil_existente.id)},
        )
        db.commit()
        return {
            "message": f"{data.email} foi adicionado à equipe com sucesso.",
            "invited": False,
            "associated": True,
        }

    # Usuário novo: dispara convite por e-mail via Supabase Admin API
    await invite_user_by_email(email=data.email, team_id=current_user.team_id)

    # Nota: O team_id do novo usuário será associado após ele aceitar o convite.
    # O líder pode acompanhar via GET /teams/members.

    return {
        "message": f"Convite enviado para {data.email}. Aguardando aceitação.",
        "invited": True,
        "associated": False,
    }


# ---------------------------------------------------------------------------
# PATCH /teams/members/{user_id}/role — Alterar cargo de um membro
# ---------------------------------------------------------------------------
@router.patch("/members/{user_id}/role")
async def update_member_role(
    user_id: str,
    data: schemas.UserProfile,
    db: Session = Depends(get_db),
    current_user: UserProfile = Depends(require_leader),
):
    """
    Permite ao Líder promover um Colaborador a Líder ou rebaixar.
    Útil para transferir liderança ou criar múltiplos líderes.
    """
    # Verifica se o membro pertence à equipe do líder
    membro = db.execute(
        text("SELECT id, role FROM profiles WHERE id = :uid AND team_id = :tid"),
        {"uid": user_id, "tid": current_user.team_id},
    ).fetchone()

    if not membro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membro não encontrado na sua equipe.",
        )

    db.execute(
        text("UPDATE profiles SET role = :role WHERE id = :uid"),
        {"role": data.role.value, "uid": user_id},
    )
    db.commit()

    return {"message": f"Cargo de {user_id} atualizado para {data.role.value}."}
