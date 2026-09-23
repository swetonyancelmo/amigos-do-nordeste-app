/**
 * Comunidades que aparecem no Passo 1 do cadastro.
 *
 * A agente ESCOLHE numa lista, não digita: digitado, "Sitio Igrejinha",
 * "sítio igrejinha" e "Igrejinha" viram três comunidades e o relatório por
 * comunidade deixa de fechar.
 *
 * A lista vem de GET /api/comunidades, é baixada na ativação (que já exige
 * internet) e fica no SQLite — daí em diante o Passo 1 funciona offline. Um
 * botão no Passo 1 baixa de novo quando houver sinal.
 *
 * Isto não fere o "só envia": comunidade não é dado de família, é a lista
 * fechada que o sistema web também usa. Da resposta, só entram no aparelho
 * id, nome e município — líder, telefone do líder e coordenadas ficam no
 * servidor.
 *
 * Quem não está na lista entra por "Outra comunidade", com o nome digitado —
 * vai com `comunidadeId` nulo e a associação acerta na aprovação.
 */
import { apiGet, ErroDaApi } from './api';
import { abrirBanco } from './banco';
import { SemInternet } from './sincronizar';

export type Comunidade = {
  id: string;
  nome: string;
  municipioId: string | null;
  municipioNome: string;
};

/** "Sítio Igrejinha · Petrolândia": sem o município, nomes parecidos confundem. */
export function rotuloComunidade(c: Pick<Comunidade, 'nome' | 'municipioNome'>): string {
  return `${c.nome} · ${c.municipioNome}`;
}

/* ------------------------------------------------- resposta do servidor */

/**
 * Converte a resposta de GET /api/comunidades no que o aparelho guarda.
 * Item sem id, nome ou município é descartado: sem município a agente não
 * tem como saber de qual "Igrejinha" se trata.
 */
export function paraLocal(resposta: unknown): Comunidade[] {
  if (!Array.isArray(resposta)) {
    throw new Error('Resposta de /api/comunidades não é uma lista.');
  }
  const lista: Comunidade[] = [];
  for (const item of resposta) {
    const id = texto(item?.id);
    const nome = texto(item?.nome);
    const municipioNome = texto(item?.municipioNome);
    if (!id || !nome || !municipioNome) continue;
    lista.push({ id, nome, municipioId: texto(item?.municipioId), municipioNome });
  }
  return ordenar(lista);
}

function texto(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}

/** Por nome e, entre nomes iguais, pelo município — ignorando acento e caixa. */
export function ordenar(lista: Comunidade[]): Comunidade[] {
  const comparar = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
  return [...lista].sort(
    (a, b) => comparar(a.nome, b.nome) || comparar(a.municipioNome, b.municipioNome),
  );
}

/* ------------------------------------------------------------- telas */

export function textoAtualizadaEm(iso: string | null): string {
  if (!iso) return 'A lista ainda não foi baixada.';
  const d = new Date(iso);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  return `Lista atualizada em ${dia}/${mes}/${d.getFullYear()}.`;
}

/** O que a agente lê quando "Atualizar" não deu certo. A lista antiga continua valendo. */
export function mensagemFalhaAtualizar(erro: unknown): string {
  if (erro instanceof SemInternet) {
    return 'Sem internet agora. A lista que já está no celular continua valendo.';
  }
  if (erro instanceof ErroDaApi && (erro.status === 401 || erro.status === 403)) {
    return 'O servidor não liberou a lista para este celular. Avise a associação.';
  }
  return 'Não consegui atualizar a lista. A que já está no celular continua valendo.';
}

/* ------------------------------------------------------------- banco */

const LISTA = 'comunidades';

type Linha = {
  id: string;
  nome: string;
  municipio_id: string | null;
  municipio_nome: string;
};

export async function listarComunidades(): Promise<Comunidade[]> {
  const db = await abrirBanco();
  const linhas = await db.getAllAsync<Linha>(
    'SELECT id, nome, municipio_id, municipio_nome FROM comunidade',
  );
  return ordenar(
    linhas.map(l => ({
      id: l.id,
      nome: l.nome,
      municipioId: l.municipio_id,
      municipioNome: l.municipio_nome,
    })),
  );
}

/** Quando a lista foi baixada pela última vez (ISO), ou nulo se nunca foi. */
export async function comunidadesAtualizadasEm(): Promise<string | null> {
  const db = await abrirBanco();
  const linha = await db.getFirstAsync<{ em: string }>(
    'SELECT em FROM lista_atualizada WHERE lista = ?',
    LISTA,
  );
  return linha?.em ?? null;
}

/**
 * Baixa a lista e troca a do aparelho por ela, de uma vez só. Se o download
 * falhar, lança o erro e a lista antiga continua intacta.
 *
 * Resposta vazia NÃO apaga a lista guardada: é muito mais provável ser um
 * problema no servidor do que a associação ter excluído todas as comunidades,
 * e a agente em campo ficaria sem nada para escolher. Devolve quantas
 * comunidades ficaram guardadas.
 */
export async function atualizarComunidades(): Promise<number> {
  const lista = paraLocal(await apiGet<unknown>('/api/comunidades'));
  if (lista.length === 0) return (await listarComunidades()).length;

  const db = await abrirBanco();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM comunidade');
    for (const c of lista) {
      await db.runAsync(
        'INSERT INTO comunidade (id, nome, municipio_id, municipio_nome) VALUES (?, ?, ?, ?)',
        c.id,
        c.nome,
        c.municipioId,
        c.municipioNome,
      );
    }
    await db.runAsync(
      `INSERT INTO lista_atualizada (lista, em) VALUES (?, ?)
       ON CONFLICT(lista) DO UPDATE SET em = excluded.em`,
      LISTA,
      new Date().toISOString(),
    );
  });
  return lista.length;
}
