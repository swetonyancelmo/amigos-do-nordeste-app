/**
 * O que as telas `enviando` e `sem-internet` dizem, separado da tela para
 * poder ser testado sem React.
 *
 * O tom importa tanto quanto a conta. Em campo a agente não tem a quem
 * perguntar, e o medo de perder o trabalho é o que faz alguém largar o app.
 * Por isso toda mensagem daqui:
 *   - diz que o que não foi continua guardado no celular;
 *   - nunca repassa texto de erro do servidor ou do aparelho.
 */
import type { ResumoSincronizacao } from './sincronizar';

/** "1 cadastro", "3 cadastros" */
export function cadastros(n: number): string {
  return n === 1 ? '1 cadastro' : `${n} cadastros`;
}

/** "2 de 3 enviados" — o número que a agente acompanha durante o envio. */
export function textoProgresso(feitos: number, total: number): string {
  return `${feitos} de ${total} ${total === 1 ? 'enviado' : 'enviados'}`;
}

export type Desfecho =
  | { tipo: 'sem-internet'; enviados: number }
  | { tipo: 'sem-acesso'; enviados: number }
  | { tipo: 'fim'; tom: 'calmo' | 'atencao'; titulo: string; texto: string };

/**
 * O que mudou do lado da associação e o que o servidor não aceitou. Vai no
 * fim do texto: "2 cadastros enviados. A associação aprovou 1."
 */
function novidades(r: ResumoSincronizacao): string {
  const partes: string[] = [];
  if (r.recusados > 0) {
    partes.push(
      `${cadastros(r.recusados)} ${r.recusados === 1 ? 'voltou' : 'voltaram'} para você corrigir antes de ` +
        'enviar de novo.',
    );
  }
  if (r.devolvidos > 0) {
    partes.push(`A associação devolveu ${cadastros(r.devolvidos)} para corrigir.`);
  }
  if (r.aprovados > 0) {
    partes.push(`A associação aprovou ${cadastros(r.aprovados)}.`);
  }
  if (r.recusados > 0 || r.devolvidos > 0) {
    partes.push('Veja em Meus cadastros.');
  }
  return partes.join(' ');
}

const juntar = (...textos: string[]) => textos.filter(t => t !== '').join(' ');

/**
 * O que mostrar quando `sincronizar()` termina.
 *
 * Sem internet e sem acesso vão para telas próprias; o resto fecha na própria
 * tela de envio. `JA_RECEBIDO` conta como enviado: para a agente, o cadastro chegou —
 * que o servidor já tivesse a cópia é detalhe da idempotência.
 */
export function desfechoDoEnvio(r: ResumoSincronizacao): Desfecho {
  const foram = r.enviados + r.jaRecebidos;

  if (r.semInternet) return { tipo: 'sem-internet', enviados: foram };
  if (r.semAcesso) return { tipo: 'sem-acesso', enviados: foram };

  const extra = novidades(r);
  const atencao = r.recusados > 0 || r.devolvidos > 0;

  if (r.comErro > 0) {
    const inicio =
      foram > 0 ? `${cadastros(foram)} ${foram === 1 ? 'foi' : 'foram'}. ` : '';
    return {
      tipo: 'fim',
      tom: 'atencao',
      titulo: `${cadastros(r.comErro)} não ${r.comErro === 1 ? 'foi' : 'foram'} desta vez`,
      texto: juntar(
        `${inicio}${r.comErro === 1 ? 'O que ficou continua guardado' : 'Os que ficaram continuam guardados'} ` +
          'no celular, nada se perdeu. Tente enviar de novo mais tarde.',
        extra,
      ),
    };
  }

  if (foram === 0) {
    if (extra !== '') {
      return { tipo: 'fim', tom: atencao ? 'atencao' : 'calmo', titulo: 'Novidades da associação', texto: extra };
    }
    return {
      tipo: 'fim',
      tom: 'calmo',
      titulo: 'Não havia nada para enviar',
      texto: 'Tudo o que você cadastrou já tinha sido enviado.',
    };
  }

  return {
    tipo: 'fim',
    tom: atencao ? 'atencao' : 'calmo',
    titulo: foram === 1 ? '1 cadastro enviado' : `${foram} cadastros enviados`,
    texto: juntar(
      'Agora a associação confere e aprova. Eles continuam no celular: ' +
        'você acompanha em Meus cadastros.',
      extra,
    ),
  };
}

/** O corpo da tela de sem internet. `guardados` vem do banco, não da memória. */
export function textoSemInternet(guardados: number, enviados: number): string {
  const antes =
    enviados > 0
      ? `${cadastros(enviados)} ${enviados === 1 ? 'chegou' : 'chegaram'} antes do sinal cair. `
      : '';
  const resto =
    guardados === 0
      ? 'Não sobrou nada esperando envio.'
      : `${guardados === 1 ? 'Seu cadastro continua guardado' : `Seus ${guardados} cadastros continuam guardados`} ` +
        'no celular, nada se perdeu.';
  return antes + resto;
}

/** O corpo da tela de sem acesso. Mesmo tom da de sem internet: primeiro, nada se perdeu. */
export function textoSemAcesso(guardados: number, enviados: number): string {
  const antes =
    enviados > 0 ? `${cadastros(enviados)} ${enviados === 1 ? 'chegou' : 'chegaram'} antes. ` : '';
  const resto =
    guardados === 0
      ? 'Não sobrou nada esperando envio.'
      : guardados === 1
        ? 'Seu cadastro continua guardado no celular e vai quando o celular for ativado de novo.'
        : `Seus ${guardados} cadastros continuam guardados no celular e vão quando o celular for ativado de novo.`;
  return antes + resto;
}
