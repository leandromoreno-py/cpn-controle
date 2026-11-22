# CPN Controle

Quadro de pacientes para um Centro de Parto Normal: leito, identificação, paridade,
idade gestacional, comorbidades, dilatação e dinâmica uterina, controles com sinais
vitais, balanço hídrico, medicações em curso e exames programados — com alerta visual
de controle atrasado.

**Ambiente de demonstração.** Os dados que vêm no app são fictícios. Não insira dados
reais de paciente enquanto a unidade não tiver configurado autenticação, banco próprio
e as medidas de proteção exigidas para dados de saúde.

## Rodar localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`. Sem nenhuma configuração extra o app roda em **modo
local**: os dados ficam no `localStorage` do navegador — um quadro por computador, sem
multiusuário. Serve para demonstrar para a equipe.

## Ligar o Supabase (multiusuário)

Sem as variáveis abaixo o app roda em **modo local** e nada disto é necessário.

### 1. Criar o projeto

Em [supabase.com](https://supabase.com), crie um projeto. Escolha a região mais
próxima (São Paulo, se houver) — isso reduz a demora de cada gravação.

### 2. Criar as tabelas

**SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql)
e execute. O arquivo pode ser reexecutado sem perigo: tudo é `if not exists` ou
verificado antes de inserir, e as colunas acrescentadas depois entram pelo bloco de
migração no fim.

O arquivo cria as tabelas, o RLS **e os privilégios de tabela** (`grant`). Os dois são
necessários e fazem coisas diferentes: o RLS decide quem pode o quê, o `grant` decide
se o papel pode sequer falar com a tabela. Faltando o `grant`, tudo responde
`permission denied for table` — e a mensagem não diz que o problema é privilégio, o que
manda a pessoa depurar o RLS à toa.

Confira em **Table Editor** que apareceram: `sessoes`, `categorias`, `leitos`,
`pacientes`, `controles`, `medicacoes`, `exames_programacoes`, `auditoria`, `usuarios`
e `config` — e que `leitos` já tem A a L mais os três extras.

### 3. Criar os usuários

**Authentication → Users → Add user**, um por profissional, com e-mail e senha.
Marque *Auto Confirm User*, senão a pessoa não consegue entrar sem confirmar o e-mail.

Não existe autocadastro no app: quem tem acesso ao quadro é decisão da unidade. Na
primeira entrada, o app cria sozinho o registro em `usuarios` com o nome derivado do
e-mail — depois dá para corrigir nome, função e registro profissional direto na tabela.

A coluna `funcao` aceita só `mr1`, `mr2`, `mr3`, `interno` e `staff`, e entra como
`staff` por padrão. É dessa coluna que sai a sigla da assinatura ("MR1 Fulano de Tal"),
então vale corrigir antes da pessoa começar a registrar. Dá para já deixar pronto no
*Add user*, em **User Metadata**:

```json
{ "nome": "Fulano de Tal", "funcao": "mr1" }
```

**Quem entra primeiro vira administrador** — é quem pode mexer em leitos,
categorias e listas. Não há autocadastro, então quem entra primeiro é quem está
montando o serviço; não precisa editar a tabela à mão. Para dar o mesmo poder a outra
pessoa depois, marque `admin = true` na linha dela em `usuarios` (um administrador pode
fazer isso pelo app; ninguém consegue marcar em si mesmo).

### 4. Apontar o app para o projeto

Em **Project Settings → API**, copie a *Project URL* e a chave *anon public*. Copie
`.env.example` para `.env` e preencha:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

A chave *anon* é pública por design — ela vai para dentro do JavaScript do site de
qualquer forma. Quem protege os dados são as políticas de RLS do schema, não o segredo
da chave. **Nunca** use aqui a chave `service_role`: essa ignora todas as políticas.

### 5. Testar localmente

```bash
npm run dev
```

Deve aparecer a tela de login. Entre com um dos usuários criados. Depois:

- Abra o app em duas janelas, com usuários diferentes, e registre um controle numa
  delas — a outra deve atualizar sozinha, sem recarregar.
- Confira os avatares de presença no canto superior direito.
- Abra **Histórico de alterações** e veja se o autor e o horário estão certos.

### 6. Publicar com as chaves

Em **Settings → Secrets and variables → Actions → New repository secret**, crie
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os mesmos valores. O workflow já os
injeta no build.

## Publicar em GitHub Pages

O workflow em `.github/workflows/deploy.yml` faz build e publica a cada push na branch
`main`. Para ativar:

**Settings → Pages → Source: GitHub Actions**. É o único passo.

O prefixo de caminho do site já está em `vite.config.ts` (`BASE_PUBLICACAO`), aplicado
só no build — o servidor de desenvolvimento continua na raiz de `localhost:5173`. Se
você renomear o repositório, mude essa constante.

Atenção: um site no GitHub Pages fica acessível a quem tiver o endereço, mesmo com o
repositório privado. Enquanto é demonstração com dados fictícios, sem problema. Para
dado real, a hospedagem precisa ter login na frente.

## Estrutura

| Caminho | O que é |
| --- | --- |
| `src/lib/calc.ts` | idade gestacional, tempo relativo, débito urinário, balanço, alertas |
| `src/lib/contrast.ts` | ajuste de luminância que mantém as cores editáveis legíveis |
| `src/services/repositorio.ts` | contrato da camada de dados e gravação por registro |
| `src/services/local.ts` | modo local, um quadro por navegador |
| `src/services/supabase.ts` | banco, login, tempo real e presença |
| `src/state/store.tsx` | contexto, ações e gravação da auditoria |
| `src/components/` | quadro, linha de dois níveis, modais, configurações |
| `supabase/schema.sql` | tabelas, RLS, realtime e seed |
| `CLAUDE.md` | decisões de produto e as regras que não devem ser quebradas |
| `docs/prompts-etapas.md` | roteiro das etapas restantes |

## Comandos

```bash
npm run dev        # servidor de desenvolvimento
npm run build      # typecheck + build de produção
npm run typecheck  # só o TypeScript
npm run preview    # serve o build local
```
