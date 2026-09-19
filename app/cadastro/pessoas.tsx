import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Aviso, Botao, ItemLista, Progresso, Selo } from '@/design/componentes';
import { cores, esp, texto } from '@/design/tokens';
import { buscar, salvarRascunho } from '@/dados/fila';
import { criarGravador } from '@/dados/gravador';
import { descreverTotal, hojeLocal, idadeEm, totalDaCasa } from '@/dados/idade';
import type { Pessoa, PreCadastro } from '@/dados/tipos';

/**
 * Passo 2 do cadastro: quem mora na casa.
 *
 * A tela só lista, abre e remove. Adicionar e editar uma pessoa é na tela
 * `cadastro/pessoa` — por isso a lista é relida do banco toda vez que esta
 * tela volta a aparecer.
 *
 * O total do rodapé ("4 pessoas · 3 com até 12 anos") é calculado na hora a
 * partir da lista, nunca guardado: ver `src/dados/idade.ts`.
 */
export default function Pessoas() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const [cadastro, setCadastro] = useState<PreCadastro | null>(null);
  // o que está na tela agora, para duas remoções seguidas não partirem da mesma lista
  const cadastroAtual = useRef<PreCadastro | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [erroAoGuardar, setErroAoGuardar] = useState(false);
  const [navegando, setNavegando] = useState(false);

  const [gravador] = useState(() =>
    criarGravador<PreCadastro>(
      async c => {
        // Mantém a situação que o cadastro já tinha: remover alguém de um
        // cadastro PRONTO não pode tirá-lo da fila de envio sem ninguém ver.
        await salvarRascunho(c, c.situacao);
        setErroAoGuardar(false);
      },
      () => setErroAoGuardar(true),
    ),
  );

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setNaoEncontrado(true);
        return;
      }
      let vivo = true;
      // uma remoção ainda a caminho do banco precisa chegar antes da releitura
      gravador
        .esvaziar()
        .then(() => buscar(id))
        .then(c => {
          if (!vivo) return;
          cadastroAtual.current = c;
          setCadastro(c);
          setNaoEncontrado(c === null);
        })
        .catch(() => {
          if (vivo) setNaoEncontrado(true);
        });
      return () => {
        vivo = false;
      };
    }, [id, gravador]),
  );

  function remover(p: Pessoa) {
    Alert.alert('Remover pessoa', `Tirar ${p.nome ?? 'esta pessoa'} da lista desta casa?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => {
          const atual = cadastroAtual.current;
          if (!atual) return;
          const novo = { ...atual, pessoas: atual.pessoas.filter(x => x.id !== p.id) };
          cadastroAtual.current = novo;
          setCadastro(novo);
          gravador.agendar(novo);
        },
      },
    ]);
  }

  /** Só sai da tela quando a última remoção já chegou ao banco. */
  async function irPara(pathname: string, params: Record<string, string>) {
    setNavegando(true);
    const ok = await gravador.esvaziar();
    setNavegando(false);
    if (ok) router.push({ pathname, params });
  }

  if (naoEncontrado) {
    return (
      <View style={e.tela}>
        <Aviso titulo="Cadastro não encontrado" tom="erro">
          Não achei esta família no celular. Volte ao início e abra o cadastro de novo.
        </Aviso>
        <Botao titulo="Voltar ao início" variante="contorno" aoTocar={() => router.replace('/inicio')} />
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

  const hoje = hojeLocal();
  const { pessoas } = cadastro;
  const vazia = pessoas.length === 0;

  return (
    <View style={e.raiz}>
      <ScrollView contentContainerStyle={e.tela}>
        <Progresso passo={2} total={3} />
        <Text style={e.titulo}>Quem mora na casa</Text>
        <Text style={e.p}>Casa de {cadastro.responsavelNome}. Toque numa pessoa para corrigir.</Text>

        {vazia ? (
          <Aviso titulo="Ninguém na lista ainda" tom="atencao">
            Comece pelo responsável e depois quem mais dorme na casa. Não precisa saber a data de
            nascimento: dá para pôr a idade aproximada.
          </Aviso>
        ) : (
          pessoas.map(p => (
            <ItemLista
              key={p.id}
              titulo={p.nome ?? 'Pessoa sem nome'}
              detalhe={descreverPessoa(p, hoje)}
              selo={p.cadastroIncompleto ? <Selo texto="FALTA O NOME" tom="espera" /> : undefined}
              aoTocar={() => irPara('/cadastro/pessoa', { id, pessoaId: p.id })}
              acao={{
                titulo: 'Remover',
                rotuloAcessivel: `Remover ${p.nome ?? 'pessoa sem nome'}`,
                aoTocar: () => remover(p),
              }}
            />
          ))
        )}

        <Botao
          titulo={vazia ? '+ Adicionar uma pessoa' : '+ Adicionar mais uma pessoa'}
          variante="tracejado"
          aoTocar={() => irPara('/cadastro/pessoa', { id })}
          desabilitado={navegando}
        />

        {erroAoGuardar ? (
          <Aviso titulo="Não consegui guardar" tom="erro">
            A remoção ainda não foi salva no celular. Tente remover de novo.
          </Aviso>
        ) : null}
      </ScrollView>

      <View style={e.rodape}>
        <Text style={e.total} accessibilityLiveRegion="polite">
          {descreverTotal(totalDaCasa(pessoas, hoje))}
        </Text>
        <Botao
          titulo="Continuar"
          aoTocar={() => irPara('/cadastro/revisar', { id })}
          carregando={navegando}
          desabilitado={vazia}
        />
      </View>
    </View>
  );
}

/** "Feminino · uns 7 anos" */
function descreverPessoa(p: Pessoa, hoje: string): string {
  const partes: string[] = [];
  if (p.sexo) partes.push(p.sexo === 'F' ? 'Feminino' : 'Masculino');

  const idade = idadeEm(p, hoje);
  if (idade === null) {
    partes.push('Sem idade');
  } else {
    const anos = idade === 0 ? 'menos de 1 ano' : idade === 1 ? '1 ano' : `${idade} anos`;
    partes.push(p.dataNascimento ? anos : `uns ${anos}`);
  }
  return partes.join(' · ');
}

const e = StyleSheet.create({
  raiz: { flex: 1 },
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tela: { flexGrow: 1, padding: esp.lg, paddingTop: 60, gap: esp.md },
  titulo: { ...texto.titulo, color: cores.tinta },
  p: { ...texto.corpo, color: cores.apagado },
  rodape: {
    padding: esp.lg,
    paddingTop: esp.md,
    gap: esp.md,
    borderTopWidth: 1.5,
    borderTopColor: cores.linha,
    backgroundColor: cores.papel,
  },
  total: { ...texto.corpoForte, color: cores.tinta, textAlign: 'center' },
});
