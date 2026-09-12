# ADR-0001 — Pré-cadastro offline pela agente de saúde

**Data:** 12/09/2026 · **Situação:** aceita

## Contexto

A agente comunitária de saúde visita as casas do sítio de qualquer jeito, a
trabalho do município. A ideia é ela também registrar as famílias para a
associação nessa mesma visita, em vez de o líder escrever no papel e alguém
digitar depois.

Restrições reais: não há sinal confiável no sítio, não há dinheiro para publicar
na Play Store, e a associação decidiu na primeira reunião que **uma pessoa
decide o que entra na base de famílias**.

## Decisões

### 1. Fila de saída, não sincronização

O aparelho **nunca baixa** a base de famílias. Só guarda o que aquela agente
digitou, até ser enviado.

Sincronização de duas vias exigiria resolver conflito quando duas pessoas
editam o mesmo registro — é a metade difícil do problema, e não compra nada
aqui: a agente cadastra família nova, não corrige cadastro dos outros.

E tem uma consequência de privacidade que vale mais que a simplicidade: **nenhum
dado de família sai do servidor para um celular.** Se o aparelho for perdido,
roubado ou vendido, o que se perde é o que aquela agente digitou e ainda não
enviou — não a base da associação.

### 2. O que chega vai para uma fila de aprovação

O envio não cria família. Cria um **chamado** que aparece no sistema web, onde a
dona revisa, corrige, completa o que falta e aprova. Só então vira família.

Preserva a decisão original sem impedir que mais gente ajude a coletar. E
resolve o problema que a versão anterior desta ideia não resolvia: o que
acontece com o pré-cadastro depois de enviado.

### 3. Token do aparelho no servidor, PIN só no celular

- **Código de convite** (uma vez, com internet) → o servidor devolve um token de
  longa duração, guardado no SecureStore. É ele no `Authorization`.
- **PIN de 4 dígitos** → local, com hash, nunca enviado ao servidor.

Se o PIN fosse a senha da conta, a agente precisaria de internet para abrir o
app — exatamente o que não pode acontecer. O PIN não é grande segurança: é para
o celular na mão de outra pessoa não abrir um app com dado de família dentro.

### 4. Formulário curto em campo

Responsável, contato, comunidade, ponto de referência e quem mora na casa.
Moradia, saneamento e renda ficam para a aprovação.

São perguntas mais longas e mais delicadas de fazer na porta da casa, e o
formulário inteiro em pé, no sol, com uma mão, é formulário abandonado pela
metade. A associação completa depois, com calma, na tela de revisão.

### 5. O `id` nasce no aparelho

Cada pré-cadastro recebe um UUID gerado localmente, que viaja para o servidor
como chave de idempotência. `POST` repetido com o mesmo id responde
`JA_RECEBIDO` em vez de criar outra família.

Cobre os dois casos que acontecem de verdade: a agente tocando duas vezes em
"enviar", e a internet caindo depois de o servidor já ter gravado mas antes da
resposta chegar. Sem isso, a associação recebe família repetida e só descobre na
revisão.

### 6. Um por vez, não em lote único

O envio percorre a fila item a item. Um lote único falharia inteiro quando a
conexão cai no meio; assim o que já passou fica marcado e a próxima tentativa
continua de onde parou.

## Consequências

- O backend ganha uma tabela (`pre_cadastro`), um papel de usuário (`AGENTE`) e
  cinco rotas. É trabalho pequeno **porque** o app é uma fila de saída.
- A associação ganha uma tela nova, a de chamados. É lá que o trabalho de
  verdade acontece — o app só coleta.
- O número de famílias na base continua sendo decidido por uma pessoa. Nenhum
  relatório muda de valor sem ela aprovar.

## Duas perguntas que continuam abertas

1. **Ninguém conversou com uma agente ainda.** O resto do projeto nasceu de
   documentos reais e de uma reunião; este app nasceu de uma ideia do grupo.
   Vinte minutos de conversa com uma agente valem mais que qualquer ajuste de
   tela.
2. **A agente é servidora do município, não da associação.** Confirmar com a
   associação se ela pode ser convidada a instalar o app e coletar em nome
   deles, e se o dado coletado nesse papel pode alimentar a base da ONG. Não é
   bloqueio técnico — é o tipo de coisa que derruba o projeto depois de pronto.
