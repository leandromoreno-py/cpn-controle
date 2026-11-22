# CPN Controle — contexto do projeto

App de controle de pacientes para um Centro de Parto Normal (CPN). Em português do
Brasil, uso em desktop e tablet, fuso America/Fortaleza.

**Ambiente de demonstração.** Nenhum dado real de paciente entra aqui enquanto o app
não tiver autenticação, banco próprio e as medidas de proteção de dados de saúde
configuradas pela unidade. O banner no topo do app diz isso ao usuário.

## Estado atual

Etapas 1 a 3 implementadas: quadro de pacientes, admissão, modal de controles,
anamnese, edição de dados da paciente, encerramento de atendimento, sessões,
configurações de leitos e categorias, exames, arquivadas e histórico de alterações.

Etapa 4 (Supabase) **escrita, não testada contra um projeto real** — falta só a
configuração, descrita no README. Sem as variáveis de ambiente o app roda em modo
local, um quadro por navegador.

Pendentes: passagem de plantão, partograma, exportação CSV. Ver
`docs/prompts-etapas.md`.

## Decisões de produto — não mude sem conversar

Estas foram discutidas e decididas. Se algo aqui parecer errado, pergunte antes de
alterar: provavelmente existe um motivo clínico ou de legibilidade por trás.

### Sessões

Uma sessão é uma unidade de internação com seus **próprios leitos e pacientes**. O
Centro de Parto é a primeira; o usuário cria outras pelas abas acima do quadro, com
nome editável, e cada sessão nova nasce com o mesmo conjunto de leitos (A–L e três
extras) e nenhuma paciente.

Categorias, comorbidades, intervalos de controle e usuários são **compartilhados**
entre todas as sessões — são configuração do serviço, não da unidade.

Quadro, leitos, exames, arquivadas e admissão filtram sempre pela sessão ativa. A
primeira sessão não pode ser excluída, para o app nunca ficar sem nenhuma. Excluir uma
sessão apaga seus leitos e pacientes, e por isso pede confirmação dizendo quantas
pacientes ativas serão perdidas.

### O retângulo do leito é a caixa de edição

Clicar no leito abre um painel ancorado nele com:

- **Situação** — trocar a categoria da paciente (Gestante → Puérpera → O.F. …).
- **Transferir de leito** — escolher um leito livre da sessão e mover.
- **Anamnese** — a descrição do caso em texto livre, com marcador no chip quando já
  existe texto.
- **Editar dados**, **Exames e programações** e **Arquivar / encerrar atendimento**.

**Toda ação do painel passa por confirmação em palavras**, dizendo o que vai acontecer
("Mudar a situação de Gestante para Óbito fetal?"). Trocar a situação de uma paciente
ou movê-la de leito não pode acontecer por um clique torto no meio do plantão.

O leito é o alvo mais fácil de acertar na linha, e é por onde o plantão pensa — por
isso ele, e não um menu genérico, carrega essas ações.

**Painéis ancorados.** A caixa do leito e o menu ⋯ são posicionados na TELA, não dentro
da linha (`usePosicaoAncorada`). Dentro da linha o contêiner da tabela os cortava,
porque ele tem `overflow: hidden` para arredondar os cantos. Eles abrem abaixo do
botão; se não couber, acima; se não couber nem acima, encostam na borda e rolam por
dentro. Qualquer painel novo que saia de um botão da linha deve usar o mesmo hook.

### Duas visualizações: quadro e celular

O quadro de dois níveis precisa de uns 900 px. Abaixo disso ele só caberia com rolagem
horizontal, que é intolerável para conferir sinal vital — então em tela estreita cada
paciente vira um **cartão empilhado** (`CartaoPaciente`), com a mesma informação em
blocos que descem e alvos de toque de 44 px.

O botão 📱 na barra superior alterna à mão, e a escolha fica salva. Na primeira
abertura o app adivinha pela largura da tela. O cartão mostra identificação, controles
e um resumo do que falta; **Mais** abre medicações e exames.

O painel lateral é retrátil pelo ☰. Em modo celular ele vira gaveta sobreposta, com
fundo escurecido, e fecha sozinho ao escolher um item.

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

