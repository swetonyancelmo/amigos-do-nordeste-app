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
npm run lint           # expo lint; no-console é erro (privacidade)
npx jest               # ou `npm run teste`: NÃO existe script "test", então `npm test` falha
npm run conferir-apk   # antes de gastar build: perfil, URL https, rotas da API publicada
npm run apk            # conferir-apk + eas build -p android --profile apk
```

Rodar um único teste: `npx jest src/dados/__tests__/gravador.test.ts`.

Este repositório **não tem CI**: antes do PR, rode `npm run lint` e `npx jest`
(conferido em 08/10/2026: 17 suítes e 160 testes passando; o lint tem apenas
avisos de estilo, nenhum erro).

Os testes rodam em Node com `jest-expo`. Para o SQLite, use
`jest.mock('expo-sqlite', () => jest.requireActual('../../testes/sqliteEmNode'))`:
`src/testes/sqliteEmNode.ts` implementa a parte do `expo-sqlite` que o app usa
sobre `node:sqlite`, gravando em arquivo para simular fechar e reabrir o app.
Nunca importe esse módulo fora de teste.

Para apontar para uma API local, copie `.env.example` para `.env` e defina
`EXPO_PUBLIC_API_URL` com o IP da máquina na rede (`app.config.js` lê a
variável). A URL de produção fica em `build.apk.env` do `eas.json`, junto com
`APP_BUILD_RELEASE=1`, que faz o `app.config.js` recusar o build sem
`https://` real. Nunca commite IP local. `http://` só funciona no Expo Go. O
perfil `apk` força `buildType: apk` (sem isso o EAS gera `.aab`, que não
instala no celular) e o `versionCode` sobe sozinho no EAS
(`appVersionSource: "remote"`). Antes de gerar, siga `docs/DEPLOY-APK.md`.

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
  ativar.tsx / pin.tsx     ativação por convite (POST /api/agentes/ativar) e trava por PIN
  inicio.tsx               contador da fila e atalhos
  cadastro/familia.tsx     Passo 1: responsável, contato, comunidade, ponto de referência
  cadastro/pessoas.tsx     Passo 2: quem mora na casa (lista, abre, remove)
  cadastro/pessoa.tsx      formulário de uma pessoa (adicionar/editar)
  cadastro/revisar.tsx     Passo 3: conferir e salvar (vira PRONTO)
  cadastro/devolvido.tsx   motivo da devolução e "corrigir e reenviar"
  enviados.tsx             "Meus cadastros": tudo no aparelho, com selo de situação
  enviando.tsx             progresso do envio da fila
  sem-internet.tsx         envio sem rede: tranquiliza e mostra o que ficou guardado
  sem-acesso.tsx           token recusado (código reemitido): ativar de novo sem perder a fila
src/
  design/tokens.ts         cores, espaçamento, tipografia, ALVO_MINIMO
  design/componentes.tsx   Titulo, Carregando, Botao, Campo, Marcar, Destaque, ItemLista, Opcoes, Progresso, Barra, Selo, Aviso, useAnunciar
  dados/banco.ts           SQLite + migrações versionadas (PRAGMA user_version)
  dados/tipos.ts           PreCadastro, Pessoa, Situacao, SituacaoNoServidor — tipos compartilhados
  dados/fila.ts            toda leitura/escrita da fila de saída
  dados/gravador.ts        debouncer de escrita sem duas gravações se cruzando
  dados/comunidades.ts     lista de comunidades (GET /api/comunidades/opcoes → SQLite, offline)
  dados/api.ts             cliente HTTP (fetch com timeout, Authorization)
  dados/sincronizar.ts     envio item a item com idempotência; depois, consulta a situação
  dados/ativacao.ts        mensagem de falha da ativação conforme a resposta
  dados/limites.ts         tamanho máximo dos textos (os mesmos da API)
  dados/formPessoa.ts      regras do formulário de pessoa (idade estimada datada, nome opcional)
  dados/idade.ts           idade e totais calculados na hora, datas como AAAA-MM-DD sem Date
  dados/revisao.ts         o que impede salvar (só: sem responsável ou sem ninguém na casa)
  dados/envio.ts           textos das telas de envio (nunca repassa erro cru)
  dados/meusCadastros.ts   selo e ordenação da lista de enviados
  dados/devolvido.ts       motivo da devolução e se dá para corrigir
  sessao/sessao.tsx        contexto de ativação/PIN (SecureStore)
  testes/sqliteEmNode.ts   expo-sqlite falso sobre node:sqlite, só para testes
  testes/acessibilidade.ts ajudantes dos testes de tela (busca por papel e nome acessível)
  __tests__/acessibilidade/ testes de tela: ativação e PIN, pré-cadastro, envio
