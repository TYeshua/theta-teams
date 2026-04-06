from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import tasks, stats, teams
import models

# Garante que as tabelas existam no banco
# Nota: Em produção, as tabelas `profiles` e `teams` são gerenciadas pelo Supabase.
# O SQLAlchemy cria apenas as que ele conhece (Task, ExecutionLog, Team).
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="THETA Teams API",
    description=(
        "API B2B para gestão de demandas em equipes de tecnologia. "
        "Autenticação via Supabase JWT — inclua o header 'Authorization: Bearer <token>'."
    ),
    version="2.0.0",
    # CRÍTICO: sem isso, FastAPI emite 307 redirect /tasks → /tasks/
    # O browser segue o redirect DIRETAMENTE para o Render, bypassando o proxy
    # da Vercel, causando ERR_CONNECTION_CLOSED no cold-start do free tier.
    redirect_slashes=False,
)

# ---------------------------------------------------------------------------
# CORS — permite que o frontend (Vercel), dev local e mobile consumam a API.
# TODO: Após testes, substitua ["*"] pela lista de origens explícitas:
#       ["https://SEU-DOMINIO.vercel.app", "http://localhost:5173"]
#       E reative allow_credentials=True (incompatível com wildcard).
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # ← Temporário. Restrinja antes de ir para produção.
    allow_credentials=False,  # DEVE ser False quando allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers — Domínios do sistema
# ---------------------------------------------------------------------------
app.include_router(tasks.router)
app.include_router(stats.router)
app.include_router(teams.router)   # ← Novo router de equipes (B2B)

@app.get("/")
def read_root():
    return {
        "message": "Bem-vindo à THETA Teams API v2.0",
        "docs": "/docs",
        "health": "ok",
    }

@app.get("/health")
def health_check():
    """Endpoint de health-check para o Render não hiberar o serviço."""
    return {"status": "ok"}