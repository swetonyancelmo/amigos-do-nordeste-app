# Gerar e distribuir o APK

Passo a passo para quem do time vai gerar o APK do app de pré-cadastro e
entregá-lo às agentes. Foi escrito para quem **nunca gerou um APK**. Siga na
ordem: cada passo diz como saber que deu certo antes de ir para o próximo.

A [seção 12](#12-para-a-agente-vai-junto-com-o-link) é para a agente, e é ela
que vai junto com o link.

> **A partir do primeiro APK instalado de verdade, o celular da agente guarda
> nome, telefone e composição familiar de pessoas em situação de
> vulnerabilidade.** Leia a [seção 11](#11-proteção-de-dados) antes de começar.

Onde este documento diz **⚠ conferir na hora**, é um nome de botão ou de tela
que não deu para confirmar na documentação oficial. A ação está certa; o
texto pode estar diferente.

---

## Situação em 06/10/2026: bloqueado

**Não gere o APK ainda.** A API não está publicada: `npm run conferir-apk`
falha, e o `eas build` recusa montar o app enquanto a URL de produção não
estiver preenchida (ver [passo 3](#passo-3-checagem-antes-de-gastar-um-build)).
Um APK gerado agora instalaria e travaria na primeira tela, e ainda gastaria
um build da cota do mês.

Para destravar:

1. Publicar a API seguindo `docs/DEPLOY.md` do repositório da API (Neon +
   Render + ping no cron-job.org).
2. Pôr a URL dela no `eas.json` (passo 3.1) e ver `npm run conferir-apk`
   passar sem nenhum ✖.

---

## Sumário

0. [O que precisa existir antes](#0-o-que-precisa-existir-antes)
1. [Conta no Expo e login no EAS](#passo-1-conta-no-expo-e-login-no-eas)
2. [A keystore: a chave que não pode ser perdida](#passo-2-a-keystore-a-chave-que-não-pode-ser-perdida)
3. [Checagem antes de gastar um build](#passo-3-checagem-antes-de-gastar-um-build)
4. [Disparar o build](#passo-4-disparar-o-build)
5. [Baixar o APK](#passo-5-baixar-o-apk)
6. [Teste de ponta a ponta (obrigatório)](#passo-6-teste-de-ponta-a-ponta-obrigatório)
7. [Publicar o link](#passo-7-publicar-o-link)
8. [Instalar no Android](#passo-8-instalar-no-android)
9. [Verificar](#passo-9-verificar)
10. [Se der errado](#10-se-der-errado) · [Como atualizar o app depois](#como-atualizar-o-app-depois)
11. [Proteção de dados](#11-proteção-de-dados)
12. [Para a agente](#12-para-a-agente-vai-junto-com-o-link)

---

## 0. O que precisa existir antes

O app não funciona sozinho. Ele fala com a API em quatro rotas:

| Rota | Para quê | Quem pode chamar |
|---|---|---|
| `POST /api/agentes/ativar` | troca o código de convite pelo token do aparelho | público, com limite de 5 tentativas por minuto por IP |
| `GET /api/comunidades/opcoes` | lista de comunidades guardada na ativação | só o token da agente |
| `POST /api/pre-cadastros` | envio, idempotente pelo `id` gerado no aparelho | só o token da agente |
| `GET /api/pre-cadastros/situacao` | se o que ela enviou foi aprovado ou devolvido | só o token da agente |

`npm run conferir-apk` confere as quatro no Swagger da API publicada.

Antes do primeiro build, confira:

- [ ] **API publicada em `https://`** e respondendo em `<URL>/api/saude`.
- [ ] **Conta da usuária criada** e o painel web entrando (passo 4 do
      `DEPLOY.md` da API).
- [ ] **Pelo menos uma comunidade cadastrada** no painel. Sem nenhuma, a
      lista do app fica vazia e a agente só consegue usar "Não sei o nome
      agora" / digitar o nome.
- [ ] **Um código de convite para o teste**, criado como abaixo.

### Como o código de convite é criado

Pelo painel web, **sem mexer no banco**:

1. Entre no painel com a conta da usuária.
2. Menu **Agentes** → botão **Nova agente**.
3. Em **Nome da agente**, o nome como o app vai mostrar para ela (para o
   teste: um nome inventado, como `Agente Teste`).
4. **Cadastrar e gerar código**. Aparece um código de **6 números**, com botão
   de copiar. Ele **vale uma vez**.
5. Na lista, a agente aparece com o selo **Esperando ativação** e o código.
   Depois que o celular ativa, o selo vira **Celular ativo**.

**Gerar novo código** (no cartão da agente) serve para celular perdido,
trocado ou app reinstalado: o celular antigo **perde o acesso na hora**, e os
cadastros que ele já enviou continuam ligados à agente.

Sem o painel, o mesmo pelo Swagger (`<URL>/swagger-ui.html`): login em
`POST /api/auth/login`, **Authorize** com o token, e `POST /api/agentes` com
`{"nome": "Agente Teste"}`. A resposta traz `codigoConvite`.

**Deu certo quando:** o painel mostra a agente com **Esperando ativação** e
um código de 6 números.

---

## Passo 1: conta no Expo e login no EAS

O EAS é o serviço do Expo que compila o APK nos servidores deles. Não precisa
de Android Studio.

**Plano gratuito: 15 builds Android por mês**, numa fila de baixa prioridade
que passa de 90 minutos em horário de pico. Quando a cota acaba, só no mês
seguinte. Por isso o passo 3 existe.

1. Instale o Node.js 22 ou mais novo (<https://nodejs.org>).
2. Instale a linha de comando do EAS:

   ```bash
   npm install -g eas-cli      # o pacote é eas-cli; `npx eas` não resolve
   ```

3. Entre na conta:

   ```bash
   eas login
   eas whoami
   ```

O projeto já existe no EAS: **`@swetonyancelmo/cadastro-familias-app`** (o id
está em `extra.eas.projectId` no `app.json`), com a keystore gerada no
primeiro build. Você precisa estar logado **numa conta com acesso a esse
projeto**. Se o projeto é de uma conta pessoal, quem gera o build entra nessa
conta (⚠ conferir na hora se o projeto foi passado para uma organização do
Expo, onde dá para convidar outras pessoas).

**Deu certo quando:** `eas whoami` mostra a conta certa, e, dentro da pasta do
app, `eas project:info` mostra `@swetonyancelmo/cadastro-familias-app`.

---

## Passo 2: a keystore, a chave que não pode ser perdida

### O que é, em linguagem simples

Todo APK sai **assinado** com uma chave (a *keystore*). O Android guarda qual
chave assinou o app instalado e **só aceita uma atualização assinada com a
mesma chave**.

Se um dia sair um APK assinado com outra chave, o celular responde
**"Aplicativo não instalado"**. A única saída é **desinstalar o app antigo**,
e desinstalar **apaga o banco do celular**, inclusive os cadastros que a
agente ainda não enviou. É exatamente a perda que o app inteiro foi feito para
evitar.

Não existe "esqueci a senha" para a keystore. Fora da Play Store, ninguém
recupera uma chave perdida.

### Onde ela está

No EAS, no projeto acima. Ela foi gerada no primeiro build. Confira:

```bash
eas credentials -p android
```

Escolha o perfil `apk`. A tela mostra a keystore com as impressões digitais
(**SHA-256**). Anote o SHA-256 junto com o backup: ele identifica a chave e é
pedido no registro do app no Google (ver [Como atualizar](#registro-no-google-antes-de-2027)).

**Se o `eas build` ou o `eas credentials` perguntar se deve gerar uma
keystore nova, responda não e pare.** Você está na conta ou no projeto
errados.

### Backup (faça uma vez, agora)

1. `eas credentials -p android` → perfil `apk` →
   **credentials.json: Upload/Download credentials between EAS servers and
   your local json** → **Download credentials from EAS to credentials.json**.
2. Isso grava na pasta do app um `credentials.json` (com as senhas) e o
   arquivo da keystore (`.jks`; ⚠ conferir na hora o caminho que o comando
   mostra).
3. Guarde **os dois arquivos juntos** num cofre de senhas ou numa pasta
   protegida **da associação** (não da conta pessoal de um aluno, que sai
   quando o semestre acaba). Duas pessoas diferentes devem saber onde está.
4. **Apague os dois da pasta do app.** O `.gitignore` já ignora
   `credentials.json`, `credentials/` e `*.jks`, mas não conte com isso.

**Nunca** no repositório, no grupo, no e-mail ou num drive compartilhado com a
turma.

**Deu certo quando:** o cofre tem o `.jks` e o `credentials.json`, o SHA-256
está anotado ao lado, e `git status` não mostra nenhum dos dois.

---

## Passo 3: checagem antes de gastar um build

Cada tentativa gasta **uma das 15 do mês**, e cada uma pode levar horas na
fila. Tudo aqui é de graça e roda em minutos.

### 3.1 A URL da API (só na primeira vez, ou se a API mudar de endereço)

A URL de produção fica no `eas.json`, no perfil `apk`:

```json
"env": {
  "APP_BUILD_RELEASE": "1",
  "EXPO_PUBLIC_API_URL": "https://SEU-SERVICO.onrender.com"
}
```

- **`https://`**, nunca `http://`. O Android bloqueia tráfego sem TLS num APK
  de release, e o sintoma é o app não conectar sem dizer por quê.
- **Sem `/api` e sem barra no fim.**
- Mude por PR, como qualquer código.

`APP_BUILD_RELEASE=1` liga uma trava no `app.config.js`: sem uma URL `https://`
de verdade ali, a configuração do app não monta e o build não sai. O porquê de
cada escolha está comentado no `app.config.js`.

No desenvolvimento nada muda: o Expo Go continua lendo `EXPO_PUBLIC_API_URL`
do `.env` (IP da sua máquina na rede, ver `.env.example`). O `.env` não vai
para o servidor do EAS.

### 3.2 Lista de checagem

Na pasta `cadastro-familias-app`:

```bash
git switch main && git pull     # o APK distribuído sai da main
git status                      # nada fora de commit
npm ci                          # o mesmo install rígido que o EAS roda
npx jest                        # testes
npx tsc --noEmit                # tipos
npm run lint                    # precisa dar 0 errors (warnings não bloqueiam)
npx expo-doctor
npm run conferir-apk            # Parte 0 + configuração do build
```

- [ ] **`npm ci`** termina sem `npm error`. Se falhar aqui, falharia no EAS em
      "Install dependencies", depois de esperar a fila.
- [ ] **`npx jest`**: todos passam (em 06/10/2026: 160 testes).
- [ ] **`npx tsc --noEmit`**: sem saída.
- [ ] **`npm run lint`**: `0 errors`. Em 06/10/2026 havia 6 warnings de estilo,
      que não bloqueiam.
- [ ] **`npx expo-doctor`**: em 06/10/2026, 20 de 21 checagens passavam; a que
      falhava era só versão de *patch* atrás em pacotes do Expo
      (`expo`, `expo-sqlite`, `expo-updates`…). Não bloqueia o build. Atualizar
      é decisão do time, em PR próprio, testado no aparelho. **Qualquer outra
      falha do doctor bloqueia.**
- [ ] **`npm run conferir-apk`** termina com "Tudo certo para disparar o
      build". Ele confere, sem gastar nada:
  - perfil gera `.apk` e não `.aab`;
  - `versionCode` automático ligado;
  - URL `https://` válida;
  - `<URL>/api/saude` responde (espera até 2 minutos, se a API estiver
    hibernando);
  - as quatro rotas do app existem no Swagger publicado.
- [ ] **O app rodou num celular de verdade contra a API publicada**, pelo
      Expo Go: ponha a URL de produção no seu `.env`, rode `npx expo start`,
      leia o QR code e faça ativar → cadastrar → enviar com o código de teste.
      Isso testa o código JavaScript contra a API real sem gastar build.
      **Volte o `.env` para o IP local depois.**

O que o Expo Go **não** testa: a assinatura, o bloqueio de `http://` e o
ícone. Isso só aparece no APK, e é para isso que serve o passo 6.

> Dá para gerar o APK na própria máquina (`eas build --local`, só Linux ou
> macOS, com Android SDK instalado), o que pouparia a fila. ⚠ Conferir na hora
> se o build local conta na cota do plano gratuito: a documentação do EAS não
> diz. Para o APK que vai para as agentes, use o build normal da nuvem, que
> usa a keystore guardada no EAS.

**Deu certo quando:** todas as caixas acima estão marcadas.

---

## Passo 4: disparar o build

```bash
npm run apk
```

Isso roda `npm run conferir-apk` de novo e, só se passar,
`eas build -p android --profile apk`.

O que esperar:

- O `versionCode` sobe sozinho (está guardado no EAS, não no `app.json`; ver
  [Como atualizar](#como-atualizar-o-app-depois)). Na primeira vez com essa
  configuração, o EAS parte do `versionCode` do `app.json` (1) e gera o 2.
- A pergunta sobre gerar keystore **não** deve aparecer (passo 2).
- O terminal mostra o link da página do build no expo.dev.
- **Fila: pode passar de 90 minutos em horário de pico.** Não gere na véspera
  de entrega. Para não deixar o terminal preso:

  ```bash
  npm run apk -- --no-wait
  ```

  e acompanhe pela página do build ou com
  `eas build:list --platform android --limit 3`.

**Deu certo quando:** a página do build mostra o build como concluído
(⚠ conferir o nome do selo: *Finished*) e oferece o download.

---

## Passo 5: baixar o APK

1. Na página do build, botão de download (⚠ conferir o nome), ou pelo link do
   artefato em `eas build:list`.
2. **Confira que o arquivo termina em `.apk`.** Se terminar em `.aab`, ver
   [Se der errado](#10-se-der-errado).
3. Renomeie para **`cadastro-amigos-do-nordeste.apk`**. O nome importa: o link
   fixo do passo 7 depende dele.

**Deu certo quando:** você tem `cadastro-amigos-do-nordeste.apk` no
computador.

---

## Passo 6: teste de ponta a ponta (obrigatório)

**Nenhum link sai para fora do time antes deste roteiro passar inteiro.** APK
distribuído por link não se recolhe (ver [Como atualizar](#como-atualizar-o-app-depois)):
um defeito que escapar daqui chega ao celular de todas as agentes.

Regras:

- **Celular Android de verdade**, não emulador.
- **Só dado inventado.** Nada de nome, telefone ou família real, nem "só para
  testar".
- Um código de convite criado para o teste (seção 0), com nome inventado.
- Duas pessoas: uma com o celular, outra com o painel web.

Data: ____ · Aparelho / Android: ____ · Versão do APK (`version` /
`versionCode`): ____ · Quem testou: ____

- [ ] **1. Instalar e abrir.** Instale o APK pelo link, do jeito que a agente
      vai fazer (passo 8). Abre na tela **Bem-vinda!**.
- [ ] **2. Ativar com um código de convite real** (criado no painel para o
      teste). Avança para a criação da senha. No painel, a agente passa para
      **Celular ativo**.
- [ ] **3. PIN.** Crie a senha de 4 números, confirme. Feche o app de verdade
      (tire da lista de apps abertos), abra de novo: pede a senha; com a
      senha certa, destrava.
- [ ] **4. Modo avião ligado.**
- [ ] **5. Duas famílias completas, com pessoas**, ainda em modo avião:
  - [ ] a família A com uma pessoa **sem data de nascimento**, usando
        **"Não sabe a data? Ponha a idade aproximada"**;
  - [ ] a família B com uma pessoa **sem nome** (**"Não sei o nome agora"**);
  - [ ] as duas salvas em **Revisar e salvar** → **Salvar cadastro**. A tela
        inicial mostra **2 cadastros esperando envio**.
- [ ] **6. Rascunho sobrevive.** Comece uma terceira família, preencha o
      responsável, e **feche o app no meio** (tire da lista de apps abertos).
      Abra, destrave, toque em **Cadastrar uma família**: aparece
      **"Continuando de onde parou"** com o que foi digitado. (Depois,
      termine ou apague esse rascunho.)
- [ ] **7. Sem internet não perde nada.** Ainda em modo avião, toque em
      **Enviar agora**: aparece **Sem internet agora** dizendo que nada se
      perdeu.
- [ ] **8. Tirar do modo avião e sincronizar.** **Enviar agora** → a tela
      **Enviando cadastros** conta até o fim. A inicial mostra **Tudo
      enviado**.
- [ ] **9. Enviar de novo não duplica.** Toque em **Enviar agora** outra vez
      (se o botão sumiu, porque não há nada esperando, isso já é a proteção
      funcionando), e em **Meus cadastros** → **Ver se a associação já
      respondeu**. No painel, em **Chamados**, há **exatamente dois**
      cadastros dessa agente, não quatro.
      *(A idempotência do lado do servidor, o mesmo `id` chegando duas vezes,
      é coberta pelo teste automático `PreCadastroTest` da API. Ela age quando
      a internet cai depois de o servidor gravar e antes da resposta voltar,
      o que não dá para provocar de propósito aqui.)*
- [ ] **10. Os dados chegaram certos.** No painel, abra os dois chamados:
      responsável, telefone, comunidade, ponto de referência e pessoas iguais
      ao digitado; a pessoa sem data aparece com a idade aproximada; a pessoa
      sem nome chegou (sem nome, e sem impedir a ficha de abrir).
- [ ] **11. Aprovar um, devolver outro.** No painel, aprove a família A e
      devolva a família B **com um motivo escrito** (ex.: `Teste: conferir o
      telefone`).
- [ ] **12. A resposta chega no celular.** No app, **Meus cadastros** →
      **Ver se a associação já respondeu**. A família A fica com o selo
      **ACEITO**; a B com **DEVOLVIDO**, e ao tocar nela aparece
      **"O que a associação escreveu"** com o motivo exato.

Se qualquer caixa falhar: **não distribua.** Anote o que aconteceu (sem print
com dado real; aqui os dados são inventados, então print pode), abra issue, e
o conserto vira um APK novo (com `versionCode` maior) que repete o roteiro
inteiro.

**Depois do teste:** no painel, use **Gerar novo código** na agente de teste
para tirar o acesso desse celular, e desinstale o app do celular de teste.

| Data | Aparelho / Android | Versão do APK | Quem testou | Resultado / onde travou |
|---|---|---|---|---|
| | | | | |

---

## Passo 7: publicar o link

### A decisão: um repositório público só para os downloads

O critério é: **a agente recebe um link e instala sozinha, sem conta em lugar
nenhum.** As opções reais:

| Opção | Precisa de conta para baixar? | O link dura? | Problema |
|---|---|---|---|
| Release no repositório do app, **privado** (hoje) | **sim**, login no GitHub | sim | não serve |
| Tornar público o repositório do app | não | sim | expõe o código e todo o histórico; exige auditoria (feita em 06/10/2026, ver abaixo) |
| Página de instalação do EAS (distribuição interna) | não, por padrão: o link é aberto a quem o tiver | **não**: os arquivos de build do EAS expiram, e cada build tem um link novo | a agente fica com um link morto; a cada versão, mandar link novo para todo mundo |
| Google Drive da associação | não, se compartilhado "qualquer pessoa com o link" | sim | no Android o link costuma abrir no app do Drive, com telas de aviso diferentes do Chrome (⚠ conferir); mais um caminho para a agente se perder |
| **Repositório público separado, só com o APK** (recomendado) | **não** | **sim, e é o mesmo link para sempre** | nenhum relevante; o APK fica baixável por qualquer pessoa, como em qualquer link sem login |

**Recomendação: um repositório público separado**, por exemplo
`swetonyancelmo/amigos-do-nordeste-apk`, que contém só um README com a
[seção 12](#12-para-a-agente-vai-junto-com-o-link) e os releases com o APK.

Por quê:

- O GitHub dá um link fixo para o arquivo do release mais recente:
  `https://github.com/<dono>/<repo>/releases/latest/download/<arquivo>`
  (documentação do GitHub, "Linking to releases"). Com o arquivo sempre
  chamado `cadastro-amigos-do-nordeste.apk`, **o link mandado para a agente
  nunca muda**: a cada versão nova ele passa a baixar a nova.
- Abre direto no Chrome e baixa, sem login, sem página intermediária em inglês.
- Não expõe o código nem o histórico do app, e não depende de prazo de
  retenção do EAS.
- O APK baixável por qualquer um não abre nada sozinho: sem um código de
  convite válido, de uso único e gerado no painel, o app não passa da
  primeira tela, e a ativação tem limite de tentativas por IP.

Auditoria do repositório do app, caso o time prefira torná-lo público
(06/10/2026, histórico inteiro, todos os branches): nenhum `.env`, keystore,
`credentials.json`, APK ou banco commitado; nenhum token, senha, string de
conexão ou IP real (o único IP é o `192.168.0.10` de exemplo do
`.env.example`); telefones dos testes são fictícios (`(84) 99999-0000`). Para
uma pessoa confirmar antes: os nomes dos testes (`Maria José da Conceição`,
`Ana Paula`, `Fulana de Teste`) e o exemplo "filha de Jane" do README e dos
comentários são inventados, e não tirados da lista de papel da associação?
`Sítio Igrejinha` é nome de comunidade, não de família. O e-mail do autor dos
commits fica público junto.

### Publicar (primeira vez)

Com o [GitHub CLI](https://cli.github.com) logado (`gh auth login`):

```bash
gh repo create swetonyancelmo/amigos-do-nordeste-apk --public \
  --description "Download do app de pré-cadastro da Associação Amigos do Nordeste"
```

Ou pelo site do GitHub, criando um repositório **Public** (⚠ conferir na hora
os nomes da tela de novo repositório). Ponha nele um `README.md` com a seção
12 deste documento.

### Publicar cada versão

```bash
gh release create v0.1.1 cadastro-amigos-do-nordeste.apk \
  --repo swetonyancelmo/amigos-do-nordeste-apk \
  --title "Versão 0.1.1" \
  --notes "O que mudou, em uma frase, para a agente."
```

(Use a `version` do `app.json` como nome do release.) Pelo site: no
repositório, **Releases** → **Draft a new release** → **Choose a tag** (crie
`v0.1.1`) → título → arraste o `.apk` para a caixa de binários →
**Publish release**.

O link que vai para as agentes:

```
https://github.com/swetonyancelmo/amigos-do-nordeste-apk/releases/latest/download/cadastro-amigos-do-nordeste.apk
```

**Deu certo quando:** o link, aberto numa **janela anônima** do navegador (sem
login no GitHub), começa a baixar o `.apk` direto.

### Como mandar

- **Primeiro, para quem fez o teste do passo 6**, para instalar pelo link
  real.
- Depois, para a agente: o link e a seção 12 (em texto ou PDF) **numa
  mensagem**, e o **código de convite em outra**, de preferência entregue em
  pessoa ou por ligação. O código é de uso único e é o que dá acesso ao
  sistema.

---

## Passo 8: instalar no Android

O passo a passo para a agente está na [seção 12](#12-para-a-agente-vai-junto-com-o-link)
e, com prints, em [`instalacao/instalar-no-celular.md`](instalacao/instalar-no-celular.md).
Aqui, o que quem dá suporte precisa saber.

### "Instalar apps desconhecidos"

Desde o Android 8, a permissão de instalar um APK é **por app de origem**: é
o **Chrome** (ou o app que abriu o arquivo) que precisa da autorização
**Instalar apps desconhecidos**, não o celular inteiro (documentação do
Android, "Alternative distribution").

O caminho mais fácil é o que o próprio celular oferece: ao tocar no APK
baixado, aparece um aviso de que o celular não pode instalar apps desta fonte,
com um botão para as **configurações**. Lá, ligar **Permitir desta fonte** e
voltar. O nome do botão e o caminho **mudam de fabricante para fabricante**
(Samsung, Motorola, Xiaomi…); ⚠ conferir na hora no aparelho.

Se o aviso não oferecer o atalho, o caminho costuma ser parecido com
**Configurações → Apps → Acesso especial → Instalar apps desconhecidos →
Chrome → Permitir desta fonte** (⚠ conferir na hora; muda entre fabricantes e
versões). No Android 7 ou anterior, é a opção **Fontes desconhecidas**, em
**Configurações → Segurança**.

### Play Protect e o aviso de "desenvolvedor não verificado"

O Play Protect pode avisar que o app é desconhecido. O caminho é tocar em
**Mais detalhes** e em **Instalar mesmo assim** (⚠ conferir na hora os
textos). **Não** tocar em "Enviar app para verificação".

Desde 30/09/2026, o Google exige registro de desenvolvedor para apps
instalados no Brasil, mas, pela FAQ oficial, essa primeira etapa vale **só
para lojas participantes**: APK instalado por download direto ainda instala,
com um aviso de desenvolvedor não verificado e a opção de instalar mesmo
assim. **Isso muda em 2027** (ver [Registro no Google](#registro-no-google-antes-de-2027)).

**Deu certo quando:** o celular mostra a instalação concluída com o botão
**Abrir**.

---

## Passo 9: verificar

- [ ] O ícone (sol, mandacaru e abelha) aparece na tela de apps com o nome
      **Cadastro Amigos do Nordeste** (em alguns celulares, cortado, como
      "Cadastro Ami…").
- [ ] Abre na tela **Bem-vinda!**, pedindo o código.
- [ ] Depois de ativar, no painel, em **Agentes**, ela aparece com
      **Celular ativo**.
- [ ] Em **Configurações → Apps → Cadastro Amigos do Nordeste**, a versão
      é a do release (⚠ conferir na hora onde cada fabricante mostra a
      versão).

---

## 10. Se der errado

| O que aparece | Causa provável | O que fazer |
|---|---|---|
| O arquivo baixado é `.aab` | o build saiu de um perfil sem `buildType: "apk"` (o padrão do EAS é `.aab`, que só serve para a Play Store) | confira `build.apk.android.buildType` no `eas.json` e se o comando usou `--profile apk` (o `npm run apk` usa). `npm run conferir-apk` acusa antes. Um `.aab` não tem conserto: é outro build |
| **"Aplicativo não instalado"** ao atualizar, ou "conflito com pacote existente" | **(a)** `versionCode` igual ou menor que o instalado; **(b)** APK assinado com **outra keystore** | **(a)** `eas build:version:get -p android` mostra o último; gere de novo pelo `npm run apk`, que sobe sozinho. **(b)** compare o SHA-256 em `eas credentials` com o anotado no passo 2. Se for keystore diferente, **ninguém desinstala nada**: isso apaga os cadastros não enviados. Restaure a keystore do backup (`eas credentials`, opção de upload do `credentials.json`; ⚠ conferir na hora) e gere de novo |
| "Aplicativo não instalado" na **primeira** instalação | download incompleto, pouco espaço, ou bloqueio do Play Protect | baixe de novo; libere espaço; ver passo 8 |
| O build falha antes de começar, com **"Build de release sem URL de produção válida da API"** | a trava do `app.config.js` | preencha `EXPO_PUBLIC_API_URL` no `eas.json` (passo 3.1). Nesse caso nenhum build foi gasto |
| O build falha em **Install dependencies** | `package-lock.json` fora de sincronia; o EAS roda `npm ci` | `npm ci` local reproduz. Corrija com `npm install`, confira `npm ci` de novo, PR. `react` e `react-dom` precisam ter a mesma versão |
| O app **instala mas não ativa**: "Não deu para ativar agora" ou "precisa de internet" com internet funcionando | **(a)** URL errada no build; **(b)** URL `http://` (bloqueada em release); **(c)** **API hibernando**: o Render gratuito leva cerca de 1 minuto para acordar, e o app desiste em 20 segundos | **(c)** abra `<URL>/api/saude` no navegador do celular, espere responder e tente de novo; confira o ping do cron-job.org (das 6h às 22h). **(a)/(b)** `npm run conferir-apk` mostra a URL que vai no APK; um APK com URL errada só se conserta com outro APK |
| **"Código não encontrado ou já usado"** | o código já foi usado (vale uma vez; pode ter sido no teste), foi trocado por **Gerar novo código**, ou foi digitado errado | no painel, confira o código da agente; se ela já aparece como **Celular ativo** ou o código não bate, **Gerar novo código** e mande o novo |
| **"Muitas tentativas seguidas"** | 5 tentativas por minuto do mesmo IP | esperar 1 minuto. Em rede compartilhada (Wi-Fi da unidade de saúde), as tentativas de todos contam juntas |
| **"Este celular perdeu o acesso"** | alguém gerou um código novo para essa agente | é o esperado depois de **Gerar novo código**. Os cadastros continuam no celular; ela ativa com o código novo e envia |
| A lista de comunidades está vazia | nenhuma comunidade cadastrada no painel, ou a ativação foi sem internet estável | cadastre no painel; no app, **Atualizar lista de comunidades** no passo 1 do cadastro |
| `npm run conferir-apk` diz **"o Render diz que não há serviço neste endereço"** | a URL não é a do serviço publicado | copie a URL do topo da página do serviço no Render |

---

## Como atualizar o app depois

1. **Antes de tudo, a fila das agentes vazia.** Peça para cada uma tocar em
   **Enviar agora** e confira no painel. Se algo der errado na atualização,
   nada que já foi enviado se perde.
2. Faça a mudança por PR, como sempre. Se mexeu no banco local, a regra do
   `PASSOS` em `src/dados/banco.ts` (passo novo, nunca editar um antigo).
3. **Suba a `version` no `app.json`** (`0.1.1` → `0.1.2`): é o número que as
   pessoas veem. O `versionCode`, que o Android usa para aceitar a
   atualização, **sobe sozinho** a cada build (`appVersionSource: "remote"` +
   `autoIncrement`); não mexa no do `app.json`, que agora é ignorado. Para
   ver o atual: `eas build:version:get -p android`.
4. Da `main`, passo 3 e passo 4 (`npm run apk`). **Mesma conta, mesmo
   projeto, mesma keystore**: se aparecer a pergunta de keystore nova, pare.
5. **Passo 6 de novo, mais um item**: instale primeiro a versão **antiga**,
   deixe um cadastro salvo e não enviado, e instale a nova **por cima**. O
   cadastro tem que continuar lá.
6. Publique um release novo com **o mesmo nome de arquivo**
   (`cadastro-amigos-do-nordeste.apk`). O link das agentes já passa a baixar a
   versão nova.
7. Avise as agentes: o que mudou, numa frase, e que é só abrir o mesmo link e
   instalar por cima. **Não desinstalar antes.**

### O aviso honesto: APK por link não se recolhe

Não existe "despublicar" um APK que já está no celular de alguém. Se sair uma
versão com defeito, a única correção é **publicar outra e pedir para todo
mundo reinstalar**, uma por uma, por mensagem. Agente que não vir a mensagem
continua com a versão quebrada, em campo, sem internet. **É por isso que o
teste do passo 6 não é opcional.**

### Atualização sem APK (`eas update`): não use por enquanto

O projeto tem `expo-updates` configurado (canal `apk`), que permitiria mandar
mudanças só de JavaScript sem APK novo. **Não use sem preparar antes**: o
`eas update` **não lê o `env` do perfil do `eas.json`** (a partir do SDK 55 ele
exige `--environment` e usa as variáveis cadastradas no site do EAS). Rodado
como está, a atualização sairia **sem a URL da API**, e todos os celulares
passariam a chamar `localhost`. Antes de usar, cadastrar `EXPO_PUBLIC_API_URL`
e `APP_BUILD_RELEASE=1` num ambiente do EAS e testar num aparelho. Até lá,
toda atualização é APK novo.

### Registro no Google antes de 2027

Pela documentação oficial do Android ("Android developer verification"), em
2027 a exigência de desenvolvedor verificado passa a valer para **todos** os
apps em celulares Android certificados, inclusive os instalados por link. A
FAQ diz que, a partir daí, **app não registrado não instala nem atualiza** sem
ADB ou o "fluxo avançado" (modo desenvolvedor, reinício e espera de um dia),
o que não é viável para a agente.

Saída sem custo: a **conta de distribuição limitada** do Android Developer
Console, gratuita, sem documento de identidade, para até **20 aparelhos**.
Registra-se o pacote `br.org.amigosdonordeste.cadastro` com o **SHA-256 da
keystore** (passo 2), e cada celular de agente é autorizado por um QR code ou
link que ela aceita no aparelho. Não precisa de Play Store.

- [ ] **Antes da data de 2027 que o Google anunciar**, alguém da associação
      cria a conta e registra o app (⚠ conferir na hora as telas e os
      requisitos, inclusive o perfil de pagamento que a conta pede; não deve
      haver cobrança).

---

## 11. Proteção de dados

- **A partir da primeira instalação real**, o celular da agente guarda nome,
  telefone e composição familiar de famílias em situação de vulnerabilidade,
  inclusive de crianças.
- **Nenhum print com dado real** em apresentação, relatório da disciplina,
  issue ou grupo. Prints e demonstrações só com os dados inventados do
  passo 6.
- **Nenhum dado real em teste**, nem "só para conferir se chegou".
- **O PIN não é criptografia.** Ele impede que outra pessoa abra o app no
  celular desbloqueado; não protege os dados de quem tiver acesso técnico ao
  aparelho. O que protege de verdade é **enviar com frequência**: o que já
  foi enviado continua no celular só como registro, e o que está no servidor
  não depende do aparelho.
- **Celular perdido, roubado ou trocado com cadastros não enviados:**
  1. A agente avisa a associação **no mesmo dia**.
  2. No painel, **Agentes** → **Gerar novo código** para ela. O celular
     antigo **perde o acesso na hora**: não consegue mais enviar nada nem
     consultar respostas.
  3. Os cadastros não enviados daquele celular **estão perdidos para a
     associação**: não há como buscá-los nem apagá-los à distância. Anote
     quais famílias eram para refazer a visita.
  4. Se o celular foi roubado com dados de famílias, a associação avalia,
     com quem cuida da proteção de dados dela, se é preciso comunicar as
     pessoas afetadas (LGPD).
  5. Celular novo: instala pelo mesmo link e ativa com o código novo.
- **Troca de celular planejada:** primeiro enviar tudo (inicial em **Tudo
  enviado**), depois instalar no novo com um código novo. Só então
  desinstalar do antigo.

---

## 12. Para a agente (vai junto com o link)

*Copie esta seção para a mensagem ou para o PDF que vai com o link. A versão
com fotos de cada tela está em `instalacao/instalar-no-celular.md`; mantenha
as duas iguais.*

---

### Como instalar o app de cadastro da Associação

Leva uns 5 minutos. Você precisa de internet **só agora**, para baixar e
ativar. Depois, o app funciona sem internet.

Você vai receber **duas mensagens**:

- um **link** para baixar o app;
- um **código de 6 números**, que você digita no fim.

O código é só seu. Não passe para ninguém.

As telas mudam um pouco de um celular para outro. Se um botão tiver outro
nome, procure o que mais se parece.

**1. Toque no link.**
Se ele abrir dentro do WhatsApp, toque nos três pontinhos **⋮** e escolha
**Abrir no Chrome**. O download começa sozinho.

Se o celular avisar que o arquivo **pode ser perigoso**, toque em **Baixar
mesmo assim**. É o app da Associação.

**2. Abra o arquivo baixado.**
Quando terminar, toque em **Abrir** no aviso que aparece embaixo da tela.
Se o aviso sumiu, puxe a barra de cima da tela para baixo e toque no
arquivo **cadastro-amigos-do-nordeste.apk**.

**3. Se o celular não deixar instalar.**
É normal. O celular diz isso porque o app não vem da Play Store.

- Toque em **Configurações** na mensagem.
- Ligue a chave **Permitir desta fonte** (ou **Permitir instalação de
  apps**). Ela fica colorida quando está ligada.
- Toque na **setinha de voltar** (◀ ou ←).

**4. Toque em Instalar.**
Se aparecer um aviso do **Play Protect** dizendo que o app é desconhecido:
toque em **Mais detalhes** e depois em **Instalar mesmo assim**.
**Não** toque em "OK" nem em "Enviar app para verificação": isso cancela.

**5. Toque em Abrir.**
Depois, o app fica na tela do celular com o nome **Cadastro Amigos do
Nordeste** (às vezes aparece cortado: "Cadastro Ami…"). O desenho é um sol
com um mandacaru.

**6. Digite o código de 6 números** e toque em **Continuar**.
Precisa de internet nesta hora. Se demorar ou der erro, espere **1 minuto** e
tente de novo: às vezes o sistema está acordando.

**7. Crie a sua senha de 4 números** e digite de novo para confirmar.
É com ela que você abre o app todo dia. Ela fica só no seu celular: se
esquecer, a Associação não consegue ver qual é.

Pronto. Daqui para a frente o app funciona **sem internet**.

#### No dia a dia

- Os cadastros ficam guardados no celular até você tocar em **Enviar
  agora**, com internet. O número na tela inicial mostra quantos estão
  esperando.
- **Envie sempre que tiver internet.** Enquanto não envia, o cadastro só
  existe no seu celular.
- Não tire print de cadastro e não mande foto de tela com nome de família
  para ninguém, nem em grupo.

#### Se der problema

| O que aparece | O que fazer |
|---|---|
| **"Aplicativo não instalado"** | Peça ajuda à Associação. **Não desinstale o app antigo**: isso apaga os cadastros que ainda não foram enviados. |
| Não acho o arquivo baixado | Abra o app **Arquivos** (ou **Meus arquivos**) e procure em **Downloads**. |
| O celular não deixa instalar e não aparece **Configurações** | Mande uma foto da tela para a Associação. |
| **"Código não encontrado ou já usado"** | Confira os 6 números. Se estiverem certos, peça um código novo à Associação. |
| **"Muitas tentativas seguidas"** | Espere 1 minuto e tente de novo. |
| **"Este celular perdeu o acesso"** | Seus cadastros **não se perderam**. Peça um código novo à Associação. |
| Perdi o celular, ou ele foi roubado | Avise a Associação **no mesmo dia**. |
| Qualquer outra coisa | Mande uma foto da tela para a Associação, **sem nenhum cadastro aparecendo**. |
