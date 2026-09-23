# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este app

App React Native (Expo) usado pela agente comunitária de saúde para
**pré-cadastrar famílias em campo, offline**, para a Associação Amigos do
Nordeste. Distribuído por APK direto (sem Play Store). Todo o conteúdo do
código, commits e comentários é em português — mantenha esse idioma ao editar.

Leia `docs/decisoes/ADR-0001-pre-cadastro-offline.md` antes de mexer em
qualquer coisa relacionada a envio, sessão ou schema — ele explica o porquê de
quase toda decisão não óbvia do projeto.

## Comandos

```bash
npm install
npx expo start        # roda no Expo Go
npm run android        # expo run:android
npm run lint           # expo lint
npm test               # jest (alias "teste" no package.json)
npm run apk            # eas build -p android --profile apk
```

Rodar um único teste: `npx jest src/dados/__tests__/gravador.test.ts`.

Para apontar para uma API local, edite `extra.apiUrl` em `app.json`. O perfil
`apk` do `eas.json` força `buildType: apk` — sem isso o EAS gera `.aab`, que
não instala direto no celular.

## As quatro decisões que moldam tudo

1. **Só envia, nunca baixa.** O aparelho jamais recebe a base de famílias do
   servidor — é uma fila de saída, não sincronização de duas vias. Não existe
   resolução de conflito porque não existe dado do servidor no aparelho.
2. **O envio vira um "chamado" numa fila de aprovação**, não uma família
   direto. Uma pessoa do lado da associação revisa e aprova.
3. **Duas credenciais que nunca se misturam:** o token do aparelho (trocado
   uma vez pelo código de convite, guardado no SecureStore, vai no
   `Authorization`) autentica com o servidor; o PIN de 4 dígitos é só local,
   nunca sai do aparelho, e serve apenas para travar a tela. Tratar o PIN como
   senha de servidor é o erro clássico a evitar aqui.
4. **Formulário curto em campo.** Responsável, contato, comunidade, ponto de
   referência, quem mora na casa. Moradia/saneamento/renda ficam para a
   aprovação, não para o app.

## Regras que não podem ser esquecidas

- **O `id` de cada pré-cadastro nasce no aparelho** (`novoId()` em
  `src/dados/fila.ts`, UUID via `expo-crypto`) e viaja como chave de
  idempotência no envio (`src/dados/sincronizar.ts`). Nunca deixar o servidor
  gerar esse id — é o que evita família duplicada quando a agente toca
  "enviar" duas vezes ou a internet cai no meio da resposta.
- **Data de nascimento nunca é obrigatória.** Quando não se sabe, grava-se
  `idadeEstimada` **e** `idadeEstimadaEm` juntos — sem a data de referência a
  estimativa não envelhece e não vale nada.
- **Pessoa sem nome pode ser salva**, marcada com `cadastroIncompleto`. Nunca
  travar a digitação por falta de nome.
- **Nada é apagado ao enviar.** O registro só muda de `situacao`
  (`ENVIADO` → `ACEITO`/`DEVOLVIDO`) e continua no celular até a agente apagar
  manualmente.
- Nenhum dado real de família em repositório, teste, print ou grupo.

## Arquitetura

```
app/                      rotas (expo-router, arquivo = rota)
  _layout.tsx             Stack raiz + ProvedorSessao
  index.tsx               decide para onde ir conforme EstadoSessao
  ativar.tsx / pin.tsx     ativação por convite e trava por PIN
  inicio.tsx               contador da fila
  cadastro/familia.tsx     Passo 1 do fluxo de cadastro
src/
  design/tokens.ts         cores, espaçamento, tipografia, ALVO_MINIMO
  design/componentes.tsx   Botao, Campo, Opcoes, Progresso, Selo, Aviso
  dados/banco.ts           SQLite + migrações versionadas (PRAGMA user_version)
  dados/tipos.ts           PreCadastro, Pessoa, Situacao — tipos compartilhados
  dados/fila.ts            toda leitura/escrita da fila de saída
  dados/gravador.ts        debouncer de escrita sem duas gravações se cruzando
  dados/comunidades.ts     lista de comunidades (GET /api/comunidades → SQLite, offline)
  dados/api.ts             cliente HTTP (fetch com timeout, Authorization)
  dados/sincronizar.ts     envio item a item com idempotência
  sessao/sessao.tsx        contexto de ativação/PIN (SecureStore)
```

Alias de import: `@/*` aponta para `src/*` (configurado em `tsconfig.json`).

### Fluxo de dados de uma tela de cadastro

`app/cadastro/*.tsx` é a única camada que conhece o formulário na tela. Toda
tela:
1. No `useEffect` inicial, busca um rascunho existente via `buscar(id)` (rota
   com `id`) ou `buscarRascunhoAberto()` (retomar depois de fechar o app no
   meio) — nunca cria um registro vazio no banco por só abrir a tela.
2. A cada mudança de campo, chama `gravador.agendar(...)`, que serializa
   escritas via `criarGravador` (`src/dados/gravador.ts`) para não deixar duas
   gravações fora de ordem sobrescreverem uma a outra.
3. `salvarRascunho` (`src/dados/fila.ts`) faz upsert do `pre_cadastro` e
   **reescreve a tabela `pessoa` inteira** a cada chamada — por isso qualquer
   tela que só edite dados da família (não pessoas) precisa reler
   `pessoas` do banco antes de salvar, para não apagá-las (ver `familia.tsx`).
4. Ao avançar de passo, `gravador.esvaziar()` garante que a escrita pendente
   chegou ao banco antes de navegar.

### Sessão e autenticação

`src/sessao/sessao.tsx` modela 4 estados (`SEM_ATIVACAO` → `SEM_PIN` →
`TRANCADO` → `ABERTO`) num único contexto React. `app/index.tsx` é a única
tela que decide o roteamento a partir desse estado. O token do aparelho e o
hash do PIN vivem no `expo-secure-store`, nunca em SQLite.

### Banco e migrações

`src/dados/banco.ts` usa uma lista `PASSOS` versionada (estilo Flyway): cada
mudança de schema é um passo novo acrescentado ao array, nunca uma edição de
passo já existente, porque o aparelho pode estar em qualquer versão anterior
quando o APK atualiza. Versão atual controlada via `PRAGMA user_version`.

### Design system

`src/design/tokens.ts` e `componentes.tsx` existem porque quem usa o app está
em pé, no sol, com uma mão, e pode ser interrompida a qualquer momento: alvo
de toque nunca abaixo de `ALVO_MINIMO` (56px), corpo de texto nunca abaixo de
16. Toda tela nova deve compor os componentes existentes (`Botao`, `Campo`,
`Opcoes`, `Progresso`, `Selo`, `Aviso`) em vez de estilo solto — se faltar uma
variante, acrescente-a em `componentes.tsx`.

## Estado do projeto

Só a "casca" está pronta: infraestrutura de dados, design system, sessão e
tela inicial. **Faltam as telas do fluxo de cadastro** além do Passo 1
(`app/cadastro/pessoas.tsx` etc.), a lista de enviados (`app/enviados.tsx`) e
a tela de cadastro devolvido — são issues para o time construir.

Protótipo: [Figma do app](https://www.figma.com/design/SA3REA1kBhYYeiJf6dxH1J)
