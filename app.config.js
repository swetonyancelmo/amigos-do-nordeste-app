/**
 * Completa o app.json com a URL da API, que muda conforme o ambiente.
 *
 * Por que assim, e não com a URL escrita no app.json:
 *
 *   - Desenvolvimento (Expo Go): a URL vem do .env (EXPO_PUBLIC_API_URL com o
 *     IP da máquina na rede). O .env não é commitado, então ninguém commita o
 *     IP da rede de casa, e o .env nem sobe para o servidor do EAS.
 *   - APK (perfil "apk" do eas.json): a URL de produção fica no campo `env`
 *     do perfil, versionada junto com o resto da configuração do build. Não é
 *     segredo: ela vai dentro do APK e qualquer um a extrai de lá.
 *
 * Preferimos o `env` do eas.json às variáveis cadastradas no site do EAS
 * porque fica no repositório, revisado em PR, e não depende de quem tem
 * acesso ao painel. Preferimos este arquivo a dois app.json porque a regra
 * fica num lugar só.
 *
 * A trava: o perfil "apk" também define APP_BUILD_RELEASE=1. Com ela, este
 * arquivo RECUSA montar a configuração se a URL não for https:// de verdade.
 * O Android bloqueia tráfego sem TLS num build de release, e o sintoma é o app
 * não conectar sem dizer por quê; a URL de exemplo gera um APK que instala e
 * não ativa. Os dois casos custariam um build da cota (são 15 por mês).
 * `npm run conferir-apk` roda esta mesma verificação antes de disparar.
 *
 * Sem URL nenhuma (Expo Go sem .env), `extra.apiUrl` fica vazio e o cliente
 * HTTP cai em http://localhost:3333 (src/dados/api.ts).
 *
 * Passo a passo completo: docs/DEPLOY-APK.md.
 */
function urlDaApi() {
  const url = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/+$/, '');
  if (process.env.APP_BUILD_RELEASE !== '1') return url || undefined;

  if (!/^https:\/\/[^/\s]+\.[^/\s]+/.test(url) || /exemplo|PREENCHER|localhost|192\.168\./i.test(url)) {
    throw new Error(
      `Build de release sem URL de produção válida da API (EXPO_PUBLIC_API_URL="${url}"). ` +
        'Preencha build.apk.env.EXPO_PUBLIC_API_URL no eas.json com a URL https:// publicada, ' +
        'sem barra no fim. Ver docs/DEPLOY-APK.md.',
    );
  }
  return url;
}

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl: urlDaApi(),
  },
});
