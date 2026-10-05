import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Aviso, Botao, Titulo, useAnunciar } from '@/design/componentes';
import { cores, esp, texto } from '@/design/tokens';
import { contarPendentes } from '@/dados/fila';
import { textoSemInternet } from '@/dados/envio';

/**
 * Sem internet: aparece quando o envio não encontra rede, antes de começar
 * ou no meio da fila.
 *
 * A primeira coisa que a tela diz é que nada se perdeu, e o número de
 * guardados vem do banco — não do que o envio achou que sobrou. É o número
 * que a agente vai ver também no contador da tela inicial.
 */
export default function SemInternet() {
  const router = useRouter();
  const { enviados } = useLocalSearchParams<{ enviados?: string }>();
  const jaForam = Number(enviados) || 0;

  const [guardados, setGuardados] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      contarPendentes()
        .then(n => ativo && setGuardados(n))
        // sem o número, a frase genérica ainda diz o que importa
        .catch(() => ativo && setGuardados(null));
      return () => {
        ativo = false;
      };
    }, []),
  );

  const corpo =
    guardados === null ? 'Seus cadastros continuam guardados no celular.' : textoSemInternet(guardados, jaForam);
  // a tela aparece sozinha, no lugar do envio: sem o anúncio, a agente não sabe que o envio parou
  useAnunciar(`Sem internet agora. ${corpo}`);

  return (
    <ScrollView contentContainerStyle={e.tela}>
      <Titulo>Sem internet agora</Titulo>

      <Aviso titulo="Nada se perdeu" tom="calmo">
        {corpo}
      </Aviso>

      <Text style={e.p}>
        Você pode continuar cadastrando sem internet. Quando pegar sinal, toque em “Tentar de novo”.
      </Text>

      <View style={e.rodape}>
        <Botao titulo="Tentar de novo" aoTocar={() => router.replace('/enviando')} />
        <Botao titulo="Voltar ao início" variante="contorno" aoTocar={() => router.dismissTo('/inicio')} />
      </View>
    </ScrollView>
  );
}

const e = StyleSheet.create({
  tela: { flexGrow: 1, padding: esp.lg, paddingTop: 60, gap: esp.md },
  p: { ...texto.corpo, color: cores.apagado },
  rodape: { marginTop: 'auto', gap: esp.md },
});
