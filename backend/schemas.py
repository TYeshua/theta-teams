from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

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

# O que o Frontend envia no "Quick Add"
class TaskCreate(TaskBase):
    pass

# O que o Frontend envia para atualizar os dados gerais
class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    parent_id: Optional[int] = None

# O que o Frontend envia no "Daily Shutdown" ou Triagem
class TaskCalibrate(BaseModel):
    urgency: int = Field(..., ge=1, le=5, description="Urgência de 1 a 5")
    effort: int = Field(..., description="Esforço (ideal em Fibonacci: 1, 2, 3, 5, 8)")

# Como o Backend devolve a tarefa formatada para o React
class TaskResponse(TaskBase):
    id: int
    urgency: Optional[int] = None
    effort: Optional[int] = None
    priority_score: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True # Permite ler dados do SQLAlchemy