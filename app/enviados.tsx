import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Aviso, Botao, Carregando, ItemLista, Titulo } from '@/design/componentes';
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
    return <Carregando />;
  }

  return (
    <FlatList
      data={cadastros}
      keyExtractor={c => c.id}
      contentContainerStyle={e.tela}
      ListHeaderComponent={
        <View style={e.cabecalho}>
          <Titulo>Meus cadastros</Titulo>
          <Text style={e.p}>Ficam no celular até você apagar. Toque num devolvido para corrigir.</Text>
          {cadastros.some(c => c.situacao === 'ENVIADO') ? (
            // A resposta da associação só chega quando o celular pergunta;
            // o envio já pergunta, mas sem nada na fila não há envio.
            <Botao
              titulo="Ver se a associação já respondeu"
              variante="contorno"
              aoTocar={() => router.push('/enviando')}
            />
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <Aviso titulo="Nenhum cadastro ainda" tom="calmo">
          As famílias que você cadastrar aparecem aqui, mesmo depois de enviadas.
        </Aviso>
      }
      renderItem={({ item }) => {
        const destino = destinoAoTocar(item);
        return (
          <ItemLista
            titulo={item.responsavelNome || 'Sem responsável'}
            detalhe={descreverLinha(item)}
            selo={seloDaSituacao(item.situacao)}
            aoTocar={destino ? () => router.push(destino) : undefined}
          />
        );
      }}
    />
  );
}

const e = StyleSheet.create({
  tela: { flexGrow: 1, padding: esp.lg, paddingTop: 60, gap: esp.md },
  cabecalho: { gap: esp.sm },
  p: { ...texto.corpo, color: cores.apagado },
});
