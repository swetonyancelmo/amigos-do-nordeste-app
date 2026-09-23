import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Aviso, Botao, Destaque, Selo } from '@/design/componentes';
import { cores, esp, texto } from '@/design/tokens';
import { apagar, buscar, reabrirDevolvido } from '@/dados/fila';
import { motivoParaMostrar, podeCorrigir } from '@/dados/devolvido';
import { descreverLinha } from '@/dados/meusCadastros';
import type { PreCadastro } from '@/dados/tipos';

/**
 * Cadastro devolvido: a associação olhou e mandou de volta para corrigir.
 *
 * O motivo aparece inteiro, do jeito que a dona escreveu no sistema web.
 * "Corrigir e reenviar" põe o cadastro de volta na fila (DEVOLVIDO → PRONTO)
 * e abre a revisão, onde cada passo pode ser corrigido — o motivo continua
 * visível lá. Ele vai ao servidor na próxima vez que a agente enviar.
 *
 * Apagar tira o cadastro do celular de vez, por isso pede confirmação.
 */
export default function Devolvido() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const [cadastro, setCadastro] = useState<PreCadastro | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!id) {
      setNaoEncontrado(true);
      return;
    }
    const c = await buscar(id).catch(() => null);
    setCadastro(c);
    setNaoEncontrado(c === null);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void recarregar();
    }, [recarregar]),
  );

  const voltarParaLista = () => (router.canGoBack() ? router.back() : router.replace('/enviados'));

  async function corrigir() {
    if (!id) return;
    setOcupado(true);
    setErro(null);
    try {
      if (await reabrirDevolvido(id)) {
        // replace: o "voltar" da revisão leva à lista, não a esta tela, que
        // já não vale para um cadastro que voltou para a fila
        router.replace({ pathname: '/cadastro/revisar', params: { id } });
        return;
      }
      // nada mudou: sumiu ou já não está devolvido — a releitura mostra qual
      await recarregar();
    } catch {
      setErro('Não consegui pôr o cadastro de volta na fila. Nada foi perdido, tente de novo.');
    }
    setOcupado(false);
  }

  function confirmarApagar() {
    Alert.alert(
      'Apagar cadastro',
      `Apagar o cadastro de ${cadastro?.responsavelNome || 'esta família'} do celular? Não dá para desfazer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar', style: 'destructive', onPress: () => void apagarDeVez() },
      ],
    );
  }

  async function apagarDeVez() {
    if (!id) return;
    setOcupado(true);
    setErro(null);
    try {
      await apagar(id);
      voltarParaLista();
      return;
    } catch {
      setErro('Não consegui apagar. O cadastro continua no celular, tente de novo.');
    }
    setOcupado(false);
  }

  if (naoEncontrado) {
    return (
      <View style={e.tela}>
        <Aviso titulo="Cadastro não encontrado" tom="erro">
          Não achei esta família no celular. Volte para a lista e abra o cadastro de novo.
        </Aviso>
        <Botao titulo="Voltar para a lista" variante="contorno" aoTocar={voltarParaLista} />
      </View>
    );
  }

  if (!cadastro || !id) {
    return (
      <View style={e.carregando}>
        <ActivityIndicator color={cores.laranja} size="large" />
      </View>
    );
  }

  if (!podeCorrigir(cadastro)) {
    return (
      <View style={e.tela}>
        <Aviso titulo="Este cadastro não está mais devolvido" tom="atencao">
          Ele já voltou para a fila ou foi enviado de novo. Confira na lista.
        </Aviso>
        <Botao titulo="Voltar para a lista" variante="contorno" aoTocar={voltarParaLista} />
      </View>
    );
  }

  return (
    <View style={e.raiz}>
      <ScrollView contentContainerStyle={e.tela}>
        <Selo texto="DEVOLVIDO" tom="devolvido" />
        <Text style={e.titulo}>{cadastro.responsavelNome || 'Sem responsável'}</Text>
        <Text style={e.p}>{descreverLinha(cadastro)}</Text>

        <Destaque titulo="O que a associação escreveu">
          {/* selecionável: a agente pode copiar um nome ou telefone do motivo */}
          <Text style={e.motivo} selectable>
            {motivoParaMostrar(cadastro)}
          </Text>
        </Destaque>

        <Aviso titulo="Como corrigir" tom="calmo">
          Corrija o que foi pedido e salve. O cadastro volta para a fila e vai de novo na próxima vez
          que você enviar.
        </Aviso>

        {erro ? (
          <Aviso titulo="Algo deu errado" tom="erro">
            {erro}
          </Aviso>
        ) : null}
      </ScrollView>

      <View style={e.rodape}>
        <Botao titulo="Corrigir e reenviar" aoTocar={corrigir} carregando={ocupado} />
        <Botao titulo="Apagar cadastro" variante="contorno" aoTocar={confirmarApagar} desabilitado={ocupado} />
      </View>
    </View>
  );
}

const e = StyleSheet.create({
  raiz: { flex: 1 },
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tela: { flexGrow: 1, padding: esp.lg, paddingTop: 60, gap: esp.md },
  titulo: { ...texto.titulo, color: cores.tinta },
  p: { ...texto.corpo, color: cores.apagado },
  motivo: { ...texto.corpo, color: cores.tinta },
  rodape: {
    padding: esp.lg,
    paddingTop: esp.md,
    gap: esp.md,
    borderTopWidth: 1.5,
    borderTopColor: cores.linha,
    backgroundColor: cores.papel,
  },
});
