import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Aviso, Botao, Destaque, ItemLista, Progresso, Selo } from '@/design/componentes';
import { cores, esp, texto } from '@/design/tokens';
import { motivoParaMostrar } from '@/dados/devolvido';
import { buscar, marcarPronto } from '@/dados/fila';
import { descreverPessoa, descreverTotal, hojeLocal, totalDaCasa } from '@/dados/idade';
import { revisar } from '@/dados/revisao';
import type { PreCadastro } from '@/dados/tipos';

/**
 * Passo 3 do cadastro: conferir e salvar.
 *
 * Salvar muda a situação de RASCUNHO para PRONTO — é isso que põe o cadastro
 * na fila de envio e soma no contador da tela inicial. Não precisa de
 * internet: o envio é outra coisa, feito depois, pela tela inicial.
 *
 * A tela não edita nada. "Corrigir" abre o passo certo, e o cadastro é relido
 * do banco toda vez que a tela volta a aparecer.
 *
 * Um cadastro devolvido que a agente pôs de volta na fila chega aqui ainda
 * com o motivo da associação, que fica no topo enquanto ela corrige.
 */
export default function Revisar() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const [cadastro, setCadastro] = useState<PreCadastro | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroAoSalvar, setErroAoSalvar] = useState(false);

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

  async function salvar() {
    if (!id) return;
    setSalvando(true);
    setErroAoSalvar(false);
    try {
      if (await marcarPronto(id)) {
        // volta ao início tirando os passos do cadastro da pilha: o "voltar"
        // do celular não pode reabrir um cadastro que já está na fila.
        router.dismissTo('/inicio');
        return;
      }
      // nada mudou: o cadastro sumiu ou já foi enviado — a releitura mostra qual
      await recarregar();
    } catch {
      setErroAoSalvar(true);
    }
    setSalvando(false);
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
  const { impedimento, jaEnviado, semNome, semIdade } = revisar(cadastro, hoje);

  if (jaEnviado) {
    return (
      <View style={e.tela}>
        <Aviso titulo="Este cadastro já foi enviado" tom="atencao">
          Ele já saiu do celular e não volta para a fila por aqui.
        </Aviso>
        <Botao titulo="Voltar ao início" variante="contorno" aoTocar={() => router.dismissTo('/inicio')} />
      </View>
    );
  }

  const corrigirFamilia = () => router.push({ pathname: '/cadastro/familia', params: { id } });

  return (
    <View style={e.raiz}>
      <ScrollView contentContainerStyle={e.tela}>
        <Progresso passo={3} total={3} />
        <Text style={e.titulo}>Revisar e salvar</Text>
        <Text style={e.p}>Confira com a família antes de salvar. Toque em algo para corrigir.</Text>

        {cadastro.motivoDevolucao !== null ? (
          <Destaque titulo="A associação devolveu e escreveu">
            <Text style={e.motivo} selectable>
              {motivoParaMostrar(cadastro)}
            </Text>
          </Destaque>
        ) : null}

        <Text style={e.rotulo}>A FAMÍLIA</Text>
        <ItemLista
          titulo={cadastro.responsavelNome || 'Sem responsável'}
          detalhe={descreverFamilia(cadastro)}
          aoTocar={corrigirFamilia}
          acao={{ titulo: 'Corrigir', rotuloAcessivel: 'Corrigir dados da família', aoTocar: corrigirFamilia }}
        />

        <Text style={e.rotulo}>QUEM MORA NA CASA</Text>
        {cadastro.pessoas.map(p => (
          <ItemLista
            key={p.id}
            titulo={p.nome ?? 'Pessoa sem nome'}
            detalhe={descreverPessoa(p, hoje)}
            selo={p.cadastroIncompleto ? <Selo texto="FALTA O NOME" tom="espera" /> : undefined}
            aoTocar={() => router.push({ pathname: '/cadastro/pessoa', params: { id, pessoaId: p.id } })}
          />
        ))}
        <Botao
          titulo="Corrigir a lista de pessoas"
          variante="contorno"
          aoTocar={() => router.push({ pathname: '/cadastro/pessoas', params: { id } })}
        />

        {!impedimento && (semNome > 0 || semIdade > 0) ? (
          <Aviso titulo="Dá para salvar assim" tom="atencao">
            {descreverFaltas(semNome, semIdade)} A associação completa depois, na aprovação.
          </Aviso>
        ) : null}

        {impedimento ? (
          <Aviso titulo="Ainda não dá para salvar" tom="erro">
            {impedimento}
          </Aviso>
        ) : (
          <Aviso titulo="Fica guardado no celular" tom="calmo">
            Salvar não precisa de internet. Você envia depois, pela tela inicial, quando pegar sinal.
          </Aviso>
        )}

        {erroAoSalvar ? (
          <Aviso titulo="Não consegui salvar" tom="erro">
            O cadastro continua como rascunho no celular, nada foi perdido. Tente salvar de novo.
          </Aviso>
        ) : null}
      </ScrollView>

      <View style={e.rodape}>
        <Text style={e.total}>{descreverTotal(totalDaCasa(cadastro.pessoas, hoje))}</Text>
        <Botao
          titulo="Salvar cadastro"
          variante="confirmar"
          aoTocar={salvar}
          carregando={salvando}
          desabilitado={impedimento !== null}
        />
      </View>
    </View>
  );
}

/** Uma linha por dado, com "não informado" no lugar do que ficou em branco. */
function descreverFamilia(c: PreCadastro): string {
  const ou = (v: string | null) => v ?? 'não informado';
  return [
    `Telefone: ${ou(c.telefone)}`,
    `Comunidade: ${ou(c.comunidadeNome)}`,
    `Referência: ${ou(c.pontoReferencia)}`,
  ].join('\n');
}

/** "1 pessoa sem nome e 2 sem idade." */
function descreverFaltas(semNome: number, semIdade: number): string {
  const partes: string[] = [];
  if (semNome > 0) partes.push(semNome === 1 ? '1 pessoa sem nome' : `${semNome} pessoas sem nome`);
  if (semIdade > 0) {
    const pessoa = semNome > 0 ? '' : semIdade === 1 ? ' pessoa' : ' pessoas';
    partes.push(`${semIdade}${pessoa} sem idade`);
  }
  return `${partes.join(' e ')}.`;
}

const e = StyleSheet.create({
  raiz: { flex: 1 },
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tela: { flexGrow: 1, padding: esp.lg, paddingTop: 60, gap: esp.md },
  titulo: { ...texto.titulo, color: cores.tinta },
  p: { ...texto.corpo, color: cores.apagado },
  motivo: { ...texto.corpo, color: cores.tinta },
  rotulo: { ...texto.rotulo, color: cores.apagado, marginTop: esp.sm },
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
