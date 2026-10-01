/**
 * Lê o app.json e deixa a URL da API vir de EXPO_PUBLIC_API_URL (arquivo .env,
 * que não é commitado). Assim cada pessoa aponta o Expo Go para a API da
 * própria máquina sem mexer no app.json — e sem commitar o IP da rede de casa.
 *
 * Sem a variável, vale o `extra.apiUrl` do app.json (a URL de produção, com
 * https). Para o APK, ver docs/gerar-apk.md.
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || config.extra.apiUrl,
  },
});
