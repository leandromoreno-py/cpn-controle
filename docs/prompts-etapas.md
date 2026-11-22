# Roteiro das etapas restantes

As etapas 1 a 3 já estão no código. O que segue são os pedidos prontos para o Claude
Code, um por vez. Depois de cada um, confira o item de verificação antes de avançar.

As decisões de produto estão em [`../CLAUDE.md`](../CLAUDE.md) — o Claude Code lê esse
arquivo automaticamente, então não é preciso repetir a linha de dois níveis, a regra
dos alertas sem vermelho nem as regras de leito em cada pedido.

---

## Etapa 4 — Supabase (implementada)

O código está escrito: `src/services/repositorio.ts`, `local.ts` e `supabase.ts`, mais
a tela de login e a presença. Falta apenas a configuração do projeto, descrita no
[README](../README.md#ligar-o-supabase-multiusuário).

O que vale conferir no primeiro uso real, porque não deu para testar sem um projeto:

- duas janelas com usuários diferentes se atualizam entre si;
- o histórico de alterações grava o autor certo;
- uma edição simultânea na mesma paciente não apaga a do outro.

## Etapa 5a — Medicações

> Implemente a gestão de medicações pela interface. O fluxo de desfecho já existe em
> ModalEncerrar — não refaça.
>
> Medicações: painel por paciente com nome, apresentação, dose, via, vazão em mL/h,
> início, intervalo, próxima dose calculada, responsável e status (em curso, suspensa,
> concluída). Atalhos pré-configurados em Configurações: Ocitocina (mL/h), Sulfato de
> magnésio (ataque e manutenção, com checagens de reflexo patelar, FR e diurese),
> Antibiótico, Analgesia, Corticoide. Medicação com próxima dose vencida já aparece
> destacada no chip da linha — mantenha esse comportamento.
>
**Verifique:** uma medicação com próxima dose vencida deve aparecer em laranja no chip
da linha.

---

## Etapa 5b — Passagem de plantão, partograma e exportação

> Implemente três telas:
>
> Passagem de plantão: tela imprimível e exportação em PDF com todas as pacientes
> ativas — leito, nome, idade, paridade, IG, categoria, status, comorbidades, último
> controle com valores, medicações em curso, pendências e horários. Turnos
> configuráveis (padrão 07:00, 13:00, 19:00, 01:00); o relatório cobre o turno
> corrente.
>
> Partograma: gráfico por paciente alimentado pelos registros de toque vaginal —
> dilatação em cm e plano de DeLee por hora, no eixo do tempo, com as linhas de alerta
> e de ação da OMS. Sem registros suficientes, mostre o gráfico vazio explicando o que
> falta.
>
> Exportação: CSV do quadro atual e do histórico de uma paciente.

**Verifique:** o partograma deve desenhar a curva de uma paciente que tenha dois ou
mais toques registrados.

---

## Etapa 6 — Se a conexão do centro se mostrar instável

Não implementada de propósito: hoje, se o Wi-Fi cair durante um registro, ele se perde.

> Implemente fila local de escrita com sincronização: gravações feitas offline ficam
> numa fila em IndexedDB e sobem quando a conexão volta, com indicador visível de
> pendências e resolução de conflito pela mesma regra de `updated_at`.

Vale pedir só depois que a equipe usar o app por alguns plantões e você souber se o
problema é real.

---

## Decisão que precede a produção

No popup de responsável, qualquer usuário pode registrar em nome de outro, e a
auditoria guarda as duas informações. Se o serviço exigir que o registro seja
inequivocamente de quem o fez, obrigue cada pessoa a entrar com a própria conta e o
popup passa a servir apenas para cadastrar quem ainda não tem acesso.

Isso muda a tabela `controles`, então decida antes de levar a etapa 4 para produção.
