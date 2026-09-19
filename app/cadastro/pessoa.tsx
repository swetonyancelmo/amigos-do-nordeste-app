import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Aviso, Botao, Campo, Destaque, Marcar, Opcoes, Progresso } from '@/design/componentes';
import { cores, esp, texto } from '@/design/tokens';
import { buscar, novoId, salvarRascunho } from '@/dados/fila';
import {
  FORM_VAZIO,
  dataCompleta,
  formVazio,
  formatarData,
  lerData,
  mascararData,
  paraForm,
  validarPessoa,
  type DadosPessoa,
  type FormPessoa,
} from '@/dados/formPessoa';
import { criarGravador } from '@/dados/gravador';
import { hojeLocal, idadeEm } from '@/dados/idade';
import type { Pessoa, Sexo } from '@/dados/tipos';

/**
 * Adicionar ou corrigir uma pessoa da casa. Abre a partir do Passo 2
 * (`cadastro/pessoas`), com `id` do cadastro e, na correção, `pessoaId`.
 *
 * A regra da tela está em `src/dados/formPessoa.ts`: nome e data de
 * nascimento nunca são obrigatórios, e a idade aproximada é gravada com o dia
 * em que foi dita.
 *
 * Como nas outras telas, o que está na tela vai para o banco a cada mudança —
 * mas só enquanto é válido. Uma data pela metade não apaga a que já estava
 * gravada.
 */

const OPCOES_SEXO: readonly { valor: Sexo; titulo: string }[] = [
  { valor: 'F', titulo: 'Feminino' },
  { valor: 'M', titulo: 'Masculino' },
];

type Gravacao = { id: string; pessoaId: string; dados: DadosPessoa };

