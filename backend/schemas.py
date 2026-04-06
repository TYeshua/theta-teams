from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum

# =============================================================================
# ENUMS
# =============================================================================

class RoleEnum(str, Enum):
    """Cargos possíveis dentro de uma equipe THETA Teams."""
    LIDER = "LIDER"
    COLABORADOR = "COLABORADOR"


# =============================================================================
# SCHEMAS DE EQUIPE (Teams)
# =============================================================================

class TeamCreate(BaseModel):
    """Payload que o Líder envia para criar uma nova equipe."""
    name: str = Field(..., min_length=2, max_length=100, description="Nome da equipe")


class TeamResponse(BaseModel):
    """Dados de retorno de uma equipe."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    leader_id: str
    created_at: Optional[datetime] = None


# =============================================================================
# SCHEMA DE CONVITE DE MEMBRO
# =============================================================================

class MemberInvite(BaseModel):
    """Payload para o Líder convidar um colaborador por e-mail."""
    email: str = Field(..., description="E-mail do colaborador a ser convidado")


# =============================================================================
# SCHEMAS DE PERFIL DE USUÁRIO
# =============================================================================

class UserProfile(BaseModel):
    """
    Perfil do usuário autenticado, extraído do JWT + tabela profiles.
    Trafega entre as dependências de segurança do FastAPI.
    """
    model_config = ConfigDict(from_attributes=True)

    id: str                                  # UUID do auth.users
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: RoleEnum = RoleEnum.COLABORADOR    # cargo padrão seguro
    team_id: Optional[str] = None           # None = sem equipe ou Workspace Pessoal


class SessionResponse(BaseModel):
    """
    O que o frontend recebe após o login bem-sucedido.
    Agrupa token + perfil em uma única resposta.
    """
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


# =============================================================================
# SCHEMAS DE TASK (Atualizados para Multi-Tenant)
# =============================================================================

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "Geral"
    due_date: Optional[datetime] = None
    status: str = "backlog"
    parent_id: Optional[int] = None
    is_fixed_schedule: bool = False
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None


class TaskCreate(TaskBase):
    """
    Payload para criar uma nova task (apenas Líder).

    - assigned_to: UUID do colaborador responsável.
      Se None, a task fica no Workspace Pessoal do criador.
    - team_id: UUID da equipe dona da task.
      Se None, a task é tratada como Workspace Pessoal.
    """
    urgency: Optional[int] = None
    effort: Optional[int] = None
    assigned_to: Optional[str] = None    # UUID do colaborador
    team_id: Optional[str] = None        # UUID da equipe


class TaskUpdate(BaseModel):
    """
    Para o Líder: pode atualizar qualquer campo.
    Para o Colaborador: o backend ignora todos os campos exceto `status`.
    """
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    parent_id: Optional[int] = None


class TaskCalibrate(BaseModel):
    """Payload do Daily Shutdown / Triagem de prioridade."""
    urgency: int = Field(..., ge=1, le=5, description="Urgência de 1 a 5")
    effort: int = Field(..., description="Esforço (ideal em Fibonacci: 1, 2, 3, 5, 8)")


class TaskResponse(TaskBase):
    """Como o Backend devolve a task formatada para o React."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    urgency: Optional[int] = None
    effort: Optional[int] = None
    priority_score: float = 0.0          # Tolerante a NULL — nunca quebra serialização
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Campos B2B (podem ser None para tasks do Workspace Pessoal legado)
    team_id: Optional[str] = None
    assigned_to: Optional[str] = None
    created_by: Optional[str] = None