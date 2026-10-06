# Gerar o APK

Este guia foi substituído por **[`DEPLOY-APK.md`](DEPLOY-APK.md)**, que cobre
do login no EAS à instalação no celular da agente, com a checagem antes do
build, o teste de ponta a ponta e o que fazer quando der errado.

O que mudou em relação à versão anterior deste arquivo:

- a URL da API **não fica mais no `app.json`**: vai no `env` do perfil `apk`
  do `eas.json`, e o `app.config.js` recusa montar o build sem `https://`;
- o `android.versionCode` **sobe sozinho** a cada build
  (`appVersionSource: "remote"`); não se edita mais à mão;
- `npm run conferir-apk` faz a checagem antes de gastar um build da cota.
