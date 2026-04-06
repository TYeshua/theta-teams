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
    is_fixed_schedule = Column(Boolean, default=False) # Para aulas fixas
    start_time = Column(DateTime, nullable=True) 
    end_time = Column(DateTime, nullable=True)
    
    # Frequência de Pesquisa
    last_activity_at = Column(DateTime, default=datetime.utcnow)
    
    # Categorização para suportar: Graduação 1, Graduação 2, Pesquisa, etc.
    category = Column(String, index=True, nullable=False, default="Geral")
    
    # Prazos rigorosos
    due_date = Column(DateTime, nullable=True, index=True)
    
    # 1 a 5
    urgency = Column(Integer, nullable=True) 
    # Fibonacci: 1, 2, 3, 5, 8
    effort = Column(Integer, nullable=True)  
    
    # O cálculo matemático de prioridade que faremos: (Urgência / Esforço)
    priority_score = Column(Float, default=0.0)
    
    # Status: 'backlog', 'todo', 'wip', 'done'
    status = Column(String, default="backlog", index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id"))
    category = Column(String, index=True, nullable=False)
    xp_gained = Column(Float, nullable=False, default=0.0)
    completed_at = Column(DateTime, default=datetime.utcnow)
    