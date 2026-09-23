import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Aviso, Barra, Botao } from '@/design/componentes';
import { cores, esp, texto } from '@/design/tokens';
import { contarPendentes } from '@/dados/fila';
import { desfechoDoEnvio, textoProgresso, type Desfecho } from '@/dados/envio';
import { sincronizar } from '@/dados/sincronizar';

type Estado =
  | { fase: 'enviando'; feitos: number; total: number | null }
  | { fase: 'fim'; desfecho: Extract<Desfecho, { tipo: 'fim' }> }
  | { fase: 'falhou' };

/**
 * Enviando: percorre a fila com `sincronizar()` e mostra "2 de 3 enviados"
 * pelo callback `aoProgredir`.
 *
 * O envio começa ao abrir a tela. Sem internet (antes ou no meio), troca para
 * a tela `sem-internet`; o que não foi continua PRONTO no banco — nada sai da
 * fila sem o servidor confirmar.
 *
 * Nenhum texto de erro chega à agente: qualquer falha inesperada vira a mesma
 * mensagem de "continua guardado".
 */
export default function Enviando() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>({ fase: 'enviando', feitos: 0, total: null });

  // `montado` e `comecou` separados: o efeito pode rodar duas vezes em
  // desenvolvimento, mas o envio só pode começar uma.
  const montado = useRef(false);
  const comecou = useRef(false);

  useEffect(() => {
    montado.current = true;

    async function enviar() {
      try {
        // o total aparece antes do primeiro cadastro terminar: "0 de 3"
        const total = await contarPendentes();
        if (montado.current) setEstado({ fase: 'enviando', feitos: 0, total });

        const resumo = await sincronizar((feitos, t) => {
          if (montado.current) setEstado({ fase: 'enviando', feitos, total: t });
        });
        if (!montado.current) return;

        const d = desfechoDoEnvio(resumo);
        if (d.tipo === 'sem-internet') {
          router.replace({ pathname: '/sem-internet', params: { enviados: String(d.enviados) } });
        } else {
          setEstado({ fase: 'fim', desfecho: d });
        }
      } catch {
        if (montado.current) setEstado({ fase: 'falhou' });
      }
    }

    if (!comecou.current) {
      comecou.current = true;
      void enviar();
    }
    return () => {
      montado.current = false;
    };
  }, [router]);

  // O "voltar" do celular fica bloqueado enquanto envia. Sair no meio não
  // perderia nada, mas deixaria a agente sem saber o que foi.
  const enviando = estado.fase === 'enviando';
  useEffect(() => {
    if (!enviando) return;
    const s = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => s.remove();
  }, [enviando]);

  const voltar = () => router.dismissTo('/inicio');

  if (estado.fase === 'falhou') {
    return (
      <View style={e.tela}>
        <Text style={e.titulo}>Não deu para enviar agora</Text>
        <Aviso titulo="Nada se perdeu" tom="atencao">
          Seus cadastros continuam guardados no celular. Tente de novo daqui a pouco.
        </Aviso>
        <View style={e.rodape}>
          <Botao titulo="Tentar de novo" aoTocar={() => router.replace('/enviando')} />
          <Botao titulo="Voltar ao início" variante="contorno" aoTocar={voltar} />
        </View>
      </View>
    );
  }

  if (estado.fase === 'fim') {
    const { desfecho } = estado;
    return (
      <View style={e.tela}>
        <Text style={e.titulo}>{desfecho.titulo}</Text>
        <Aviso tom={desfecho.tom}>{desfecho.texto}</Aviso>
        <View style={e.rodape}>
          <Botao titulo="Voltar ao início" variante="confirmar" aoTocar={voltar} />
          <Botao titulo="Ver meus cadastros" variante="contorno" aoTocar={() => router.replace('/enviados')} />
        </View>
      </View>
    );
  }

  const { feitos, total } = estado;
  return (
    <View style={e.tela}>
      <ActivityIndicator color={cores.laranja} size="large" style={e.girando} />
      <Text style={e.titulo}>Enviando cadastros</Text>

      {total === null ? null : (
        <View style={e.progresso}>
          <Text style={e.contagem} accessibilityLiveRegion="polite">
            {textoProgresso(feitos, total)}
          </Text>
          <Barra feitos={feitos} total={total} rotulo={textoProgresso(feitos, total)} />
        </View>
      )}

      <Aviso titulo="Nada se perde" tom="calmo">
        Se a internet cair no meio, o que não foi continua guardado no celular. É só enviar de novo
        depois.
      </Aviso>
      <Text style={e.p}>Pode deixar o celular parado um instante.</Text>
    </View>
  );
}

const e = StyleSheet.create({
  tela: { flex: 1, padding: esp.lg, paddingTop: 60, gap: esp.md },
  girando: { alignSelf: 'flex-start' },
  titulo: { ...texto.titulo, color: cores.tinta },
  p: { ...texto.corpo, color: cores.apagado },
  progresso: { gap: esp.sm },
  contagem: { fontSize: 22, fontWeight: '700', color: cores.laranja },
  rodape: { marginTop: 'auto', gap: esp.md },
});
