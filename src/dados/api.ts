/**
 * Cliente HTTP.
 *
 * Autenticação do app é diferente da do sistema web, de propósito:
 *
 *   - O TOKEN DO APARELHO é o que o servidor conhece. Nasce quando a agente
 *     digita o código de convite, é guardado no SecureStore e vale por muito
 *     tempo. É ele que vai no Authorization.
 *
 *   - O PIN de 4 dígitos é LOCAL. Ele nunca vai para o servidor e não é senha
 *     de conta: serve para o celular na mão de outra pessoa não abrir o app.
 *
 * Misturar os dois é o erro clássico aqui. Se o PIN fosse a senha do servidor,
 * ela precisaria de internet para entrar no app — que é exatamente o que não
 * pode acontecer.
 */
import Constants from 'expo-constants';
import * as Network from 'expo-network';
import { lerTokenDoAparelho } from '@/sessao/sessao';
import { SemInternet } from './sincronizar';

const BASE: string =
  (Constants.expoConfig?.extra?.apiUrl as string) ?? 'http://localhost:3333';

const TEMPO_LIMITE = 20_000;

export async function apiPost<T>(rota: string, corpo: unknown): Promise<T> {
  await exigirInternet();

  const token = await lerTokenDoAparelho();
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE);

  try {
    const resposta = await fetch(BASE + rota, {
      method: 'POST',
      signal: controle.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(corpo),
    });

    if (!resposta.ok) {
      const texto = await resposta.text().catch(() => '');
      throw new ErroDaApi(resposta.status, texto || 'Erro ao falar com o servidor.');
    }
    return (await resposta.json()) as T;
  } catch (erro) {
    // fetch abortado por tempo limite conta como falta de rede para o usuário:
    // a mensagem "sem internet" é mais útil do que "tempo esgotado".
    if (erro instanceof DOMException && erro.name === 'AbortError') throw new SemInternet();
    throw erro;
  } finally {
    clearTimeout(relogio);
  }
}

async function exigirInternet() {
  const estado = await Network.getNetworkStateAsync();
  if (!estado.isConnected || estado.isInternetReachable === false) {
    throw new SemInternet();
  }
}

export class ErroDaApi extends Error {
  constructor(
    public readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = 'ErroDaApi';
  }
}