docs/                      DEPLOY-APK.md, gerar-apk.md, instalacao/ (guia com prints para a agente), decisoes/
scripts/conferir-apk.mjs   confere perfil, URL https e rotas da API publicada antes de gastar build
```

Padrão do projeto: **a regra de cada tela fica em `src/dados/*.ts`, sem
React, e é testada em `src/dados/__tests__/`**. A tela só compõe componentes e
chama essas funções. Ao criar uma tela com lógica, siga o mesmo corte.

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
quando o APK atualiza. Versão atual controlada via `PRAGMA user_version`; hoje
são 3 passos (tabelas iniciais, lista de comunidades, sexo no formato do enum
da API), então o próximo é o passo 4.

O que o app guarda por pessoa: nome, `cadastroIncompleto`, sexo, data de
nascimento, `idadeEstimada` + `idadeEstimadaEm` e ordem. Parentesco, série,
roupa e calçado **não** são coletados aqui: quem revisa os preenche na aprovação.

### Design system

`src/design/tokens.ts` e `componentes.tsx` existem porque quem usa o app está
em pé, no sol, com uma mão, e pode ser interrompida a qualquer momento: alvo
de toque nunca abaixo de `ALVO_MINIMO` (56px), corpo de texto nunca abaixo de
16. Toda tela nova deve compor os componentes existentes (`Botao`, `Campo`,
`Marcar`, `Destaque`, `ItemLista`, `Opcoes`, `Progresso`, `Barra`, `Selo`,
`Aviso`) em vez de estilo solto — se faltar uma
variante, acrescente-a em `componentes.tsx`.

Acessibilidade (TalkBack): título de tela é `<Titulo>` (cabeçalho); estado que
muda sem toque da agente (erro, fim de envio, tela que aparece sozinha) é
falado com `useAnunciar` — `Aviso tom="erro"` e o `erro` do `Campo` já falam
sozinhos. Texto branco só sobre `laranjaBotao`/`verdeBotao`, borda de controle
em `bordaControle`. Os testes de tela em `src/__tests__/acessibilidade/`
procuram tudo por papel e nome acessível.

## Estado do projeto

O fluxo completo existe: ativação, PIN, cadastro em três passos, fila, envio
(com telas de progresso e sem internet), lista de enviados e tela de devolvido.
Há testes para toda a camada `src/dados/`, inclusive
`perdaDeDados.test.ts` ("os quatro jeitos de perder dado"). O `console.*` é
proibido no lint.

**Resposta da associação:** depois do envio, `sincronizar()` consulta
`GET /api/pre-cadastros/situacao` (só id, situação e motivo, só desta agente —
ADR-0002 da API) e muda o selo local: `APROVADO` → `ACEITO`, `DEVOLVIDO` →
`DEVOLVIDO` com o motivo. Cuidado com o nome: no `POST /api/pre-cadastros`, a
resposta `ACEITO` significa "recebido pelo servidor" (o app marca `ENVIADO`),
não "aprovado". Recusas permanentes não ficam em loop: 400 vira `DEVOLVIDO`
local com `MOTIVO_RECUSA`; 401/403 para o envio e leva à tela `sem-acesso`,
que desativa o aparelho (o token, não a fila) para ativar com código novo.

**URL de produção:** o perfil `apk` do `eas.json` aponta para
`https://cadastro-familias-api.onrender.com` (`EXPO_PUBLIC_API_URL`); o
`app.config.js` recusa o build de release se deixar de ser uma URL `https://`
real. Se a API mudar de endereço, troque ali e gere outro APK. Quando o envio recebe 401/403 (token recusado), a tela `sem-acesso` leva a ativar
de novo sem perder a fila. A agente pode apagar um cadastro devolvido na tela
`cadastro/devolvido`.

Distribuição: projeto EAS `@swetonyancelmo/cadastro-familias-app`, com
keystore já gerada e `expo-updates` configurado (não usar `eas update`: ele
não lê o `env` do `eas.json`). Passo a passo de build e distribuição em
`docs/DEPLOY-APK.md`; o guia com prints para a agente em
`docs/instalacao/instalar-no-celular.md`.

Protótipo: [Figma do app](https://www.figma.com/design/SA3REA1kBhYYeiJf6dxH1J)

## Skills

Em `.claude/skills/`: `nova-tela-app`, `migracao-sqlite-app`, `gerar-apk` e
`preparar-pr-app`. Mudança no que o app envia à API: skill
`mudanca-de-contrato`, na pasta que agrupa os três repositórios.
