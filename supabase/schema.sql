-- CPN Controle — schema do Supabase (etapa 4)
--
-- Reexecutar este arquivo é seguro: tudo é "if not exists" ou "on conflict do
-- nothing", e as colunas acrescentadas depois entram pelo bloco de migração no
-- fim do arquivo.
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

-- ---------------------------------------------------------------- sessões
-- Cada sessão é uma unidade de internação com seus próprios leitos e
-- pacientes. Categorias, comorbidades e usuários são compartilhados.
create table if not exists sessoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- usuários
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  nome text not null,
  funcao text not null default 'staff',
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
  -- rótulo curto, que cabe no chip da linha (ex.: "O.F.")
  nome text not null,
  -- nome por extenso, usado em títulos e confirmações
  descricao text,
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
  sessao_id uuid not null references sessoes (id) on delete cascade,
  nome text not null,
  tipo text not null default 'fixo' check (tipo in ('fixo', 'extra', 'personalizado')),
  status text not null default 'livre'
    check (status in ('livre', 'ocupado', 'limpeza', 'bloqueado')),
  observacao text,
  ativo boolean not null default true,
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- o nome do leito é único dentro da sessão, não no serviço inteiro
  unique (sessao_id, nome)
);

-- -------------------------------------------------------------- pacientes
create table if not exists pacientes (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references sessoes (id) on delete cascade,
  leito_id uuid references leitos (id) on delete set null,
  nome text not null,
  data_nascimento date,
  idade int,
  categoria_id uuid not null references categorias (id),
  status text not null default 'internada'
    check (status in ('internada', 'trabalho_de_parto', 'centro_cirurgico',
                      'puerpera', 'alta', 'transferida', 'obito')),
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
  -- descrição do caso em texto livre, aberta pelo chip do leito
  anamnese text,
  arquivada boolean not null default false,
  arquivada_em timestamptz,
  motivo_arquivamento text,
  transferida_para text,
  created_by uuid references usuarios (id),
  updated_by uuid references usuarios (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pacientes_ativas_idx
  on pacientes (sessao_id, arquivada, leito_id);

-- -------------------------------------------------------------- controles
create table if not exists controles (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  horario timestamptz not null default now(),
  -- responsável = quem fez; lancado_por = a conta que registrou.
  -- As duas informações ficam guardadas quando diferem.
  responsavel_id uuid references usuarios (id),
  responsavel_nome text not null,
  responsavel_funcao text,
  lancado_por_id uuid references usuarios (id),
  lancado_por_nome text,
  lancado_por_funcao text,
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
  ultima_dose_em timestamptz,
  -- horários das doses efetivamente administradas, em ordem
  doses_administradas timestamptz[] not null default '{}',
  -- quantas doses o esquema prevê ao todo (betametasona: 2)
  total_doses int,
  observacao text,
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
  -- o app guarda o NOME de quem marcou, que é o que a tela mostra
  realizado_por_nome text,
  -- sobrevive ao desmarcar: é o "últ. 14:32" de um exame que se repete
  ultima_realizacao_em timestamptz,
  ultima_realizacao_por text,
  created_by uuid references usuarios (id),
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------- auditoria
create table if not exists auditoria (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references pacientes (id) on delete set null,
  usuario_id uuid references usuarios (id),
  usuario_nome text not null,
  -- função no momento do registro, não lida do cadastro na hora de exibir:
  -- quem era MR1 em março é MR2 em abril, e a linha antiga tem de continuar
  -- dizendo MR1.
  usuario_funcao text,
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
  foreach t in array array['categorias', 'leitos', 'pacientes', 'medicacoes', 'sessoes']
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
alter table sessoes enable row level security;
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
  foreach t in array array['leitos', 'categorias', 'usuarios', 'config', 'sessoes']
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
alter publication supabase_realtime add table sessoes;

-- ------------------------------------------------------- seed mínimo
insert into categorias (nome, descricao, cor, ordem, padrao) values
  ('Gestante',         null,          '#2563EB', 1, true),
  ('Puérpera',         null,          '#C2185B', 2, true),
  ('O.F.',             'Óbito fetal', '#0F766E', 3, true),
  ('Aborto',           null,          '#1F2937', 4, true),
  ('Não classificado', null,          '#9CA3AF', 5, true)
on conflict do nothing;

insert into sessoes (nome, ordem) values ('Centro de Parto', 1)
on conflict do nothing;

insert into leitos (sessao_id, nome, tipo)
select s.id, l, 'fixo'
from sessoes s,
     unnest(array['A','B','C','D','E','F','G','H','I','J','K','L']) as l
where s.nome = 'Centro de Parto'
on conflict (sessao_id, nome) do nothing;

insert into leitos (sessao_id, nome, tipo)
select s.id, 'Extra ' || n, 'extra'
from sessoes s, generate_series(1, 3) as n
where s.nome = 'Centro de Parto'
on conflict (sessao_id, nome) do nothing;

insert into config (chave, valor) values
  ('comorbidades', '["Hipertensão Gestacional","Pré-eclâmpsia","Diabetes Gestacional","DMG insulinizada","Trabalho de Parto Prematuro","RPMO","ITU","Anemia","Sífilis","HIV","Isoimunização Rh","Obesidade","Abortamento retido","Nenhuma"]'::jsonb),
  ('intervalos_controle_min', '[60,120,240,360]'::jsonb),
  ('turnos', '["07:00","13:00","19:00","01:00"]'::jsonb)
on conflict (chave) do nothing;


-- ------------------------------------------------- migração de colunas
-- Para quem já rodou uma versão anterior deste schema: acrescenta o que veio
-- depois, sem tocar nos dados existentes.
alter table categorias          add column if not exists descricao text;
alter table pacientes           add column if not exists anamnese text;
alter table exames_programacoes add column if not exists realizado_por_nome text;
alter table exames_programacoes add column if not exists ultima_realizacao_em timestamptz;
alter table exames_programacoes add column if not exists ultima_realizacao_por text;
alter table medicacoes          add column if not exists ultima_dose_em timestamptz;
alter table medicacoes          add column if not exists doses_administradas timestamptz[] not null default '{}';
alter table medicacoes          add column if not exists total_doses int;
alter table medicacoes          add column if not exists observacao text;
alter table controles           add column if not exists responsavel_funcao text;
alter table controles           add column if not exists lancado_por_funcao text;
alter table auditoria           add column if not exists usuario_funcao text;

-- As funções passaram a ser as cinco fixas: MR1, MR2, MR3, Interno e Staff.
-- Cadastros antigos vão para a equivalente mais próxima e podem ser corrigidos
-- pela pessoa. Os registros de auditoria já gravados ficam sem função — não se
-- atribui cargo a quem registrou antes da lista existir.
alter table usuarios alter column funcao set default 'staff';
update usuarios set funcao = case funcao
    when 'residente'          then 'mr1'
    when 'tecnico'            then 'interno'
    when 'doula'              then 'interno'
    when 'mr1' then 'mr1' when 'mr2' then 'mr2' when 'mr3' then 'mr3'
    when 'interno' then 'interno' when 'staff' then 'staff'
    else 'staff'
  end
  where funcao not in ('mr1', 'mr2', 'mr3', 'interno', 'staff');

alter table usuarios drop constraint if exists usuarios_funcao_check;
alter table usuarios add constraint usuarios_funcao_check
  check (funcao in ('mr1', 'mr2', 'mr3', 'interno', 'staff'));

-- O status 'obito' e os desfechos novos entraram depois da primeira versão.
alter table pacientes drop constraint if exists pacientes_status_check;
alter table pacientes add constraint pacientes_status_check
  check (status in ('internada', 'trabalho_de_parto', 'centro_cirurgico',
                    'puerpera', 'alta', 'transferida', 'obito'));