Categorias: Gestante `#2563EB`, Puérpera `#C2185B`, **O.F.** (óbito fetal) `#0F766E`,
Aborto `#1F2937`, Não classificado `#9CA3AF`. Todas editáveis pelo admin em
Configurações › Categorias.

O rótulo da categoria é curto porque precisa caber no chip da linha — por isso "O.F." e
não "Óbito fetal". O nome por extenso vive em `descricao` e aparece no título ao passar
o mouse, na confirmação de troca e na tela de configuração.

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

Desfechos: parto normal, cesárea, aborto, alta sem desfecho obstétrico, transferida sem
desfecho, óbito materno e óbito fetal. Óbito exige causa preenchida; transferência
exige destino. Registrar o desfecho em **Encerrar atendimento** arquiva a paciente e
devolve o leito como "em limpeza".

**Óbito fetal é SITUAÇÃO, não desfecho.** A paciente com óbito fetal continua
internada e ainda vai parir: ela recebe a categoria O.F. pela caixa do leito, e o
desfecho dela será o parto, com o recém-nascido registrado com destino "Natimorto".
Por isso `obito_fetal` não aparece na lista de desfechos de Encerrar atendimento,
embora o tipo continue existindo para dados antigos.

Óbito **materno** continua sendo desfecho: encerra o atendimento e exige causa.

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

1. **Renomear é permitido a qualquer momento**, inclusive com paciente no leito: a
   referência é pelo id, a paciente não sai do lugar e só o rótulo muda. Em sessões
   como alojamento conjunto, nomear os leitos é parte do trabalho. O lápis ao lado do
   nome, dentro da caixa do leito, renomeia sem sair do quadro.
2. **Desativar exige o leito vazio** — esse sim: um leito fora de serviço com paciente
   dentro é contradição. Desativar não é excluir: o leito sai da lista de admissão e
   continua no histórico.
3. **Alta, óbito e transferência devolvem o leito como LIVRE**, pronto para a próxima
   admissão. Segurar o leito depois da alta só atrapalha quem precisa internar alguém.
4. "Em limpeza" continua existindo, mas é marcado **à mão** em Configurações › Leitos,
   para quando o leito precisa mesmo ficar fora de uso por um tempo. A admissão mostra
   um botão para liberar na hora.
