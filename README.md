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

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql)
   e execute. Ele cria as tabelas, os triggers de `updated_at`, as políticas de RLS,
   o realtime e um seed de leitos e categorias.
3. Copie `.env.example` para `.env` e preencha:

   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

4. Implemente a classe `StorageSupabase` em `src/services/storage.ts` seguindo a
   interface já definida ali, e devolva-a em `obterStorage()` quando
   `supabaseConfigurado()` for verdadeiro. O prompt pronto dessa etapa está em
   [`docs/prompts-etapas.md`](docs/prompts-etapas.md).

Enquanto o `.env` não existir, o app continua em modo local sem erro.

## Publicar em GitHub Pages

O workflow em `.github/workflows/deploy.yml` faz build e publica a cada push na branch
`main`. Para ativar:

1. **Settings → Pages → Source: GitHub Actions**.
2. Se o repositório **não** se chamar `<usuario>.github.io`, adicione uma variável de
   repositório `VITE_BASE` com o valor `/nome-do-repositorio/`
   (**Settings → Secrets and variables → Actions → Variables**).

Atenção: um site no GitHub Pages fica acessível a quem tiver o endereço, mesmo com o
repositório privado. Enquanto é demonstração com dados fictícios, sem problema. Para
dado real, a hospedagem precisa ter login na frente.

## Estrutura

| Caminho | O que é |
| --- | --- |
| `src/lib/calc.ts` | idade gestacional, tempo relativo, débito urinário, balanço, alertas |
| `src/lib/contrast.ts` | ajuste de luminância que mantém as cores editáveis legíveis |
| `src/services/storage.ts` | camada de dados — nenhum componente acessa o banco direto |
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
