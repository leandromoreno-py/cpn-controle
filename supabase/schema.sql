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
-- search_path vazio e nomes qualificados: sem isso, quem puder criar um objeto
-- num schema anterior no caminho faz a função chamar o objeto dele.
create or replace function public.tocar_updated_at() returns trigger
  language plpgsql
  set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['categorias', 'leitos', 'pacientes', 'medicacoes', 'sessoes']
  loop
    execute format(
      'drop trigger if exists %I_updated_at on %I;
       create trigger %I_updated_at before update on %I
       for each row execute function public.tocar_updated_at();',
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

create or replace function public.sou_admin() returns boolean
  language sql stable security definer
  set search_path = ''
as $$
  select coalesce(
    (select u.admin from public.usuarios u where u.auth_user_id = auth.uid()),
    false
  );
$$;

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

-- Configuração: leitura para todos os identificados.
do $$
declare t text;
begin
  foreach t in array array['leitos', 'categorias', 'usuarios', 'config', 'sessoes']
  loop
    execute format('drop policy if exists todos_leem on %I;', t);
    execute format(
      'create policy todos_leem on %I for select to authenticated using (true);', t
    );
  end loop;
end $$;

-- Escrita na configuração: qualquer pessoa identificada, e tudo que ela mexer
-- fica assinado na auditoria.
--
-- A entrada do app é identificação, não conta: quem abre recebe uma sessão
-- anônima do Supabase e diz quem é. Com isso, restringir leitos e categorias a
-- admin faria o app parecer quebrado para todos menos a primeira pessoa que
-- entrou — só ela poderia renomear um leito ou criar uma sessão.
--
-- A coluna `admin` e `sou_admin()` continuam existindo de propósito: são o que
-- volta a valer no dia em que o serviço trancar o quadro com contas de verdade.
do $$
declare t text;
begin
  foreach t in array array['leitos', 'categorias', 'config', 'sessoes']
  loop
    execute format('drop policy if exists admin_escreve on %I;', t);
    execute format('drop policy if exists identificado_escreve on %I;', t);
    execute format(
      'create policy identificado_escreve on %I for all to authenticated
       using (true) with check (true);', t
    );
  end loop;
end $$;

-- `usuarios` é a exceção: cada pessoa cria e mantém a PRÓPRIA linha, e ninguém
-- altera o cadastro de outra. É isso que sustenta a assinatura — se qualquer um
-- pudesse reescrever o nome de qualquer cadastro, a auditoria deixaria de dizer
-- quem fez o quê.
drop policy if exists admin_escreve on usuarios;

-- Medicação e exame podem ser removidos: tirar da lista uma programação errada
-- é rotina de plantão, e a remoção fica no histórico de alterações. Sem política
-- de delete a remoção não dá erro — afeta zero linhas, e o item reaparece na
-- recarga seguinte, o que parece defeito do app.
do $$
declare t text;
begin
  foreach t in array array['medicacoes', 'exames_programacoes']
  loop
    execute format('drop policy if exists autenticado_remove on %I;', t);
    execute format(
      'create policy autenticado_remove on %I for delete to authenticated using (true);', t
    );
  end loop;
end $$;

-- `pacientes` e `controles` seguem SEM política de delete, de propósito:
-- "arquivamento preserva tudo, nada é excluído" deixa de ser promessa do app e
-- passa a ser regra do banco. A única exclusão legítima de paciente vem da
-- exclusão de uma sessão, e essa desce pelo `on delete cascade`, que não passa
-- por RLS. Um sinal vital registrado não se apaga.

-- Ovo e galinha: `usuarios` só aceitava escrita de admin, e o primeiro admin é
-- uma linha de `usuarios`. Ninguém conseguiria se cadastrar nunca. Cada pessoa
-- pode criar e manter a PRÓPRIA linha.
drop policy if exists self_insere on usuarios;
create policy self_insere on usuarios for insert to authenticated
  with check (auth_user_id = auth.uid());

drop policy if exists self_altera on usuarios;
create policy self_altera on usuarios for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Quem entra primeiro fica marcado como administrador. Hoje isso não concede
-- nada além do que todo mundo já pode (a configuração é aberta a quem se
-- identificou), mas registra quem montou o serviço e volta a ter efeito no dia
-- em que o quadro for trancado com contas.
create or replace function public.primeiro_usuario_e_admin() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if not exists (select 1 from public.usuarios where admin) then
    new.admin := true;
  end if;
  return new;
end;
$$;

drop trigger if exists usuarios_primeiro_admin on usuarios;
create trigger usuarios_primeiro_admin before insert on usuarios
  for each row execute function public.primeiro_usuario_e_admin();

-- `self_altera` deixaria a pessoa marcar admin em si mesma. O RLS não enxerga
-- coluna, então quem barra é o gatilho.
--
-- A condição `auth.uid() is not null` deixa de fora quem está numa conexão
-- direta ao banco — SQL Editor, service role, migração —, onde não há JWT.
-- Sem ela, o próprio dono do banco não conseguia promover ninguém, com uma
-- mensagem que acusava falta de permissão. Quem chega pelo app sempre tem uid,
-- mesmo anônimo, então ninguém escapa da regra por esse caminho.
create or replace function public.proteger_papel_admin() returns trigger
  language plpgsql security definer
  set search_path = ''
as $$
begin
  if new.admin is distinct from old.admin
     and auth.uid() is not null
     and not public.sou_admin() then
    raise exception 'só um administrador pode conceder ou retirar o papel de administrador';
  end if;
  return new;
end;
$$;

drop trigger if exists usuarios_proteger_admin on usuarios;
create trigger usuarios_proteger_admin before update on usuarios
  for each row execute function public.proteger_papel_admin();

-- Auditoria: somente inserção. Nem update nem delete, para ninguém.
drop policy if exists auditoria_le on auditoria;
create policy auditoria_le on auditoria for select to authenticated using (true);
drop policy if exists auditoria_insere on auditoria;
create policy auditoria_insere on auditoria for insert to authenticated with check (true);
-- Não existem políticas de update/delete: com RLS ativo, isso já as proíbe.

-- ---------------------------------------------------------------- GRANT
-- O RLS decide QUEM pode o quê. O GRANT decide se o papel pode sequer falar
-- com a tabela. Faltando o GRANT, o PostgREST responde "permission denied for
-- table" antes de avaliar qualquer política — e a mensagem não diz que o
-- problema é privilégio de tabela, o que manda a pessoa depurar o RLS à toa.
--
-- TRUNCATE ignora RLS: com ele, um usuário logado esvaziaria a auditoria, que é
-- justamente a tabela que não pode ser apagada. Sai, junto com TRIGGER e
-- REFERENCES, que o app não usa.
revoke truncate, trigger, references on all tables in schema public from authenticated;
revoke truncate, trigger, references on all tables in schema public from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Tabelas criadas daqui para frente já nascem acessíveis.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- O app não tem nada a oferecer a quem não entrou.
revoke all on all tables in schema public from anon;

-- Função de gatilho não precisa de EXECUTE para disparar: o gatilho a chama
-- pelo dono da tabela. Com EXECUTE para `anon` e `authenticated`, ela também
-- virava endpoint REST (/rest/v1/rpc/...), chamada que ninguém deveria poder
-- fazer à mão.
revoke all on function public.primeiro_usuario_e_admin() from public, anon, authenticated;
revoke all on function public.proteger_papel_admin() from public, anon, authenticated;
revoke all on function public.tocar_updated_at() from public, anon, authenticated;

-- `sou_admin()` é diferente: as próprias políticas de RLS a chamam, e políticas
-- são avaliadas com o papel de quem consulta. Fica só para `authenticated`, e o
-- que devolve é um booleano sobre a própria pessoa.
revoke all on function public.sou_admin() from public, anon;
grant execute on function public.sou_admin() to authenticated;

-- --------------------------------------------------------- realtime
-- "add table" dá erro se a tabela já está na publicação, então confere antes:
-- é o que permite reexecutar o arquivo inteiro.
do $$
declare t text;
begin
  -- Esta lista TEM de conter toda tabela que o app assina em
  -- TABELAS_TEMPO_REAL (src/services/supabase.ts). Uma tabela de fora não
  -- falha sozinha: o servidor descarta TODAS as inscrições do canal que a
  -- menciona e ainda responde "SUBSCRIBED". Faltava `categorias`, e o app
  -- ficou sem tempo real desde o começo sem um único erro na tela.
  foreach t in array array['pacientes', 'controles', 'medicacoes',
                           'exames_programacoes', 'leitos', 'sessoes',
                           'categorias', 'usuarios']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I;', t);
    end if;
  end loop;
end $$;

-- ------------------------------------------------------- seed mínimo
-- Não há unique em `nome` (o admin pode renomear categoria), então o
-- "on conflict" não serviria: a checagem é explícita.
insert into categorias (nome, descricao, cor, ordem, padrao)
select v.nome, v.descricao, v.cor, v.ordem, true
from (values
  ('Gestante',         null::text,    '#2563EB', 1),
  ('Puérpera',         null,          '#C2185B', 2),
  ('O.F.',             'Óbito fetal', '#0F766E', 3),
  ('Aborto',           null,          '#1F2937', 4),
  ('Não classificado', null,          '#9CA3AF', 5)
) as v(nome, descricao, cor, ordem)
where not exists (select 1 from categorias c where c.nome = v.nome);

-- A primeira sessão nasce uma vez. Se já existe qualquer sessão, não mexe:
-- o usuário pode ter renomeado "Centro de Parto".
insert into sessoes (nome, ordem)
select 'Centro de Parto', 1
where not exists (select 1 from sessoes);

-- Os leitos vão para a sessão mais antiga, e não para a de nome "Centro de
-- Parto": o nome é editável, e um rename não pode fazer o seed criar leitos
-- numa sessão nova.
insert into leitos (sessao_id, nome, tipo)
select s.id, l, 'fixo'
from (select id from sessoes order by ordem, created_at limit 1) s,
     unnest(array['A','B','C','D','E','F','G','H','I','J','K','L']) as l
on conflict (sessao_id, nome) do nothing;

insert into leitos (sessao_id, nome, tipo)
select s.id, 'Extra ' || n, 'extra'
from (select id from sessoes order by ordem, created_at limit 1) s,
     generate_series(1, 3) as n
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
