---
name: preparar-pr-app
description: "Prepara um commit ou pull request no repositório do app Expo de pré-cadastro offline: roda jest e lint, revisa o diff contra as regras do app (nenhum console, id nascido no aparelho, PASSOS só cresce, PIN nunca sai do aparelho, nada apagado ao enviar, sem dado real), escreve a mensagem em Conventional Commits em português e o texto do PR. Use quando o usuário pedir para commitar, abrir PR, 'subir', 'mandar pra revisão', revisar antes do merge, ou quando uma tarefa no app terminar."
---

# Preparar commit e PR — App

## 1. Verificar

```bash
npx jest && npm run lint
```

(Não existe script `test`; `npm run teste` também serve.) Se falhar, mostre a
saída e corrija antes de continuar. Mudou dependência? Rode também
`npm ci --dry-run`, que é o que o EAS executa.

## 2. Revisar o diff

```bash
git status --short && git diff main...HEAD --stat && git diff
```

Procure:

- **passo existente de `PASSOS`** (`src/dados/banco.ts`) editado ou reordenado: só pode crescer no fim;
- `console.` em qualquer lugar (o lint já barra, mas confira `eslint-disable`);
- id de pré-cadastro ou pessoa gerado fora de `novoId()`, ou dependente do servidor;
- PIN, hash do PIN ou token do aparelho indo para o SQLite, para log ou para a API;
- código que **apaga** cadastro ao enviar, ou que baixa dado de família do servidor;
- data de nascimento ou nome virando obrigatório;
- estilo solto (cor, tamanho literal) em vez de `@/design/tokens`, e alvo de toque abaixo de `ALVO_MINIMO`;
- regra nova na tela sem módulo e teste em `src/dados/`;
- URL local (`localhost`, IP da rede) commitada no `app.json` ou no `eas.json`: a local fica só no `.env`, a de produção (`https://`) no `env` do perfil `apk`;
- dado real de família em teste, print ou exemplo;
- mudança no corpo enviado para `/api/pre-cadastros` sem o lado da API.

Aponte o que encontrar ao usuário antes de commitar.

## 3. Commit

Branch a partir da `main`: `feat/`, `fix/`, `docs/`, `test/`, `build/`,
`chore/` e também os escopos usados no histórico (`a11y/`, `privacidade/`),
seguidos de kebab-case. Só commite direto na `main` se o usuário pedir.

Mensagem em **Conventional Commits, em português**:

```
fix(a11y): contraste de selo/aviso, accessibilityLabel e fonte grande
test(dados): os quatro jeitos de perder dado
```

## 4. PR

O app não tem template de PR. Use esta estrutura:

```
## O que muda
## Por quê            (issue ou ADR)
## Como testar        (Expo Go / emulador, ativado com um convite da API local)
## Checklist
- [ ] `npx jest && npm run lint` passam
- [ ] Testei no celular ou emulador, não só nos testes
- [ ] Não mexi em passo existente de PASSOS
- [ ] Nada é apagado ao enviar; nenhum dado de família vem do servidor
- [ ] Mudou o envio para a API? Avisei a equipe da API: …
- [ ] Nenhum dado real de família
```

Crie com `gh pr create` só se o usuário pedir; caso contrário, entregue o
texto pronto.
