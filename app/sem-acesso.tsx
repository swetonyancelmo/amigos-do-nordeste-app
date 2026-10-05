import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Aviso, Botao, Titulo, useAnunciar } from '@/design/componentes';
import { cores, esp, texto } from '@/design/tokens';
import { contarPendentes } from '@/dados/fila';
import { textoSemAcesso } from '@/dados/envio';
import { useSessao } from '@/sessao/sessao';

/**
 * Sem acesso: o servidor não aceita mais o token deste celular (a associação
 * gerou um código novo para a agente, ou a desativou). Tentar de novo não
 * adianta — por isso esta tela não tem "tentar de novo".
 *
 * A primeira coisa que ela diz é que nada se perdeu: ativar de novo troca só o
 * token. Os cadastros estão no SQLite e continuam na fila.
 */
export default function SemAcesso() {
  const router = useRouter();
  const { desativar } = useSessao();
  const { enviados } = useLocalSearchParams<{ enviados?: string }>();
  const jaForam = Number(enviados) || 0;

  const [guardados, setGuardados] = useState<number | null>(null);
  const [saindo, setSaindo] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      contarPendentes()
        .then(n => ativo && setGuardados(n))
        .catch(() => ativo && setGuardados(null));
      return () => {
        ativo = false;
      };
    }, []),
  );

  async function ativarDeNovo() {
    setSaindo(true);
    await desativar();
    router.replace('/ativar');
  }

  const corpo =
    guardados === null ? 'Seus cadastros continuam guardados no celular.' : textoSemAcesso(guardados, jaForam);
  // a tela aparece sozinha, no lugar do envio: sem o anúncio, a agente não sabe que o envio parou
  useAnunciar(`Este celular perdeu o acesso. ${corpo}`);

  return (
    <ScrollView contentContainerStyle={e.tela}>
      <Titulo>Este celular perdeu o acesso</Titulo>

      <Aviso titulo="Nada se perdeu" tom="calmo">
        {corpo}
      </Aviso>

      <Text style={e.p}>
        Peça um código novo à associação. Com ele, toque em “Ativar com código novo” e crie a senha de 4
        números de novo. Depois é só enviar.
      </Text>

      <View style={e.rodape}>
        <Botao titulo="Ativar com código novo" aoTocar={ativarDeNovo} carregando={saindo} />
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
