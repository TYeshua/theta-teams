import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. O Python tenta puxar a URL lá do painel secreto do Render. 
# Se não achar (porque você está rodando no seu notebook), ele cria um SQLite local.
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./neuro_dashboard_local.db"
)

# 2. Configura o motor do banco de acordo com o que ele achou
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # Configuração exclusiva para rodar local no seu PC
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # Configuração de alta performance para o Supabase na Nuvem
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependência para injeção de sessão nas rotas
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()