---
name: gerar-apk
description: Conduz a geração e a entrega do APK do app de pré-cadastro pelo EAS Build (perfil apk), com o checklist que evita APK que não ativa, que não instala por cima ou que faz a agente perder cadastros não enviados (URL da API, versionCode, keystore, npm ci). Use quando o usuário quiser gerar APK, build Android, "mandar o app para a agente", publicar versão nova, atualizar o app no celular, ou quando o build do EAS falhar.
---

# Gerar e entregar o APK

A referência completa é `docs/DEPLOY-APK.md` (inclui a seção que vai para a
agente); a versão com prints para ela está em
`docs/instalacao/instalar-no-celular.md`. Esta skill é o roteiro.

Gerar o build é uma ação externa e **gasta uma das 15 builds Android do mês**
do plano gratuito (fila que passa de 90 minutos): confirme com o usuário antes
de rodar `eas build` / `npm run apk`.

## Antes de gerar: verifique você mesmo

```bash
git status --short && git branch --show-current     # main, sem nada fora do commit
npm ci && npx jest && npx tsc --noEmit && npm run lint
npx expo-doctor                                     # patch atrás em pacotes expo-* não bloqueia; o resto sim
npm run conferir-apk                                # perfil, URL https, /api/saude e as 4 rotas no Swagger publicado
```

- A URL de produção fica em `build.apk.env.EXPO_PUBLIC_API_URL` no
  `eas.json`. Com `APP_BUILD_RELEASE=1`, o `app.config.js` recusa montar o
  app sem `https://` real; nada de URL no `app.json`.
- O `versionCode` sobe sozinho (`cli.appVersionSource: "remote"` +
  `autoIncrement`). O que se sobe à mão é a `version` (`0.1.1` → `0.1.2`).
  `eas build:version:get -p android` mostra o atual.
- `react` e `react-dom` precisam ter a mesma versão fixada no `package.json`.

Aponte ao usuário qualquer item que não passe, antes de gerar. Se
`conferir-apk` falhar na API, **não gere**: o APK travaria na ativação.

## Gerar

```bash
npm install -g eas-cli      # o pacote é eas-cli; `npx eas` não resolve
eas login                   # conta com acesso a @swetonyancelmo/cadastro-familias-app
npm run apk                 # conferir-apk + eas build -p android --profile apk
```

- Se o EAS perguntar se deve **gerar uma keystore nova**, pare: a conta está
  errada. Keystore diferente obriga a desinstalar o app, e desinstalar apaga o
  SQLite com os cadastros não enviados.
- Erro `request to https://api.expo.dev/graphql failed` sem motivo é
  instabilidade de rede; tente de novo.

## Entregar

- Teste de ponta a ponta do passo 6 do `DEPLOY-APK.md` num Android de verdade,
  com dado inventado, **antes** de qualquer link sair do time.
- Publicação: release no repositório público só de downloads
  (`amigos-do-nordeste-apk`), arquivo sempre `cadastro-amigos-do-nordeste.apk`,
  link fixo `…/releases/latest/download/cadastro-amigos-do-nordeste.apk`.
- O código de convite sai do painel (**Agentes → Nova agente**), vai em
  mensagem separada do link e vale uma vez.
- Antes de pedir para a agente atualizar, a fila dela vazia (tudo enviado).

## Atualização sem APK

Não use `eas update` por enquanto: ele não lê o `env` do perfil do `eas.json`,
e a atualização sairia sem a URL da API. Ver "Como atualizar o app depois" no
`DEPLOY-APK.md`.
