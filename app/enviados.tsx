import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Aviso, Botao, ItemLista, Selo } from '@/design/componentes';
import { cores, esp, texto } from '@/design/tokens';
import { listarTodos } from '@/dados/fila';
import { descreverLinha, destinoAoTocar, ordenarRecentes, seloDaSituacao } from '@/dados/meusCadastros';
import type { PreCadastro } from '@/dados/tipos';

/**
 * Meus cadastros: tudo que está no celular, com o selo da situação.
 *
 * Enviar não apaga nada — o cadastro muda de situação e continua aqui, para a
 * agente conferir depois o que entrou e o que voltou. A lista é relida do
 * banco toda vez que a tela volta a aparecer (ex.: depois de corrigir um
 * devolvido ou de enviar pela tela inicial).
 */
export default function Enviados() {
  const router = useRouter();

  const [cadastros, setCadastros] = useState<PreCadastro[] | null>(null);
  const [erro, setErro] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      listarTodos()
        .then(lista => {
          if (!ativo) return;
          setCadastros(ordenarRecentes(lista));
          setErro(false);
        })
        .catch(() => ativo && setErro(true));
      return () => {
        ativo = false;
      };
    }, []),
  );

  if (erro) {
    return (
      <View style={e.tela}>
        <Aviso titulo="Não consegui abrir a lista" tom="erro">
          Os cadastros continuam guardados no celular. Volte ao início e tente de novo.
        </Aviso>
        <Botao titulo="Voltar ao início" variante="contorno" aoTocar={() => router.dismissTo('/inicio')} />
      </View>
    );
  }

  if (!cadastros) {
    return (
      <View style={e.carregando}>
        <ActivityIndicator color={cores.laranja} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={cadastros}
      keyExtractor={c => c.id}
      contentContainerStyle={e.tela}
      ListHeaderComponent={
        <View style={e.cabecalho}>
          <Text style={e.titulo}>Meus cadastros</Text>
          <Text style={e.p}>Ficam no celular até você apagar. Toque num devolvido para corrigir.</Text>
        </View>
      }
      ListEmptyComponent={
        <Aviso titulo="Nenhum cadastro ainda" tom="calmo">
          As famílias que você cadastrar aparecem aqui, mesmo depois de enviadas.
        </Aviso>
      }
      renderItem={({ item }) => {
        const selo = seloDaSituacao(item.situacao);
        const destino = destinoAoTocar(item);
        return (
          <ItemLista
            titulo={item.responsavelNome || 'Sem responsável'}
            detalhe={descreverLinha(item)}
            selo={<Selo texto={selo.texto} tom={selo.tom} />}
            aoTocar={destino ? () => router.push(destino) : undefined}
          />
        );
      }}
    />
  );
}

const e = StyleSheet.create({
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tela: { flexGrow: 1, padding: esp.lg, paddingTop: 60, gap: esp.md },
  cabecalho: { gap: esp.sm },
  titulo: { ...texto.titulo, color: cores.tinta },
  p: { ...texto.corpo, color: cores.apagado },
});
