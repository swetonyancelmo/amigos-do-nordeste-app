/**
 * O que a tela `ativar` diz quando a troca do código pelo token não dá certo,
 * separado da tela para poder ser testado sem React.
 *
 * Cada resposta pede uma atitude diferente da agente: conferir os números,
 * esperar um minuto ou procurar sinal. "Código não encontrado" para tudo fazia
 * ela repetir o mesmo código até esbarrar no limite de tentativas.
 */
import { ErroDaApi } from './api';
import { SemInternet } from './sincronizar';

export function mensagemFalhaAtivacao(erro: unknown): string {
  if (erro instanceof SemInternet) {
    return 'Você precisa de internet só nesta primeira vez. Tente perto de um sinal.';
  }
  if (erro instanceof ErroDaApi) {
    // 401: código inexistente ou já usado (o servidor não diz qual, de propósito)
    if (erro.status === 401 || erro.status === 400) {
      return 'Código não encontrado ou já usado. Confira os números com a associação.';
    }
    if (erro.status === 429) {
      return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
    }
  }
  return 'Não deu para ativar agora. Tente de novo daqui a pouco.';
}
