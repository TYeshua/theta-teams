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
    version="1.0.0",
    # CRÍTICO: sem isso, FastAPI emite 307 redirect de /tasks → /tasks/
    # O browser segue o redirect DIRETAMENTE para o Render, bypassando o proxy
    # da Vercel, causando ERR_CONNECTION_CLOSED no cold-start do free tier.
    redirect_slashes=False,
)

# ---------------------------------------------------------------------------
# CORS — permite que o frontend (Vercel), dev local e mobile consumam a API.
# TODO: Após confirmar que o bug foi resolvido, substitua ["*"] pela lista de
#       origens explícitas: ["https://SEU-DOMINIO.vercel.app", "http://localhost:5173"]
#       E reative allow_credentials=True (incompatível com wildcard).
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # ← wildcard temporário para diagnóstico
    allow_credentials=False,  # DEVE ser False quando allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclui as rotas do domínio `tasks` e `stats`
app.include_router(tasks.router)
app.include_router(stats.router)

@app.get("/")
def read_root():
    return {"message": "Bem-vindo à API do THETA!"}