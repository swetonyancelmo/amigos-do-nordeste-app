---
name: nova-tela-app
description: Cria ou altera uma tela do app Expo/React Native de pré-cadastro offline (expo-router em app/, regra de negócio em src/dados/*.ts testada com jest, componentes de src/design, gravação imediata do rascunho no SQLite, uso em pé, no sol, com uma mão e sem internet). Use sempre que a tarefa for uma tela, um passo do cadastro, um formulário, uma lista, uma mensagem para a agente, uma validação ou um fluxo de navegação no app, "fazer a tela do Figma do app" ou "mudar o que aparece para a agente".
---

# Nova tela no app da agente

Leia antes: `CLAUDE.md` deste repositório e
`docs/decisoes/ADR-0001-pre-cadastro-offline.md`. Protótipo:
https://www.figma.com/design/SA3REA1kBhYYeiJf6dxH1J

Quem usa é a agente comunitária de saúde, na porta da casa: em pé, no sol, com
uma mão, sem sinal, e interrompida a qualquer momento. Perder o que foi
digitado é o pior defeito possível; formulário comprido é formulário
abandonado.

## O corte do projeto: regra fora da tela

Toda decisão que dá para testar sem React fica num módulo `src/dados/<assunto>.ts`,
com teste em `src/dados/__tests__/<assunto>.test.ts`. A tela em
`app/<rota>.tsx` só compõe componentes, guarda estado e chama essas funções.
Exemplos: `revisao.ts` (o que impede salvar), `formPessoa.ts` (idade estimada
datada), `envio.ts` (textos do envio), `meusCadastros.ts` (selo e ordem),
`devolvido.ts`.

Comece pelo módulo e pelo teste; depois faça a tela.

## A tela

- Arquivo = rota (expo-router). Parâmetros com
  `useLocalSearchParams<{ id?: string }>()`, navegação com `useRouter()`.
  Tela nova no fluxo de sessão só entra pelo roteamento de `app/index.tsx`.
- Imports com o alias `@/` (`@/design/componentes`, `@/dados/fila`).
- **Só componentes de `@/design/componentes`**: `Botao`, `Campo`, `Marcar`,
  `Destaque`, `ItemLista`, `Opcoes`, `Progresso`, `Barra`, `Selo`, `Aviso`.
  Falta uma variante? Acrescente-a em `componentes.tsx`, não faça estilo solto
  na tela.
- Estilo local com `StyleSheet.create`, usando só `cores`, `esp`, `texto` e
  `raio` de `@/design/tokens`. Nada de cor ou tamanho literal.
- **Alvo de toque ≥ `ALVO_MINIMO` (56)**, corpo de texto ≥ 16, contraste
  alto, `accessibilityLabel` em tudo que é tocável e não tem texto.
- Textos curtos, em português simples, falando com a agente. Nunca mostre erro
  cru do servidor ou do aparelho; diga o que aconteceu e que o dado continua
  guardado (veja `envio.ts`).

## Gravar sem perder dado

Siga o padrão de `app/cadastro/familia.tsx`:

1. Ao abrir, busque o rascunho (`buscar(id)` ou `buscarRascunhoAberto()`).
   **Não** crie registro vazio só por abrir a tela.
2. A cada mudança de campo, `gravador.agendar(...)` (`criarGravador` em
   `src/dados/gravador.ts`) grava como `RASCUNHO` sem escritas fora de ordem.
3. `salvarRascunho` reescreve a tabela `pessoa` inteira daquele cadastro. Tela
   que só edita dados da família precisa reler as pessoas do banco antes de
   salvar, senão as apaga.
4. Antes de navegar, `await gravador.esvaziar()`.
5. Mostre `Aviso` se a gravação falhar (`erroAoGuardar`).

## Regras de dado

- `id` do pré-cadastro e da pessoa nasce no aparelho (`novoId()`), e é a chave
  de idempotência do envio.
- Data de nascimento nunca é obrigatória. Sem ela, grave `idadeEstimada`
  **e** `idadeEstimadaEm`.
- Pessoa sem nome pode ser salva (`cadastroIncompleto`). Só impede salvar: não
  ter responsável e não ter ninguém na casa (`revisao.ts`).
- Totais e idades são calculados na hora (`idade.ts`), nunca gravados.
- Datas como string `AAAA-MM-DD`, sem passar por `Date`, porque o fuso horário
  empurra o dia.
- Formulário curto: moradia, saneamento e renda **não** entram no app; ficam
  para a aprovação no web.
- O app nunca baixa dado de família. A única lista que vem do servidor é a de
  comunidades (`comunidades.ts`).
- Opções que o servidor valida (sexo etc.) precisam usar o mesmo valor do enum
  da API (`FEMININO`, não `F`). Valor diferente faz a API recusar o envio
  (veja a skill `mudanca-de-contrato` na pasta que agrupa os repositórios).
- Nenhum `console.*`: o lint trata como erro, para não vazar dado em log.

## Testes

```ts
import { describe, expect, test } from '@jest/globals';
// com banco de verdade:
jest.mock('expo-sqlite', () => jest.requireActual('../../testes/sqliteEmNode'));
```

Use `_limparParaTeste()` no `beforeEach` e `_fecharParaTeste()` para simular
fechar e abrir o app. Dados fictícios ("Responsável", "Ana"). Mock de rede com
`jest.mock('../api', ...)`, como em `perdaDeDados.test.ts`.

## Verificar

```bash
npx jest src/dados/__tests__/<assunto>.test.ts
npx jest && npm run lint
npx expo start      # conferir no Expo Go; em dev, "Entrar sem código (dev)" pula a ativação
```

Se não foi possível abrir no celular ou no emulador, diga isso ao entregar.
