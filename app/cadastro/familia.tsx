import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Aviso, Botao, Campo, Opcoes, Progresso } from '@/design/componentes';
import { cores, esp, texto } from '@/design/tokens';
import {
  atualizarComunidades,
  comunidadesAtualizadasEm,
  listarComunidades,
  mensagemFalhaAtualizar,
  rotuloComunidade,
  textoAtualizadaEm,
  type Comunidade,
} from '@/dados/comunidades';
import { buscar, buscarRascunhoAberto, novoId, salvarRascunho } from '@/dados/fila';
import { criarGravador } from '@/dados/gravador';
import type { PreCadastro } from '@/dados/tipos';

/**
 * Passo 1 do cadastro: quem responde pela casa e onde ela fica.
 *
 * Tudo o que é digitado vai para o banco na hora, como RASCUNHO. A agente vai
 * ser interrompida no meio — alguém chega, o telefone toca — e perder o que
 * foi digitado é o pior defeito possível neste app.
 *
 * Sem `id` na rota, a tela retoma o último rascunho em aberto: é assim que a
 * agente reencontra o cadastro depois de fechar o app no meio.
 *
 * A lista de comunidades vem do SQLite (baixada na ativação), então a tela
 * funciona sem internet. "Atualizar lista" baixa de novo quando houver sinal.
 */

const OUTRA = '__outra__';

/** O que está na tela, do jeito que foi digitado. */
type Formulario = {
  responsavelNome: string;
  telefone: string;
  /** id da comunidade, OUTRA, ou nulo se ainda não escolheu. */
  comunidade: string | null;
  comunidadeOutra: string;
  pontoReferencia: string;
};

const VAZIO: Formulario = {
  responsavelNome: '',
  telefone: '',
  comunidade: null,
  comunidadeOutra: '',
  pontoReferencia: '',
};