export default function PessoaDaCasa() {
  const { id, pessoaId: pessoaIdDaRota } = useLocalSearchParams<{ id?: string; pessoaId?: string }>();
  const router = useRouter();

  const [pessoaId] = useState(() => pessoaIdDaRota ?? novoId());
  const [responsavel, setResponsavel] = useState<string | null>(null);
  const [form, setForm] = useState<FormPessoa>(FORM_VAZIO);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [erroAoGuardar, setErroAoGuardar] = useState(false);
  const [salvando, setSalvando] = useState(false);

  /** A pessoa como estava gravada ao abrir a tela; nula quando é nova. */
  const [anterior, setAnterior] = useState<Pessoa | null>(null);

  const formAtual = useRef(FORM_VAZIO);
  // Abrir "adicionar" e voltar sem tocar em nada não cria pessoa vazia.
  const jaGravado = useRef(false);

  const [gravador] = useState(() =>
    criarGravador<Gravacao>(
      async ({ id, pessoaId, dados }) => {
        // salvarRascunho reescreve a lista inteira: parte do que está no banco
        // e troca (ou acrescenta) só esta pessoa.
        const atual = await buscar(id);
        if (!atual) throw new Error('cadastro não encontrado');
        const i = atual.pessoas.findIndex(p => p.id === pessoaId);
        const pessoa: Pessoa = {
          ...dados,
          id: pessoaId,
          ordem: i >= 0 ? atual.pessoas[i].ordem : atual.pessoas.length,
        };
        const pessoas =
          i >= 0 ? atual.pessoas.map(p => (p.id === pessoaId ? pessoa : p)) : [...atual.pessoas, pessoa];
        // mantém a situação: corrigir alguém não tira o cadastro da fila
        await salvarRascunho({ ...atual, pessoas }, atual.situacao);
        setErroAoGuardar(false);
      },
      () => setErroAoGuardar(true),
    ),
  );

  useEffect(() => {
    if (!id) return;
    let vivo = true;
    buscar(id)
      .then(c => {
        if (!vivo) return;
        const existente = c?.pessoas.find(p => p.id === pessoaIdDaRota) ?? null;
        if (!c || (pessoaIdDaRota && !existente)) {
          setNaoEncontrado(true);
          return;
        }
        setAnterior(existente);
        jaGravado.current = existente !== null;
        const inicial = existente ? paraForm(existente, hojeLocal()) : FORM_VAZIO;
        formAtual.current = inicial;
        setForm(inicial);
        setResponsavel(c.responsavelNome);
      })
      .catch(() => {
        if (vivo) setNaoEncontrado(true);
      });
    return () => {
      vivo = false;
    };
  }, [id, pessoaIdDaRota]);

  function mudar(parcial: Partial<FormPessoa>) {
    if (!id) return;
    const novo = { ...formAtual.current, ...parcial };
    formAtual.current = novo;
    setForm(novo);

    if (!jaGravado.current && formVazio(novo)) return;
    const v = validarPessoa(novo, hojeLocal(), anterior);
    if (!v.ok) return; // o que já estava gravado continua valendo
    jaGravado.current = true;
    gravador.agendar({ id, pessoaId, dados: v.dados });
  }

  async function salvar() {
    if (!id) return;
    setTentouSalvar(true);
    const v = validarPessoa(formAtual.current, hojeLocal(), anterior);
    if (!v.ok) return;

    setSalvando(true);
    gravador.agendar({ id, pessoaId, dados: v.dados });
    const ok = await gravador.esvaziar();
    setSalvando(false);
    if (!ok) return;

    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/cadastro/pessoas', params: { id } });
  }

  if (!id || naoEncontrado) {
    return (
      <View style={e.tela}>
        <Aviso titulo="Pessoa não encontrada" tom="erro">
          Não achei este cadastro no celular. Volte à lista e abra a pessoa de novo.
        </Aviso>
        <Botao titulo="Voltar ao início" variante="contorno" aoTocar={() => router.replace('/inicio')} />
      </View>
    );
  }

  if (responsavel === null) {
    return (
      <View style={e.carregando}>
        <ActivityIndicator color={cores.laranja} size="large" />
      </View>
    );
  }

  const hoje = hojeLocal();
  const validacao = validarPessoa(form, hoje, anterior);
  const erros = validacao.ok ? {} : validacao.erros;
  // data pela metade só é erro depois de tentar salvar; antes disso ainda está sendo digitada
  const erroData = tentouSalvar || dataCompleta(form.dataNascimento) ? erros.dataNascimento : undefined;

  const nascimento = erros.dataNascimento ? null : lerData(form.dataNascimento);
  const idadePelaData = nascimento ? idadeEm({ ...PESSOA_VAZIA, dataNascimento: nascimento }, hoje) : null;

  const temIdade = form.idadeAproximada.trim() !== '';
  const temData = form.dataNascimento.trim() !== '';

  return (
    <ScrollView contentContainerStyle={e.tela} keyboardShouldPersistTaps="handled">
      <Progresso passo={2} total={3} />
      <Text style={e.titulo}>{anterior ? 'Corrigir pessoa' : 'Adicionar pessoa'}</Text>
      <Text style={e.p}>Casa de {responsavel}.</Text>

      <Campo
        rotulo="Nome"
        dica={
          form.naoSeiNome
            ? 'Pode pôr como a família chama, ex.: "filha da Maria". Fica marcado que falta o nome.'
            : 'Se não souber agora, marque abaixo. Dá para salvar sem nome.'
        }
        value={form.nome}
        onChangeText={t => mudar({ nome: t })}
        autoCapitalize="words"
      />

      <Marcar
        titulo="Não sei o nome agora"
        marcado={form.naoSeiNome}
        aoMudar={m => mudar({ naoSeiNome: m })}
      />

      <Opcoes rotulo="Sexo" opcoes={OPCOES_SEXO} selecionado={form.sexo} aoEscolher={s => mudar({ sexo: s })} />

      <Campo
        rotulo="Data de nascimento"
        placeholder="DD/MM/AAAA"
        dica={
          idadePelaData !== null
            ? `Tem ${descreverAnos(idadePelaData)} hoje.`
            : 'Não é obrigatória. Se não souber, deixe em branco.'
        }
        erro={erroData}
        value={form.dataNascimento}
        onChangeText={t => mudar({ dataNascimento: mascararData(t) })}
        keyboardType="number-pad"
        maxLength={10}
      />

      <Destaque titulo="Não sabe a data? Ponha a idade aproximada">
        <Campo
          rotulo="Idade aproximada (anos)"
          placeholder="Ex.: 7"
          dica={
            temIdade
              ? `Fica guardado que a idade foi dita hoje, ${formatarData(hoje)}. No ano que vem o sistema já conta um ano a mais.`
              : 'Para bebê com menos de 1 ano, ponha 0.'
          }
          erro={erros.idadeAproximada}
          value={form.idadeAproximada}
          onChangeText={t => mudar({ idadeAproximada: t.replace(/\D/g, '') })}
          keyboardType="number-pad"
          maxLength={3}
        />
        {temIdade && temData ? (
          <Botao
            titulo="Apagar a data de nascimento"
            variante="contorno"
            aoTocar={() => mudar({ dataNascimento: '' })}
          />
        ) : null}
      </Destaque>

      {erroAoGuardar ? (
        <Aviso titulo="Não consegui guardar" tom="erro">
          O que está na tela ainda não foi salvo no celular. Toque em salvar de novo.
        </Aviso>
      ) : null}

      <View style={{ flex: 1 }} />

      <Botao titulo="Salvar pessoa" aoTocar={salvar} carregando={salvando} />
    </ScrollView>
  );
}

const PESSOA_VAZIA: Pessoa = {
  id: '',
  nome: null,
  cadastroIncompleto: false,
  sexo: null,
  dataNascimento: null,
  idadeEstimada: null,
  idadeEstimadaEm: null,
  ordem: 0,
};

function descreverAnos(n: number): string {
  return n === 0 ? 'menos de 1 ano' : n === 1 ? '1 ano' : `${n} anos`;
}

const e = StyleSheet.create({
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tela: { flexGrow: 1, padding: esp.lg, paddingTop: 60, gap: esp.md },
  titulo: { ...texto.titulo, color: cores.tinta },
  p: { ...texto.corpo, color: cores.apagado },
});