5. Admissão e transferência só **aceitam** leitos livres e ativos, mas **mostram
   todos**, com os indisponíveis desabilitados e o motivo ao lado ("A — Maria Clara
   S. Nunes", "J — em limpeza", "L — bloqueado"). Um leito que some da lista sem
   explicação faz a pessoa achar que o app está quebrado; foi exatamente o que
   aconteceu em teste.
6. A admissão oferece um botão para liberar ali mesmo um leito em limpeza, sem
   precisar ir às configurações.

Leitos: fixos A a L, mais Extra 1 a 3, mais os que o admin criar.

### Exames e programações

Acrescentar, marcar e remover ficam em `ModalExames`, aberto pelo menu ⋯, pela caixa
do leito ou pelo botão ☑ do cartão. Antes só dava para cadastrar na admissão, o que
não cobre o plantão: programação nasce no meio do turno.

Marcar como realizado grava quem marcou e o horário; remover tira da lista e fica no
histórico de alterações. As checkboxes no quadro e na página Exames continuam
funcionando para marcar e desmarcar sem abrir nada.

**O horário da última realização sobrevive ao desmarcar** (`ultimaRealizacaoEm`). É o
que permite ver `últ. 14:32` ao lado de uma cardiotocografia que se repete ao longo do
plantão. O botão **Repetir**, na tela de exames, devolve o item a pendente guardando
esse horário — serve para CTG, glicemia capilar, PA de 15 em 15 min e tudo que se
refaz no turno.

No quadro e no cartão, a coluna de horário mostra: o horário em que foi feito, quando
realizado; `últ. HH:MM` quando já foi feito antes e está pendente de novo; e o horário
programado quando nunca foi feito.

### Medicações

`ModalMedicacoes`, aberto pelo menu ⋯, pela caixa do leito ou pelo "editar" ao lado de
Medicações no cartão. Acrescentar, editar dose, via, vazão e próxima dose, registrar
**Dose agora** (que grava o horário e recalcula a próxima pelo intervalo), suspender,
concluir e remover.

Atalhos para o que se usa no centro: ocitocina, sulfato de magnésio (com a observação
das checagens), ampicilina, dipirona, betametasona e misoprostol.

### Trilha de doses

Medicação com intervalo mostra a **sequência numerada de doses** no quadro, no cartão
e na tela de medicações: `1ª 08:30 ✓` · `2ª 12:30 ✓` · `3ª 16:30 →` · `4ª 20:30`.

- **✓ verde** — dose administrada, com o horário REAL em que foi dada.
- **→ âmbar** — a próxima prevista.
- **⚠ laranja** — a próxima já passou da hora.
- Cinza discreto — doses futuras.

Cada estado tem cor **e** símbolo. Num posto de enfermagem a cor sozinha não pode
distinguir dose dada de dose pendente.

**As doses seguintes são projetadas a partir da última dose dada, não do horário de
início.** Se uma dose atrasa, o esquema inteiro anda junto — é assim que funciona na
prática. `serieDoses` e `recortarSerie` ficam em `src/lib/calc.ts`, cobertos por
testes; `TrilhaDoses` desenha.

No quadro a trilha é recortada para caber (até 4 chips, com `+N` indicando as
anteriores); na tela de medicações aparece inteira.

`totalDoses` fecha o esquema (betametasona, 2 doses): ao registrar a última, a
medicação se conclui sozinha. **Desfazer** devolve a última dose registrada, para o
clique errado no meio do plantão.

Medicação com próxima dose vencida continua aparecendo em laranja no chip da linha.

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

### Onde cada edição acontece

- **Retângulo do leito** → situação, transferência, anamnese, editar, arquivar.
- **Nome da paciente, botão da barra superior, ou menu ⋯** → editar nome, idade, IG,
  situação (categoria), status, paridade, comorbidades, intervalo de controles e leito.
- **Menu ⋯ → Encerrar atendimento** → alta, óbito, transferência; arquiva e libera o
  leito.
- **Configurações › Leitos** → cadastro, renome, status e o botão Liberar de um leito
  em limpeza.

A edição de dados **não** registra desfecho, e o encerramento **não** edita dados. A
separação é deliberada: trocar a categoria de uma paciente é uma correção cadastral,
registrar um óbito é um ato clínico com causa obrigatória e auditoria.

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
  services/repositorio.ts  contrato + gravação por registro (diferenças)
  services/local.ts        modo local
  services/supabase.ts     banco, login, tempo real, presença
  services/storage.ts      escolhe o backend
  services/seed.ts     8 pacientes fictícias cobrindo as 4 categorias
  state/store.tsx      contexto, ações e gravação da auditoria
  components/          Sidebar, AbasSessoes, QuadroPacientes, LinhaPaciente,
                       CartaoPaciente, MenuLeito,
                       ModalAdmissao, ModalControles, ModalAnamnese,
                       ModalEditarPaciente, ModalEncerrar, ModalExames,
                       ConfigLeitos, ConfigCategorias
                       usePosicaoAncorada — painéis que saem de um botão da linha
```

O estado salvo no navegador é versionado (`cpn-controle:estado:v2`), e
`storage.ts` migra a versão anterior em vez de descartá-la. Ao acrescentar um campo
obrigatório, acrescente também a migração.

Regra que não deve ser quebrada: **componente nenhum fala com `localStorage` ou com o
Supabase diretamente.** Tudo passa pelo repositório.

**A gravação é por registro, nunca por estado inteiro.** Com várias pessoas no mesmo
quadro, salvar tudo de uma vez faria a última gravação apagar o trabalho das outras.
O store continua escrevendo o próximo estado em memória; `persistirDiferencas` compara
com o último estado gravado e manda só as linhas que mudaram. Uma ação nova passa a
ser persistida sem ninguém lembrar de nada — e isso é coberto por testes.

Mudança vinda de outro cliente entra pelo `inscrever` e recarrega o estado, sem
disparar nova gravação.

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
