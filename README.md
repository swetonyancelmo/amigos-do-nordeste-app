# cadastro-familias-app

Aplicativo da agente comunitária de saúde para **pré-cadastro de famílias em
campo**, offline, do projeto da Associação Amigos do Nordeste.

React Native com Expo · SQLite local · distribuição por APK.

---

## O que este repositório contém hoje

| Pronto | Onde |
|---|---|
| Projeto Expo configurado, com build de APK e `expo-updates` | `app.json`, `eas.json` |
| Tokens de design e componentes | `src/design/` |
| Banco local SQLite com migrações versionadas | `src/dados/banco.ts` |
| Fila de saída: salvar, listar, marcar situação | `src/dados/fila.ts` |
| Lista de comunidades guardada offline | `src/dados/comunidades.ts` |
| Envio item a item com idempotência | `src/dados/sincronizar.ts`, `app/enviando.tsx`, `app/sem-internet.tsx` |
| Cliente HTTP com token do aparelho | `src/dados/api.ts` |
| Ativação por código de convite e trava por PIN | `src/sessao/`, `app/ativar.tsx`, `app/pin.tsx` |
| Tela inicial com o contador da fila | `app/inicio.tsx` |
| Cadastro em três passos: família, pessoas, revisar | `app/cadastro/` |
| Meus cadastros e cadastro devolvido | `app/enviados.tsx`, `app/cadastro/devolvido.tsx` |
| Telas de "envio sem internet" e "celular sem acesso" (código reemitido) | `app/sem-internet.tsx`, `app/sem-acesso.tsx` |
| Testes da camada de dados e de acessibilidade das telas | `src/dados/__tests__/`, `src/__tests__/acessibilidade/` |

Depois de enviar (ou pelo botão "Ver se a associação já respondeu" em Meus
cadastros), o app consulta `GET /api/pre-cadastros/situacao`: o aprovado vira
`ACEITO` e o devolvido vira `DEVOLVIDO`, com o motivo, pronto para "corrigir e
reenviar". Se o servidor recusa o token (código reemitido pela associação), a
tela "Este celular perdeu o acesso" leva a ativar de novo, sem perder a fila.

---

## Rodar

```bash
npm install
npx expo start          # abre no Expo Go, lendo o QR code
npm run lint
npx jest                # ou `npm run teste` (não existe script "test")
```

Não há CI neste repositório: rode o lint e os testes antes de abrir o PR.

Para apontar para a API local, copie `.env.example` para `.env` e ponha o IP
da máquina na rede em `EXPO_PUBLIC_API_URL` (nunca `localhost`: no celular é o
próprio celular). Reinicie o `npx expo start` depois de mudar. `http://` só
funciona no Expo Go; o APK de release exige a API em `https://`, que fica no
`env` do perfil `apk` do `eas.json` (o `app.config.js` recusa o build sem ela).

O código de convite sai do painel (**Agentes → Nova agente**; na API, `POST /api/agentes`; ou o
`semear.sh` da skill `rodar-api-local` do repositório da API). O código tem 6
dígitos e vale uma vez; "Gerar novo código" no painel desliga o celular anterior.

**URL da API no APK:** `build.apk.env.EXPO_PUBLIC_API_URL` no `eas.json` já aponta
para `https://cadastro-familias-api.onrender.com`. Se a API mudar de endereço,
troque ali e gere outro APK.

## Gerar o APK

Siga **[`docs/DEPLOY-APK.md`](docs/DEPLOY-APK.md)**: conta no EAS, keystore,
checagem, build, teste de ponta a ponta, link de download e o texto que vai
para a agente. Em resumo:

```bash
npm install -g eas-cli && eas login
npm run conferir-apk    # não gasta build: confere perfil, URL https e as rotas da API publicada
npm run apk             # roda a conferência de novo e, se passar, o eas build
```

O perfil `apk` do `eas.json` força `buildType: apk` (um `.aab` não instala no
celular) e sobe o `versionCode` sozinho a cada build. O plano gratuito do EAS
tem 15 builds Android por mês e fila que passa de uma hora: gere com
antecedência. O passo a passo com prints para a agente está em
`docs/instalacao/instalar-no-celular.md`.

