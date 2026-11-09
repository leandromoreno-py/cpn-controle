# CPN Controle — contexto do projeto

App de controle de pacientes para um Centro de Parto Normal (CPN). Em português do
Brasil, uso em desktop e tablet, fuso America/Fortaleza.

**Ambiente de demonstração.** Nenhum dado real de paciente entra aqui enquanto o app
não tiver autenticação, banco próprio e as medidas de proteção de dados de saúde
configuradas pela unidade. O banner no topo do app diz isso ao usuário.

## Estado atual

Etapas 1 a 3 implementadas: quadro de pacientes, admissão, modal de controles,
configurações de leitos e categorias, exames, arquivadas e histórico de alterações.

Persistência em `localStorage` por enquanto. A etapa 4 (Supabase) troca a
implementação dentro de `src/services/`, sem tocar nos componentes. O schema já está
escrito em `supabase/schema.sql`.

Pendentes: medicações editáveis pela UI, desfecho e alta com formulário próprio,
passagem de plantão, partograma, exportação CSV. Ver `docs/prompts-etapas.md`.

## Decisões de produto — não mude sem conversar

Estas foram discutidas e decididas. Se algo aqui parecer errado, pergunte antes de
alterar: provavelmente existe um motivo clínico ou de legibilidade por trás.

### A linha do paciente tem DOIS NÍVEIS

Cada paciente é uma linha, dividida em dois níveis separados por borda tracejada.
Nível 1 identifica (leito, paciente, paridade, IG, comorbidades, dilatação/DU, último
controle, ações); nível 2 traz controles, medicações e exames.

Doze informações não cabem numa única fileira de colunas sem ficarem ilegíveis. Se
alguém pedir "tudo numa linha só", o resultado fica inutilizável num plantão.

### A cor da categoria NÃO preenche a linha

Barra vertical de 5 px + chip + fundo tingido a 9 % (13 % no hover). Nunca a cor
saturada no bloco inteiro: isso derruba o contraste do texto e esconde os alertas
clínicos.

Categorias: Gestante `#2563EB`, Puérpera `#C2185B`, Aborto `#1F2937`, Não classificado
`#9CA3AF`. Todas editáveis pelo admin em Configurações › Categorias.

### Nenhum alerta usa vermelho

O vermelho pertence à categoria puérpera. Atraso de controle e alerta clínico usam
escala própria: em dia `#059669`, vencendo `#E8A33C`, atrasado `#EA580C`. Toda cor vem
acompanhada de ícone ou rótulo — cor nunca é o único portador de informação.

### Correção automática de luminância

As cores das categorias são editáveis, então `src/lib/contrast.ts` ajusta cor de texto
e barra até atingir 4,5:1 (texto) e 3:1 (barra) contra o fundo do tema. É por isso que
o preto do "Aborto" aparece como grafite claro no tema escuro. Não remova esse ajuste
para "respeitar o hex do admin": o hex continua sendo a fonte, a correção só garante
que nenhuma escolha produza uma linha ilegível.

### Categoria ≠ status ≠ desfecho

- `categoria` é a identidade visual (cor da linha).
- `status` é o momento do fluxo: internada, em trabalho de parto, em centro cirúrgico,
  puérpera, alta, transferida.
- `desfecho` é o que aconteceu: parto normal, cesárea, aborto, transferida sem
  desfecho — com horário e, para cesárea, a indicação.

**Cesárea é desfecho, não status.** Quem cesariou passa a ser puérpera.

### Balanço hídrico e toque vaginal são blocos OPCIONAIS

Checkbox na própria legenda do fieldset. Desmarcado, o registro salva sem esses dados.

O motivo: obrigatórios, ninguém registraria uma PA de rotina; em modais separados, a
dilatação do quadro ficaria dessincronizada dos controles.

A dilatação do colo existe **apenas** no toque vaginal — não na seção de avaliação. O
valor exibido no quadro vem do último toque registrado.

### Não existe campo de dor

Foi retirado deliberadamente.

### Valores derivados são sempre calculados

