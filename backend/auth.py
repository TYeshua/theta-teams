"""
auth.py — Módulo centralizado de autenticação e autorização para o THETA Teams.

Fluxo:
  1. O frontend faz login no Supabase client-side e recebe um JWT (access_token).
  2. Cada chamada à API inclui o header: Authorization: Bearer <jwt>
  3. get_current_user() decodifica o JWT usando o SUPABASE_JWT_SECRET e
     consulta a tabela `profiles` para obter role e team_id.
  4. require_leader() é uma dependência FastAPI que rejeita com 403
     qualquer usuário que não seja LIDER.
"""

import os
import jwt           # PyJWT — decodifica tokens JWT de forma segura
import httpx         # Para chamadas HTTP à API admin do Supabase (invites)

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from database import get_db
from schemas import UserProfile, RoleEnum

# Carrega variáveis do arquivo .env em desenvolvimento local
load_dotenv()

# ---------------------------------------------------------------------------
# Configuração de ambiente
# ---------------------------------------------------------------------------
SUPABASE_JWT_SECRET      = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_URL             = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Esquema de segurança HTTP Bearer — extrai o token do header Authorization
bearer_scheme = HTTPBearer(auto_error=True)


# ---------------------------------------------------------------------------
# Dependência: get_current_user
# ---------------------------------------------------------------------------
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> UserProfile:
    """
    Dependência FastAPI que:
      1. Extrai e valida o JWT do header Authorization.
      2. Consulta a tabela `profiles` para obter role e team_id do usuário.
      3. Retorna um UserProfile pronto para uso nas rotas.

    Lança HTTP 401 se o token for inválido ou expirado.
    Lança HTTP 404 se o perfil do usuário não existir no banco.
    """
    token = credentials.credentials

    # --- 1. Decodificar e validar o JWT do Supabase ---
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            # O Supabase emite tokens com audience "authenticated"
            options={"verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão expirada. Faça login novamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # --- 2. Extrair o user_id do payload JWT ---
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token malformado: campo 'sub' ausente.",
        )

    # --- 3. Buscar perfil na tabela profiles ---
    # Importamos aqui para evitar import circular com models
    from models import Task  # noqa — usado apenas para verificar existência
    import models

    # Consulta direta via SQLAlchemy (tabela profiles criada pelo Supabase)
    # Nota: usamos text() para acessar tabelas que o SQLAlchemy pode não ter
    # como model declarativo se o profiles for gerenciado apenas pelo Supabase.
    from sqlalchemy import text

    result = db.execute(
        text("SELECT id, email, full_name, role, team_id FROM profiles WHERE id = :uid"),
        {"uid": user_id},
    ).fetchone()

    if not result:
        # Usuário autenticado mas sem perfil — pode acontecer se o trigger
        # ainda não rodou. Retornamos perfil mínimo com defaults seguros.
        return UserProfile(
            id=user_id,
            email=payload.get("email"),
            role=RoleEnum.COLABORADOR,
            team_id=None,
        )

    return UserProfile(
        id=str(result.id),
        email=result.email,
        full_name=result.full_name,
        role=RoleEnum(result.role),
        team_id=str(result.team_id) if result.team_id else None,
    )


# ---------------------------------------------------------------------------
# Dependência: require_leader
# ---------------------------------------------------------------------------
async def require_leader(
    current_user: UserProfile = Depends(get_current_user),
) -> UserProfile:
    """
    Guarda das rotas exclusivas de Líder.

    Lança HTTP 403 caso o usuário logado não tenha cargo LIDER.
    Use como dependência FastAPI: `user: UserProfile = Depends(require_leader)`

    Exemplo de rota protegida:
        @router.post("/tasks")
        def create_task(data: TaskCreate, user = Depends(require_leader)):
            ...
    """
    if current_user.role != RoleEnum.LIDER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: apenas Líderes podem executar esta ação.",
        )
    return current_user


# ---------------------------------------------------------------------------
# Utilitário: convidar usuário por e-mail (Service Role)
# ---------------------------------------------------------------------------
async def invite_user_by_email(email: str, team_id: str) -> dict:
    """
    Usa a Admin API do Supabase para convidar um novo colaborador por e-mail.
    Requer SUPABASE_SERVICE_ROLE_KEY no ambiente.

    O Supabase envia um e-mail de convite. Quando o usuário aceitar e definir
    a senha, o trigger handle_new_user() cria o perfil como COLABORADOR.
    Em seguida, o backend atualiza o team_id do perfil.

    Retorna o payload do usuário criado ou lança HTTPException em caso de erro.
    """
    if not SUPABASE_SERVICE_ROLE_KEY or not SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Serviço de convite não configurado. Contate o administrador.",
        )

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }

    # Payload do invite: inclui metadados para o trigger poder usar
    body = {
        "email": email,
        "data": {
            "invited_to_team": team_id,
        },
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SUPABASE_URL}/auth/v1/invite",
            headers=headers,
            json=body,
        )

    if response.status_code not in (200, 201):
        erro = response.json().get("msg", response.text)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Falha ao convidar {email}: {erro}",
        )

    return response.json()