---

## As quatro decisões que definem este app

Estão detalhadas em `docs/decisoes/ADR-0001-pre-cadastro-offline.md`.

**1. Só envia, nunca baixa.** O aparelho jamais recebe a base de famílias. É uma
fila de saída, não sincronização de duas vias. Some a metade difícil do problema
(resolução de conflito) e nenhum dado de família sai do servidor para um celular.

**2. Vai para uma fila de aprovação.** O que a agente manda vira um "chamado" no
sistema web. A dona revisa, completa e aprova — só então vira família na base.
Mantém a decisão da primeira reunião: uma pessoa decide o que entra.

**3. Token do aparelho no servidor, PIN só no celular.** O código de convite
troca por um token de longa duração guardado no SecureStore. O PIN de 4 dígitos
é local e nunca vai para o servidor — se fosse senha de conta, a agente
precisaria de internet para abrir o app, que é justamente o que não pode.

**4. Formulário curto.** Responsável, contato, comunidade, ponto de referência e
quem mora na casa. Moradia, saneamento e renda a associação completa na
aprovação. Formulário longo em pé, no sol, com uma mão, é formulário abandonado
pela metade.

---

## Regras que não podem ser esquecidas

**O `id` nasce no aparelho.** Cada pré-cadastro recebe um UUID local que viaja
para o servidor e serve de chave de idempotência. É o que impede família
duplicada quando a agente toca em "enviar" duas vezes ou a internet cai depois
de o servidor já ter gravado. Nunca deixar o servidor gerar esse id.

**Data de nascimento nunca é obrigatória.** Quando ninguém sabe, grava-se
`idadeEstimada` **e** `idadeEstimadaEm`. Guardando quando a idade foi estimada,
o sistema a envelhece sozinho. Sem a data de referência, a estimativa não vale
nada — é a mesma regra da issue #4 do backend.

**Pessoa sem nome pode ser salva.** A lista de papel da associação tem dezenas
de "filha de Jane". Marca-se `cadastroIncompleto` e segue. Travar a digitação é
o oposto do que este app existe para fazer.

**Nada é apagado ao enviar.** O registro muda de situação e continua no celular,
para a agente conseguir olhar depois. Só some quando ela apaga.

**Nenhum dado real de família em repositório, teste, print ou grupo.**

---

## Estrutura

```
app/                      rotas (expo-router)
  _layout.tsx             provedor de sessão
  index.tsx               porta de entrada, decide para onde ir
  ativar.tsx              código de convite
  pin.tsx                 criar e digitar o PIN
  inicio.tsx              contador da fila e atalhos
  cadastro/familia.tsx    passo 1: responsável, contato, comunidade
  cadastro/pessoas.tsx    passo 2: quem mora na casa
  cadastro/pessoa.tsx     formulário de uma pessoa
  cadastro/revisar.tsx    passo 3: conferir e salvar
  cadastro/devolvido.tsx  motivo da devolução e reenvio
  enviados.tsx            meus cadastros
  enviando.tsx            progresso do envio
  sem-internet.tsx        envio sem rede
  sem-acesso.tsx          token recusado: ativar de novo sem perder a fila
src/
  design/tokens.ts        cores, espaçamento, escala de texto, alvo mínimo
  design/componentes.tsx  Botao, Campo, Opcoes, Progresso, Selo, Aviso…
  dados/banco.ts          SQLite e migrações
  dados/fila.ts           escrita e leitura da fila de saída
  dados/gravador.ts       gravação do rascunho sem escritas fora de ordem
  dados/comunidades.ts    lista de comunidades offline
  dados/sincronizar.ts    envio com idempotência
  dados/api.ts            cliente HTTP
  dados/tipos.ts          tipos compartilhados
  dados/*.ts              regras de cada tela, testáveis sem React
  dados/__tests__/        testes de regra (jest)
  __tests__/acessibilidade/  testes de tela (TalkBack: papel e nome acessível)
  sessao/sessao.tsx       ativação e trava por PIN
  testes/sqliteEmNode.ts  SQLite falso para os testes
```

Protótipo: [Figma do app](https://www.figma.com/design/SA3REA1kBhYYeiJf6dxH1J)
