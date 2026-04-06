from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Boolean
from database import Base
from datetime import datetime

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    
    # Hierarquia de Subdemandas
    parent_id = Column(Integer, ForeignKey("tasks.id"), nullable=True, index=True)

    # Gestão de tempo
    is_fixed_schedule = Column(Boolean, default=False)
    start_time = Column(DateTime, nullable=True) 
    end_time = Column(DateTime, nullable=True)
    
    # Frequência de Pesquisa
    last_activity_at = Column(DateTime, default=datetime.utcnow)
    
    # Categorização
    category = Column(String, index=True, nullable=False, default="Geral")
    
    # Prazos rigorosos
    due_date = Column(DateTime, nullable=True, index=True)
    
    # Escala 1 a 5
    urgency = Column(Integer, nullable=True)
    # Fibonacci: 1, 2, 3, 5, 8
    effort = Column(Integer, nullable=True)
    
    # Cálculo de prioridade: (Urgência / Esforço) × multiplicador_prazo
    priority_score = Column(Float, default=0.0)
    
    # Status: 'backlog', 'todo', 'in_progress', 'done'
    status = Column(String, default="backlog", index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # -------------------------------------------------------------------------
    # CAMPOS B2B (Multi-Tenant THETA Teams)
    # Todos nullable para compatibilidade com dados legados do Workspace Pessoal.
    # team_id = NULL significa que a task pertence ao Workspace Pessoal de created_by.
    # -------------------------------------------------------------------------
    
    # UUID da equipe dona da task (NULL = Workspace Pessoal)
    team_id = Column(String, ForeignKey("teams.id"), nullable=True, index=True)
    
    # UUID do collaborador responsável pela execução
    assigned_to = Column(String, nullable=True, index=True)
    
    # UUID do líder que criou a task
    created_by = Column(String, nullable=True, index=True)


class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    category = Column(String, index=True, nullable=False)
    xp_gained = Column(Float, nullable=False, default=0.0)
    completed_at = Column(DateTime, default=datetime.utcnow)


class Team(Base):
    """Modelo de equipe — criado pelo Líder, agrega colaboradores e tasks."""
    __tablename__ = "teams"

    # UUID gerado pelo Supabase / banco
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    
    # UUID do usuário líder (auth.users)
    leader_id = Column(String, nullable=False, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)