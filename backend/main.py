from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import tasks, stats
import models

# Garante que as tabelas existam
# Nota: Em produção, o ideal é usar Alembic para gerenciar as migrações!
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="THETA API",
    description="API for managing complex responsibilities, tasks, research, and deadlines",
    version="1.0.0"
)

# ---------------------------------------------------------------------------
# CORS — permite que o frontend web (Vite) E o app mobile (Expo) consumam a API.
# "*" é temporário para dev. Em produção, liste as origens explícitas.
# ATENÇÃO: allow_credentials deve ser False quando allow_origins=["*"]
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclui as rotas do domínio `tasks` e `stats`
app.include_router(tasks.router)
app.include_router(stats.router)

@app.get("/")
def read_root():
    return {"message": "Bem-vindo à API do THETA!"}