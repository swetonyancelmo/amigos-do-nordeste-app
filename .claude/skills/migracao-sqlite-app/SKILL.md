---
name: migracao-sqlite-app
description: Altera o banco SQLite local do app de pré-cadastro acrescentando um passo novo em PASSOS (src/dados/banco.ts, versionado por PRAGMA user_version) sem perder o que já está gravado nos celulares em campo, e ajusta fila, tipos e testes. Use quando a tarefa pedir coluna ou tabela nova no app, guardar um campo novo no rascunho, cache de lista do servidor, índice, ou quando falarem em "schema do app", "banco do celular", "SQLite", "user_version".
---

# Migração do SQLite do app

O aparelho da agente pode estar em qualquer versão anterior quando instala o
APK novo, e dentro dele há cadastros que ainda não foram enviados. Por isso o
schema evolui como o Flyway da API: **uma lista de passos só cresce**. Cada
passo roda uma vez e `PRAGMA user_version` guarda até onde o aparelho chegou.

## Passo a passo

1. **Acrescente um passo no fim de `PASSOS`** em `src/dados/banco.ts`, com o
   comentário numerado seguindo os existentes:
   ```ts
   // 3 — onde a família mora: coordenada opcional do ponto de referência (issue #31).
   async db => {
     await db.execAsync(`
       ALTER TABLE pre_cadastro ADD COLUMN referencia_extra TEXT;
     `);
   },
   ```
   Nunca edite, reordene ou remova um passo existente: aparelhos que já o
   rodaram não rodam de novo, e os que não rodaram ficariam com outro schema.
2. **Coluna nova é sempre anulável ou tem `DEFAULT`**, porque registros
   antigos já existem. Não use `DROP COLUMN` ou recriação de tabela sem copiar
   os dados na mesma transação; na dúvida, deixe a coluna velha sem uso.
3. **Ajuste o resto do caminho do dado:**
   - `src/dados/tipos.ts` (`PreCadastro`, `Pessoa`);
   - `src/dados/fila.ts` (leitura e escrita; lembre que `salvarRascunho`
     reescreve as pessoas inteiras);
   - `_limparParaTeste()` em `banco.ts`, se criou tabela;
   - `sincronizar.ts`, se o campo vai para o servidor. Aí é mudança de
     contrato: a API precisa aceitar o campo (skill `mudanca-de-contrato` na
     pasta que agrupa os repositórios). O servidor guarda o JSON bruto, então
     campo novo não é rejeitado, mas só é usado na aprovação se a API o
     conhecer.
4. **O que fica no aparelho:** só o que a agente digitou e listas fechadas.
   Nunca guarde dado de família vindo do servidor nem dado do líder da
   comunidade (ADR-0001, ADR-0002). Token e hash do PIN ficam no SecureStore,
   nunca no SQLite.
5. **Teste a atualização**, não só o banco novo: um teste que abre um banco na
   versão anterior com dados e confirma que eles continuam lá depois de migrar.
   Use `jest.mock('expo-sqlite', () => jest.requireActual('../../testes/sqliteEmNode'))`,
   que grava em arquivo de verdade.
   ```bash
   npx jest && npm run lint
   ```
6. **Entrega:** o passo novo roda na próxima abertura do app com o código novo,
   seja por APK novo (suba o `android.versionCode` no `app.json`) ou por update
   do `expo-updates`. Veja a skill `gerar-apk`. Antes de liberar, teste num
   aparelho que tenha cadastros não enviados.
