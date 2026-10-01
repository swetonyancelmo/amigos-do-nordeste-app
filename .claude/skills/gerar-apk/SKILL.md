---
name: gerar-apk
description: Conduz a geração e a entrega do APK do app de pré-cadastro pelo EAS Build (perfil apk), com o checklist que evita APK que não ativa, que não instala por cima ou que faz a agente perder cadastros não enviados (URL da API, versionCode, keystore, npm ci). Use quando o usuário quiser gerar APK, build Android, "mandar o app para a agente", publicar versão nova, atualizar o app no celular, ou quando o build do EAS falhar.
---

# Gerar e entregar o APK

A referência completa é `docs/gerar-apk.md`, e o passo a passo para a agente
está em `docs/instalacao/instalar-no-celular.md`. Esta skill é o roteiro.
Gerar o build é uma ação externa (fila no EAS, conta do projeto): confirme com
o usuário antes de rodar `eas build`.

## Antes de gerar: verifique você mesmo

```bash
git status --short && git branch --show-current     # main, sem nada fora do commit
jq '.expo.extra.apiUrl, .expo.android.versionCode, .expo.version' app.json
npm ci --dry-run                                     # o EAS roda npm ci, mais rígido que o install local
npx jest && npm run lint
```

- **`extra.apiUrl`** precisa ser a API de produção com `https://`. O valor de
  exemplo (`cadastro-familias-api.exemplo.com.br`) gera um APK que instala,
  abre e não ativa. `http://` é bloqueado em build de release.
- **`android.versionCode`** precisa ser **maior** que o do APK que já está nos
  celulares, senão o Android recusa instalar por cima. Suba `version` junto
  (`0.1.0` → `0.1.1`).
- `react` e `react-dom` precisam ter a mesma versão fixada no `package.json`.

Aponte ao usuário qualquer item que não passe, antes de gerar.

## Gerar

```bash
npm install -g eas-cli      # o pacote é eas-cli; `npx eas` não resolve
eas login                   # conta com acesso a @swetonyancelmo/cadastro-familias-app
npm run apk                 # = eas build -p android --profile apk
```

- O perfil `apk` força `buildType: apk`. Um `.aab` não instala no celular.
- Se o EAS perguntar se deve **gerar uma keystore nova**, pare: a conta está
  errada. Keystore diferente obriga a desinstalar o app, e desinstalar apaga o
  SQLite com os cadastros não enviados.
- Erro `request to https://api.expo.dev/graphql failed` sem motivo é
  instabilidade de rede; tente de novo.
- O plano gratuito tem fila que pode passar de uma hora. Não gere na véspera
  da entrega.

## Entregar

- Mande o **link** do build (abre no Chrome) e, **em outra mensagem**, o
  código de convite da agente (criado hoje direto na tabela `agente` da API).
- Links do EAS expiram. Para durar, baixe o `.apk` e publique num lugar da
  associação.
- Antes de pedir para a agente atualizar, confirme que a fila dela está vazia
  (tudo enviado).
- Registre na tabela de testes de `docs/gerar-apk.md`: data, aparelho,
  versão, quem testou e onde travou.

## Atualização sem APK novo

O projeto tem `expo-updates` com `runtimeVersion` pela versão do app. Mudança
só de JavaScript pode ir por update over-the-air no canal `apk`. Mudança de
dependência nativa, de permissão ou de `app.json` exige APK novo. Mudança de
schema SQLite pode ir por OTA (os passos rodam na abertura), mas teste antes
num aparelho com dados.