Idade gestacional, tempo desde o último controle, débito urinário e balanço nunca são
digitados. Ficam em `src/lib/calc.ts`. O débito mostra a conta inteira na interface
(`(320 − 180) ÷ 2,8 h · anterior 180 mL às 09:32`) para a pessoa poder conferir.

O balanço é calculado **desde o último registro**, não acumulado de 24 h. Em
pré-eclâmpsia costuma-se querer o acumulado também — decisão em aberto.

### Alertas aparecem ANTES de salvar

O banner do modal recalcula a cada tecla. Serve para a pessoa perceber que digitou
errado, em vez de descobrir o alerta depois no quadro. Os alertas clínicos aparecem no
chip do próprio sinal vital, não como ícone solto na linha: localiza o problema no
número.

### Regras de leito

1. Leito ocupado não pode ser renomeado nem desativado — transfira a paciente antes.
2. Desativar não é excluir: o leito sai da lista de admissão e continua no histórico.
3. Transferência marca o leito de origem como "em limpeza" automaticamente.
4. "Em limpeza" volta a "livre" pelo botão Liberar no mapa.
5. Admissão e transferência só oferecem leitos livres e ativos.

Leitos: fixos A a L, mais Extra 1 a 3, mais os que o admin criar.

### Arquivamento preserva tudo

Alta e transferência arquivam a paciente. **Nada é excluído.** O histórico inteiro fica
e a paciente pode ser reaberta num leito livre.

### Auditoria é somente leitura

Toda alteração grava autor, horário, campo, valor anterior e novo. Nenhuma tela edita
ou apaga registros de auditoria, e o RLS do Supabase não tem política de update ou
delete para essa tabela.

Quando o responsável de um controle é trocado no popup, a auditoria guarda **as duas
informações**: quem registrou e de qual conta foi lançado. Trocar o responsável não
troca a sessão.

### Decisão em aberto

No popup de responsável, qualquer usuário pode registrar em nome de outro. Se o
serviço exigir que o registro seja inequivocamente de quem o fez, o caminho é obrigar
cada pessoa a entrar com a própria conta, e o popup passa a servir só para cadastrar
quem ainda não tem acesso. Isso muda a tabela `controles`, então decida antes de
levar a etapa 4 para produção.

## Unidades

mmHg, bpm, irpm, mL, °C, %. Horários em HH:MM com tempo relativo ao lado.

## Identidade visual

Paleta ameixa, definida em `src/index.css` via `@theme` do Tailwind v4:

```
plum-50  #FAF5FD   plum-500 #9548C2   plum-900 #3A1253
plum-100 #F2E6F9   plum-600 #7A32A3   plum-950 #2A0A3D
plum-200 #E4C7F2   plum-700 #612485
plum-300 #CE9CE6   plum-800 #4C1A6B
plum-400 #B26FD6
```

Acento dourado `#E8A33C`. Sidebar e topbar em plum-950, item ativo plum-800. Tema claro
e escuro via `data-theme` no `<html>`, com tokens em variáveis CSS.

Tipografia Inter, números com `tabular-nums` para alinhar as colunas de controles.

## Arquitetura

```
src/
  lib/contrast.ts    luminância e contraste — cores editáveis com correção
  lib/calc.ts        IG, tempo relativo, débito urinário, balanço, alertas
  services/storage.ts  interface assíncrona; nenhum componente acessa o banco direto
  services/seed.ts     8 pacientes fictícias cobrindo as 4 categorias
  state/store.tsx      contexto, ações e gravação da auditoria
  components/          Sidebar, QuadroPacientes, LinhaPaciente, modais, configs
```

Regra que não deve ser quebrada: **componente nenhum fala com `localStorage` ou com o
Supabase diretamente.** Tudo passa por `src/services/storage.ts`. É o que vai permitir
a etapa 4 sem reescrever a UI.

## Acessibilidade

Navegação por teclado, contraste AA, alvos de toque ≥ 44 px, `<label>` em todo campo,
`aria-label` em botão só com ícone, e cor sempre acompanhada de texto ou ícone. A tela
é lida à distância num posto de enfermagem: não reduza tamanhos de fonte para ganhar
espaço.

## Comandos

```
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build
npm run typecheck
```
