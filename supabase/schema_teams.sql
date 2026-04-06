-- =============================================================================
-- THETA Teams — Script de Migração para B2B SaaS
-- Arquivo: supabase/schema_teams.sql
--
-- INSTRUÇÕES: Execute este script inteiro no painel do Supabase (SQL Editor).
-- A ordem das seções importa — não reordene.
-- =============================================================================


-- =============================================================================
-- SEÇÃO 1: HABILITAÇÃO DE EXTENSÃO UUID
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- SEÇÃO 2: ENUM DE CARGOS — Define os papéis possíveis dentro de uma equipe
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('LIDER', 'COLABORADOR');
  END IF;
END$$;


-- =============================================================================
-- SEÇÃO 3: TABELA teams
-- Cada equipe tem um dono (leader_id) que referencia auth.users.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  leader_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.teams IS 'Equipes do THETA Teams. Cada equipe possui um líder único.';
COMMENT ON COLUMN public.teams.leader_id IS 'UUID do usuário que criou e é dono da equipe.';


-- =============================================================================
-- SEÇÃO 4: TABELA profiles
-- Espelha auth.users com metadados extras: role e team_id.
-- Um trigger preenche automaticamente ao criar conta.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  email      TEXT,
  role       user_role NOT NULL DEFAULT 'COLABORADOR',
  team_id    UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Perfil de cada usuário autenticado. Sincronizado via trigger com auth.users.';
COMMENT ON COLUMN public.profiles.role IS 'Cargo do usuário: LIDER ou COLABORADOR.';
COMMENT ON COLUMN public.profiles.team_id IS 'Equipe à qual o colaborador pertence. NULL = usuário ainda não associado.';


-- =============================================================================
-- SEÇÃO 5: MIGRAÇÃO DA TABELA tasks (Workspace Pessoal)
-- Dados legados onde team_id = NULL são tratados como "Workspace Pessoal"
-- do created_by. O backend garante que esses registros só sejam visíveis
-- para o próprio dono.
-- =============================================================================

-- Adiciona coluna team_id (nullable) — tasks legadas terão NULL (Workspace Pessoal)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS team_id    UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tasks.team_id IS 'Equipe dona da task. NULL = pertence ao Workspace Pessoal de created_by.';
COMMENT ON COLUMN public.tasks.assigned_to IS 'UUID do colaborador responsável pela task.';
COMMENT ON COLUMN public.tasks.created_by IS 'UUID do líder que criou a task.';


-- =============================================================================
-- SEÇÃO 6: TRIGGER — Cria profile automaticamente ao registrar usuário
-- =============================================================================

-- Função que popula public.profiles após inserção em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'COLABORADOR'  -- padrão seguro: começa sem privilégios
  )
  ON CONFLICT (id) DO NOTHING; -- idempotente: não duplica se já existir
  RETURN NEW;
END;
$$;

-- Remove trigger antigo se existir e recria
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- SEÇÃO 7: TRIGGER — Atualiza updated_at do profiles automaticamente
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();


-- =============================================================================
-- SEÇÃO 8: ROW LEVEL SECURITY (RLS)
-- Ativa RLS em todas as tabelas sensíveis e define as políticas de acesso.
-- A regra central: cada usuário só enxerga dados do seu próprio team_id.
-- =============================================================================

-- --- Habilita RLS ---
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks    ENABLE ROW LEVEL SECURITY;


-- ===========================
-- Políticas para: profiles
-- ===========================

-- Usuário lê apenas seu próprio perfil
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Usuário atualiza apenas seu próprio perfil (não pode mudar própria role)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Service Role (backend admin) pode inserir perfis (para invites)
CREATE POLICY "profiles_insert_service" ON public.profiles
  FOR INSERT WITH CHECK (true); -- controlado pela SECURITY DEFINER do trigger


-- ===========================
-- Políticas para: teams
-- ===========================

-- Membro da equipe vê a equipe onde está
CREATE POLICY "teams_select_member" ON public.teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM public.profiles WHERE id = auth.uid()
    )
    OR leader_id = auth.uid()
  );

-- Apenas o líder pode criar equipes (validação extra feita no backend)
CREATE POLICY "teams_insert_leader" ON public.teams
  FOR INSERT WITH CHECK (leader_id = auth.uid());

-- Apenas o líder pode atualizar sua equipe
CREATE POLICY "teams_update_leader" ON public.teams
  FOR UPDATE USING (leader_id = auth.uid());

-- Apenas o líder pode deletar a equipe
CREATE POLICY "teams_delete_leader" ON public.teams
  FOR DELETE USING (leader_id = auth.uid());


-- ===========================
-- Políticas para: tasks
-- ===========================

-- SELECIONAR:
--   • Colaborador: vê apenas tasks atribuídas a ele (assigned_to)
--   • Líder: vê todas as tasks do seu team_id
--   • Workspace Pessoal: tasks legadas (team_id = NULL) só para o created_by
CREATE POLICY "tasks_select_rbac" ON public.tasks
  FOR SELECT USING (
    -- Workspace Pessoal (legado B2C): task sem time, visível apenas ao criador
    (team_id IS NULL AND created_by = auth.uid())
    OR
    -- Colaborador: vê tasks do seu time atribuídas a ele
    (
      team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
      AND assigned_to = auth.uid()
    )
    OR
    -- Líder: vê todas as tasks da equipe que ele lidera
    (
      team_id IN (SELECT id FROM public.teams WHERE leader_id = auth.uid())
    )
  );

-- INSERIR: Líder insere tasks com team_id obrigatório (backend valida cargo)
CREATE POLICY "tasks_insert_leader" ON public.tasks
  FOR INSERT WITH CHECK (
    -- Workspace Pessoal (sem team_id) ou líder da equipe
    (team_id IS NULL AND created_by = auth.uid())
    OR
    team_id IN (SELECT id FROM public.teams WHERE leader_id = auth.uid())
  );

-- ATUALIZAR:
--   • Colaborador: pode atualizar apenas o `status` de tasks atribuídas a ele
--   • Líder: pode atualizar qualquer campo das tasks do seu time
CREATE POLICY "tasks_update_rbac" ON public.tasks
  FOR UPDATE USING (
    -- Líder atualiza qualquer task do seu time
    team_id IN (SELECT id FROM public.teams WHERE leader_id = auth.uid())
    OR
    -- Colaborador atualiza apenas tasks atribuídas a ele
    (assigned_to = auth.uid())
    OR
    -- Workspace Pessoal
    (team_id IS NULL AND created_by = auth.uid())
  );

-- DELETAR: Somente o líder pode excluir tasks
CREATE POLICY "tasks_delete_leader" ON public.tasks
  FOR DELETE USING (
    team_id IN (SELECT id FROM public.teams WHERE leader_id = auth.uid())
    OR (team_id IS NULL AND created_by = auth.uid())
  );


-- =============================================================================
-- SEÇÃO 9: ÍNDICES DE PERFORMANCE
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_tasks_team_id     ON public.tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by  ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id  ON public.profiles(team_id);


-- =============================================================================
-- FIM DO SCRIPT
-- Próximo passo: Configure as variáveis de ambiente no backend:
--   SUPABASE_URL=https://<seu-projeto>.supabase.co
--   SUPABASE_JWT_SECRET=<chave em Project Settings > API > JWT Secret>
--   SUPABASE_SERVICE_ROLE_KEY=<chave em Project Settings > API>
-- =============================================================================
