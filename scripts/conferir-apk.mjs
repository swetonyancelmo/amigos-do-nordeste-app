/**
 * Confere, ANTES de gastar um build da cota do EAS, o que faria o APK sair
 * inútil: perfil gerando .aab, URL da API errada ou sem https, API fora do ar
 * ou sem as rotas que o app chama. Uso: `npm run conferir-apk`.
 *
 * Monta a configuração do mesmo jeito que o EAS vai montar (app.json +
 * app.config.js + o `env` do perfil "apk" do eas.json) e só fala com a API
 * por rotas públicas: /api/saude e o OpenAPI (/v3/api-docs). Não ativa
 * código, não envia nada, não mexe em dado nenhum.
 *
 * Passo a passo: docs/DEPLOY-APK.md.
 */
/* eslint-disable no-console -- script de terminal; não toca em dado de família */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** As rotas que o app chama (src/dados/*.ts e app/ativar.tsx). */
const ROTAS_DO_APP = [
  ['post', '/api/agentes/ativar'],
  ['get', '/api/comunidades/opcoes'],
  ['post', '/api/pre-cadastros'],
  ['get', '/api/pre-cadastros/situacao'],
];

/** O Render gratuito leva cerca de um minuto para acordar a API. */
const ESPERA_API_MS = 120_000;

let falhas = 0;
const ok = msg => console.log(`  ✔ ${msg}`);
const aviso = msg => console.log(`  ! ${msg}`);
const falha = msg => {
  falhas++;
  console.log(`  ✖ ${msg}`);
};

function conferirPerfil() {
  console.log('\nPerfil "apk" do eas.json');
  const eas = JSON.parse(readFileSync('eas.json', 'utf8'));
  const perfil = eas.build?.apk;
  if (!perfil) {
    falha('não existe build.apk no eas.json');
    return null;
  }
  if (perfil.android?.buildType === 'apk') ok('buildType "apk" (gera .apk, não .aab)');
  else falha('android.buildType não é "apk": o EAS geraria .aab, que não instala no celular');

  if (eas.cli?.appVersionSource === 'remote' && perfil.autoIncrement === true) {
    ok('versionCode sobe sozinho a cada build (appVersionSource remote + autoIncrement)');
  } else {
    falha('versionCode não é automático: confira cli.appVersionSource e build.apk.autoIncrement');
  }
  return perfil;
}

function conferirConfig(perfil) {
  console.log('\nConfiguração que vai para o APK');
  Object.assign(process.env, perfil.env ?? {});
  const appJson = JSON.parse(readFileSync('app.json', 'utf8')).expo;
  let config;
  try {
    config = require('../app.config.js')({ config: appJson });
  } catch (erro) {
    falha(erro.message);
    return null;
  }
  ok(`nome na tela do celular: "${config.name}"`);
  ok(`pacote Android: ${config.android?.package} (nunca muda depois da primeira instalação)`);
  ok(`versão visível: ${config.version}`);
  ok(`API: ${config.extra.apiUrl}`);
  return config.extra.apiUrl;
}

async function buscar(url, tempo) {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), tempo);
  try {
    return await fetch(url, { signal: controle.signal });
  } finally {
    clearTimeout(relogio);
  }
}

async function conferirApi(base) {
  console.log('\nAPI publicada (pode levar até 2 minutos se estiver hibernando)');
  try {
    const r = await buscar(`${base}/api/saude`, ESPERA_API_MS);
    const corpo = await r.json().catch(() => null);
    if (r.ok && corpo?.ok === true) ok('GET /api/saude respondeu {"ok": true}');
    else {
      falha(`GET /api/saude respondeu ${r.status}${r.headers.get('x-render-routing') === 'no-server' ? ' (o Render diz que não há serviço neste endereço)' : ''}`);
      return;
    }
  } catch (erro) {
    falha(`GET /api/saude não respondeu: ${erro.name === 'AbortError' ? 'tempo esgotado' : erro.message}`);
    return;
  }

  let docs;
  try {
    const r = await buscar(`${base}/v3/api-docs`, 30_000);
    docs = await r.json();
  } catch {
    falha('não consegui ler /v3/api-docs para conferir as rotas');
    return;
  }
  for (const [metodo, rota] of ROTAS_DO_APP) {
    if (docs.paths?.[rota]?.[metodo]) ok(`${metodo.toUpperCase()} ${rota}`);
    else falha(`${metodo.toUpperCase()} ${rota} não existe na API publicada`);
  }
}

function conferirGit() {
  console.log('\nRepositório');
  try {
    const ramo = execSync('git branch --show-current').toString().trim();
    const sujo = execSync('git status --porcelain').toString().trim();
    if (ramo === 'main') ok('na main');
    else aviso(`no branch "${ramo}": o APK distribuído deve sair da main`);
    if (!sujo) ok('sem mudança fora de commit');
    else aviso('há arquivos modificados fora de commit: o EAS envia o que está na pasta');
  } catch {
    aviso('não consegui ler o git');
  }
}

const perfil = conferirPerfil();
const url = perfil && conferirConfig(perfil);
if (url) await conferirApi(url);
conferirGit();

console.log(
  falhas === 0
    ? '\nTudo certo para disparar o build. Siga docs/DEPLOY-APK.md, passo 3.\n'
    : `\n${falhas} problema(s). NÃO dispare o build: cada tentativa gasta uma da cota do mês.\n`,
);
process.exit(falhas === 0 ? 0 : 1);
