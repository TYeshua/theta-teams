from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Substitua 'seu_usuario' e 'sua_senha' pelas credenciais do seu PostgreSQL local
SQLALCHEMY_DATABASE_URL = "sqlite:///./neuro_dashboard.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependência para injeção de sessão nas rotas
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()