export default function Familia() {
  const { id: idDaRota } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();

  const [id, setId] = useState<string | null>(null);
  const [form, setForm] = useState<Formulario>(VAZIO);
  const [retomado, setRetomado] = useState(false);
  const [erroAoGuardar, setErroAoGuardar] = useState(false);
  const [seguindo, setSeguindo] = useState(false);

  const [comunidades, setComunidades] = useState<Comunidade[]>([]);
  const [atualizadaEm, setAtualizadaEm] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [falhaLista, setFalhaLista] = useState<string | null>(null);

  const formAtual = useRef(VAZIO);
  // O gravador é criado uma vez; lê a lista por aqui para ver a mais recente.
  const listaAtual = useRef<Comunidade[]>([]);
  // Abrir a tela e voltar sem digitar nada não deixa rascunho vazio no banco.
  const jaGravado = useRef(false);

  const [gravador] = useState(() =>
    criarGravador<{ id: string; form: Formulario }>(
      async ({ id, form }) => {
        // As pessoas são do Passo 2, e salvarRascunho reescreve a lista
        // inteira. Relê o que está no banco para não apagar ninguém quando a
        // agente volta do Passo 2 e corrige algo aqui.
        const atual = await buscar(id);
        await salvarRascunho(
          { id, ...paraBanco(form, listaAtual.current), pessoas: atual?.pessoas ?? [] },
          'RASCUNHO',
        );
        setErroAoGuardar(false);
      },
      () => setErroAoGuardar(true),
    ),
  );

  useEffect(() => {
    let vivo = true;
    // Lista antes do rascunho: é ela que diz se a comunidade gravada ainda
    // é uma opção ou cai em "Outra". Falhar ao ler a lista não trava a tela.
    Promise.all([
      idDaRota ? buscar(idDaRota) : buscarRascunhoAberto(),
      listarComunidades().catch(() => [] as Comunidade[]),
      comunidadesAtualizadasEm().catch(() => null),
    ])
      .then(([existente, lista, em]) => {
        if (!vivo) return;
        listaAtual.current = lista;
        setComunidades(lista);
        setAtualizadaEm(em);
        const inicial = existente ? doBanco(existente, lista) : VAZIO;
        jaGravado.current = existente !== null;
        formAtual.current = inicial;
        setForm(inicial);
        setRetomado(!idDaRota && existente !== null);
        setId(existente?.id ?? idDaRota ?? novoId());
      })
      .catch(() => {
        if (!vivo) return;
        setErroAoGuardar(true);
        setId(idDaRota ?? novoId());
      });
    return () => {
      vivo = false;
    };
  }, [idDaRota]);

  const opcoesComunidade = useMemo(
    () => [
      ...comunidades.map(c => ({ valor: c.id, titulo: rotuloComunidade(c) })),
      { valor: OUTRA, titulo: 'Outra comunidade' },
    ],
    [comunidades],
  );

  async function atualizarLista() {
    setAtualizando(true);
    setFalhaLista(null);
    try {
      await atualizarComunidades();
      const [lista, em] = await Promise.all([listarComunidades(), comunidadesAtualizadasEm()]);
      const anterior = listaAtual.current;
      listaAtual.current = lista;
      setComunidades(lista);
      setAtualizadaEm(em);

      // A comunidade escolhida saiu da lista nova: vira "Outra" com o mesmo
      // nome, em vez de a escolha sumir da tela e do rascunho.
      const escolhida = formAtual.current.comunidade;
      if (escolhida && escolhida !== OUTRA && !lista.some(c => c.id === escolhida)) {
        const nome = anterior.find(c => c.id === escolhida)?.nome ?? '';
        mudar({ comunidade: OUTRA, comunidadeOutra: nome });
      }
    } catch (erro) {
      setFalhaLista(mensagemFalhaAtualizar(erro));
    } finally {
      setAtualizando(false);
    }
  }

  function mudar(parcial: Partial<Formulario>) {
    if (!id) return;
    const novo = { ...formAtual.current, ...parcial };
    formAtual.current = novo;
    setForm(novo);

    if (!jaGravado.current && estaVazio(novo)) return;
    jaGravado.current = true;
    gravador.agendar({ id, form: novo });
  }

  /** O rascunho anterior continua no celular; só deixa de ser o da tela. */
  function comecarOutra() {
    jaGravado.current = false;
    formAtual.current = VAZIO;
    setForm(VAZIO);
    setRetomado(false);
    setId(novoId());
  }

  async function continuar() {
    if (!id) return;
    setSeguindo(true);
    // só sai da tela quando o que está nela já chegou ao banco
    const ok = await gravador.esvaziar();
    setSeguindo(false);
    if (ok) router.push({ pathname: '/cadastro/pessoas', params: { id } });
  }

  if (!id) {
    return (
      <View style={e.carregando}>
        <ActivityIndicator color={cores.laranja} size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={e.tela} keyboardShouldPersistTaps="handled">
      <Progresso passo={1} total={3} />
      <Text style={e.titulo}>A família</Text>
      <Text style={e.p}>Quem responde pela casa e onde ela fica.</Text>

      {retomado ? (
        <>
          <Aviso titulo="Continuando de onde parou" tom="calmo">
            O que você tinha digitado ficou guardado no celular.
          </Aviso>
          <Botao titulo="Começar outra família" variante="contorno" aoTocar={comecarOutra} />
        </>
      ) : null}

      <Campo
        rotulo="Nome do responsável"
        dica="Obrigatório. O resto pode ficar em branco."
        value={form.responsavelNome}
        onChangeText={t => mudar({ responsavelNome: t })}
        autoCapitalize="words"
      />

      <Campo
        rotulo="Telefone"
        dica="Com DDD."
        value={form.telefone}
        onChangeText={t => mudar({ telefone: t })}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
      />

      {comunidades.length === 0 ? (
        <Aviso titulo="A lista de comunidades não está no celular" tom="atencao">
          Com internet, toque em “Atualizar lista de comunidades”. Sem internet, escolha
          “Outra comunidade” e escreva o nome.
        </Aviso>
      ) : null}

      <Opcoes
        rotulo="Comunidade"
        opcoes={opcoesComunidade}
        selecionado={form.comunidade}
        aoEscolher={c => mudar({ comunidade: c })}
      />

      {form.comunidade === OUTRA ? (
        <Campo
          rotulo="Nome da comunidade"
          dica="Escreva também o município, se souber."
          value={form.comunidadeOutra}
          onChangeText={t => mudar({ comunidadeOutra: t })}
          autoCapitalize="words"
        />
      ) : null}

      <Text style={e.miudo}>{textoAtualizadaEm(atualizadaEm)}</Text>
      {falhaLista ? <Aviso tom="erro">{falhaLista}</Aviso> : null}
      <Botao
        titulo="Atualizar lista de comunidades"
        variante="contorno"
        aoTocar={atualizarLista}
        carregando={atualizando}
      />

      <Campo
        rotulo="Ponto de referência"
        placeholder="Ex.: casa azul depois da igreja"
        value={form.pontoReferencia}
        onChangeText={t => mudar({ pontoReferencia: t })}
      />

      {erroAoGuardar ? (
        <Aviso titulo="Não consegui guardar" tom="erro">
          O que está na tela ainda não foi salvo no celular. Tente mudar algum campo de novo.
        </Aviso>
      ) : null}

      <View style={{ flex: 1 }} />

      <Botao
        titulo="Continuar"
        aoTocar={continuar}
        carregando={seguindo}
        desabilitado={form.responsavelNome.trim() === ''}
      />
    </ScrollView>
  );
}

/* ------------------------------------------------------------- conversão */

const nuloSeVazio = (t: string) => (t.trim() === '' ? null : t.trim());

function estaVazio(f: Formulario) {
  return (
    f.responsavelNome.trim() === '' &&
    f.telefone.trim() === '' &&
    f.comunidade === null &&
    f.pontoReferencia.trim() === ''
  );
}

function paraBanco(f: Formulario, lista: readonly Comunidade[]) {
  const daLista = lista.find(c => c.id === f.comunidade);
  return {
    responsavelNome: f.responsavelNome.trim(),
    telefone: nuloSeVazio(f.telefone),
    comunidadeId: daLista?.id ?? null,
    comunidadeNome: daLista?.nome ?? (f.comunidade === OUTRA ? nuloSeVazio(f.comunidadeOutra) : null),
    pontoReferencia: nuloSeVazio(f.pontoReferencia),
  };
}

function doBanco(p: PreCadastro, lista: readonly Comunidade[]): Formulario {
  const daLista = lista.find(c => c.id === p.comunidadeId);
  // id que saiu da lista numa atualização cai em "Outra", com o nome
  // que foi gravado — melhor que sumir da tela.
  const outra = !daLista && (p.comunidadeId !== null || p.comunidadeNome !== null);
  return {
    responsavelNome: p.responsavelNome,
    telefone: p.telefone ?? '',
    comunidade: daLista ? daLista.id : outra ? OUTRA : null,
    comunidadeOutra: outra ? (p.comunidadeNome ?? '') : '',
    pontoReferencia: p.pontoReferencia ?? '',
  };
}

const e = StyleSheet.create({
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tela: { flexGrow: 1, padding: esp.lg, paddingTop: 60, gap: esp.md },
  titulo: { ...texto.titulo, color: cores.tinta },
  p: { ...texto.corpo, color: cores.apagado },
  miudo: { ...texto.apoio, color: cores.apagado },
});
