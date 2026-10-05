import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Aviso, Barra, Botao, Titulo, useAnunciar } from '@/design/componentes';
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
 * a tela `sem-internet`; sem acesso (token recusado), para `sem-acesso`. O que
 * não foi continua PRONTO no banco — nada sai da fila sem o servidor
 * confirmar. Depois do envio, a mesma ida ao servidor traz o que a associação
 * aprovou ou devolveu.
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
        } else if (d.tipo === 'sem-acesso') {
          router.replace({ pathname: '/sem-acesso', params: { enviados: String(d.enviados) } });
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

  // Cada fase troca a tela inteira; sem anúncio, quem usa TalkBack não sabe
  // que o envio começou, terminou ou falhou.
  useAnunciar(
    estado.fase === 'enviando'
      ? 'Enviando cadastros'
      : estado.fase === 'fim'
        ? `${estado.desfecho.titulo}. ${estado.desfecho.texto}`
        : 'Não deu para enviar agora. Seus cadastros continuam guardados no celular.',
  );

  const voltar = () => router.dismissTo('/inicio');

  if (estado.fase === 'falhou') {
    return (
      <ScrollView contentContainerStyle={e.tela}>
        <Titulo>Não deu para enviar agora</Titulo>
        <Aviso titulo="Nada se perdeu" tom="atencao">
          Seus cadastros continuam guardados no celular. Tente de novo daqui a pouco.
        </Aviso>
        <View style={e.rodape}>
          <Botao titulo="Tentar de novo" aoTocar={() => router.replace('/enviando')} />
          <Botao titulo="Voltar ao início" variante="contorno" aoTocar={voltar} />
        </View>
      </ScrollView>
    );
  }

  if (estado.fase === 'fim') {
    const { desfecho } = estado;
    return (
      <ScrollView contentContainerStyle={e.tela}>
        <Titulo>{desfecho.titulo}</Titulo>
        <Aviso tom={desfecho.tom}>{desfecho.texto}</Aviso>
        <View style={e.rodape}>
          <Botao titulo="Voltar ao início" variante="confirmar" aoTocar={voltar} />
          <Botao titulo="Ver meus cadastros" variante="contorno" aoTocar={() => router.replace('/enviados')} />
        </View>
      </ScrollView>
    );
  }

  const { feitos, total } = estado;
  return (
    <ScrollView contentContainerStyle={e.tela}>
      <ActivityIndicator
        color={cores.laranja}
        size="large"
        style={e.girando}
        accessibilityLabel="Enviando"
      />
      <Titulo>Enviando cadastros</Titulo>

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
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flexGrow: 1, padding: esp.lg, paddingTop: 60, gap: esp.md },
  girando: { alignSelf: 'flex-start' },
  p: { ...texto.corpo, color: cores.apagado },
  progresso: { gap: esp.sm },
  contagem: { fontSize: 22, fontWeight: '700', color: cores.laranja },
  rodape: { marginTop: 'auto', gap: esp.md },
});
