-- CPN Controle — schema do Supabase (etapa 4)
--
-- Como aplicar: Supabase → SQL Editor → cole este arquivo inteiro → Run.
-- Depois preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.
--
-- Decisões que o schema reforça:
--  * categoria (cor da linha) e status (momento do fluxo) são campos distintos;
--    cesárea é DESFECHO, não status.
--  * nada é excluído: alta e transferência apenas marcam `arquivada`.
--  * auditoria é somente-inserção: nem update nem delete, para ninguém.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- usuários
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  nome text not null,
  funcao text not null default 'outra',
  funcao_livre text,
  registro_profissional text,
  email text,
  admin boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- categorias
create table if not exists categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null,
  ordem int not null default 0,
  padrao boolean not null default false,
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------- leitos
create table if not exists leitos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  tipo text not null default 'fixo' check (tipo in ('fixo', 'extra', 'personalizado')),
  status text not null default 'livre'
    check (status in ('livre', 'ocupado', 'limpeza', 'bloqueado')),
  observacao text,
  ativo boolean not null default true,
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------- pacientes
create table if not exists pacientes (
  id uuid primary key default gen_random_uuid(),
  leito_id uuid references leitos (id) on delete set null,
  nome text not null,
  data_nascimento date,
  idade int,
  categoria_id uuid not null references categorias (id),
  status text not null default 'internada'
    check (status in ('internada', 'trabalho_de_parto', 'centro_cirurgico',
                      'puerpera', 'alta', 'transferida')),
  -- desfecho: tipo, horário, indicação, destino e dados do RN
  desfecho jsonb,
  paridade_g int,
  paridade_p int,
  paridade_a int,
  dum date,
  ig_admissao_semanas int,
  ig_admissao_dias int,
  ig_data_referencia date,
  comorbidades text[] not null default '{}',
  dinamica_uterina text check (dinamica_uterina in ('ausente', 'esparsa', 'presente')),
  intervalo_controle_min int not null default 240,
  observacoes text,
  arquivada boolean not null default false,
  arquivada_em timestamptz,
  motivo_arquivamento text,
  transferida_para text,
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pacientes_ativas_idx on pacientes (arquivada, leito_id);

-- -------------------------------------------------------------- controles
create table if not exists controles (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  horario timestamptz not null default now(),
  -- responsável = quem fez; lancado_por = a conta que registrou.
  -- As duas informações ficam guardadas quando diferem.
  responsavel_id uuid references usuarios (id),
  responsavel_nome text not null,
  lancado_por_id uuid references usuarios (id),
  lancado_por_nome text,
  pa_sistolica int,
  pa_diastolica int,
  fc int,
  fr int,
  temperatura numeric(3, 1),
  spo2 int,
  bcf int,
  dinamica_uterina text check (dinamica_uterina in ('ausente', 'esparsa', 'presente')),
  -- blocos opcionais: nulo = bloco não incluído naquele registro
  balanco jsonb,
  toque jsonb,
  observacao text,
  created_by uuid references usuarios (id),
  created_at timestamptz not null default now()
);

create index if not exists controles_paciente_idx on controles (paciente_id, horario desc);

-- ------------------------------------------------------------- medicações
create table if not exists medicacoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  nome text not null,
  apresentacao text,
  dose text,
  via text,
  vazao_ml_h numeric,
  inicio timestamptz,
  intervalo_min int,
  proxima_dose timestamptz,
  status text not null default 'em_curso'
    check (status in ('em_curso', 'suspensa', 'concluida')),
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------- exames e programações
create table if not exists exames_programacoes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  texto text not null,
  horario_programado time,
  realizado boolean not null default false,
  realizado_em timestamptz,
  realizado_por uuid references usuarios (id),
  created_by uuid references usuarios (id),
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------- auditoria
create table if not exists auditoria (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes (id) on delete set null,
  usuario_id uuid references usuarios (id),
  usuario_nome text not null,
  acao text not null,
  entidade text,
  campo text,
  valor_anterior text,
  valor_novo text,
  timestamp timestamptz not null default now()
);

create index if not exists auditoria_paciente_idx on auditoria (paciente_id, timestamp desc);

-- ----------------------------------------------------------- configuração
create table if not exists config (
  chave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);

-- -------------------------------------------- updated_at automático
create or replace function tocar_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['categorias', 'leitos', 'pacientes', 'medicacoes']
  loop
    execute format(
      'drop trigger if exists %I_updated_at on %I;
       create trigger %I_updated_at before update on %I
       for each row execute function tocar_updated_at();',
      t, t, t, t
    );
  end loop;
end $$;

-- ------------------------------------------------------------------- RLS
alter table usuarios enable row level security;
alter table categorias enable row level security;
alter table leitos enable row level security;
alter table pacientes enable row level security;
alter table controles enable row level security;
alter table medicacoes enable row level security;
alter table exames_programacoes enable row level security;
alter table auditoria enable row level security;
alter table config enable row level security;

create or replace function sou_admin() returns boolean as $$
  select coalesce(
    (select admin from usuarios where auth_user_id = auth.uid()),
    false
  );
$$ language sql stable security definer;

-- Dados clínicos: qualquer usuário autenticado lê e escreve.
-- Toda alteração fica rastreada na auditoria.
do $$
declare t text;
begin
  foreach t in array array['pacientes', 'controles', 'medicacoes', 'exames_programacoes']
  loop
    execute format('drop policy if exists autenticado_le on %I;', t);
    execute format(
      'create policy autenticado_le on %I for select to authenticated using (true);', t
    );
    execute format('drop policy if exists autenticado_escreve on %I;', t);
    execute format(
      'create policy autenticado_escreve on %I for insert to authenticated with check (true);', t
    );
    execute format('drop policy if exists autenticado_altera on %I;', t);
    execute format(
      'create policy autenticado_altera on %I for update to authenticated using (true);', t
    );
  end loop;
end $$;

-- Configuração (leitos, categorias, usuários, config): leitura para todos,
-- escrita só para admin.
do $$
declare t text;
begin
  foreach t in array array['leitos', 'categorias', 'usuarios', 'config']
  loop
    execute format('drop policy if exists todos_leem on %I;', t);
    execute format(
      'create policy todos_leem on %I for select to authenticated using (true);', t
    );
    execute format('drop policy if exists admin_escreve on %I;', t);
    execute format(
      'create policy admin_escreve on %I for all to authenticated
       using (sou_admin()) with check (sou_admin());', t
    );
  end loop;
end $$;

-- Auditoria: somente inserção. Nem update nem delete, para ninguém.
drop policy if exists auditoria_le on auditoria;
create policy auditoria_le on auditoria for select to authenticated using (true);
drop policy if exists auditoria_insere on auditoria;
create policy auditoria_insere on auditoria for insert to authenticated with check (true);
-- Não existem políticas de update/delete: com RLS ativo, isso já as proíbe.

-- --------------------------------------------------------- realtime
alter publication supabase_realtime add table pacientes;
alter publication supabase_realtime add table controles;
alter publication supabase_realtime add table medicacoes;
alter publication supabase_realtime add table exames_programacoes;
alter publication supabase_realtime add table leitos;

-- ------------------------------------------------------- seed mínimo
insert into categorias (nome, cor, ordem, padrao) values
  ('Gestante',         '#2563EB', 1, true),
  ('Puérpera',         '#C2185B', 2, true),
  ('Aborto',           '#1F2937', 3, true),
  ('Não classificado', '#9CA3AF', 4, true)
on conflict do nothing;

insert into leitos (nome, tipo)
select l, 'fixo' from unnest(array['A','B','C','D','E','F','G','H','I','J','K','L']) as l
on conflict (nome) do nothing;

insert into leitos (nome, tipo)
select 'Extra ' || n, 'extra' from generate_series(1, 3) as n
on conflict (nome) do nothing;

insert into config (chave, valor) values
  ('comorbidades', '["Hipertensão Gestacional","Pré-eclâmpsia","Diabetes Gestacional","DMG insulinizada","Trabalho de Parto Prematuro","RPMO","ITU","Anemia","Sífilis","HIV","Isoimunização Rh","Obesidade","Abortamento retido","Nenhuma"]'::jsonb),
  ('intervalos_controle_min', '[60,120,240,360]'::jsonb),
  ('turnos', '["07:00","13:00","19:00","01:00"]'::jsonb)
on conflict (chave) do nothing;
