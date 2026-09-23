# Gerar o APK

Para quem do time vai gerar e entregar o arquivo. O passo a passo que vai para
a agente está em [`instalacao/instalar-no-celular.md`](instalacao/instalar-no-celular.md).

## Antes de gerar

- [ ] **Gerar a partir da `main`**, sem nada local fora do commit.
- [ ] **`extra.apiUrl` no `app.json` aponta para a API de verdade**, com
      `https://`. O valor de exemplo (`cadastro-familias-api.exemplo.com.br`)
      gera um APK que instala e abre, mas não ativa. `http://` também não
      serve: o Android bloqueia tráfego sem TLS num build de release.
- [ ] **Subir `android.versionCode` no `app.json`** se já existe um APK na mão
      de alguém. O Android recusa instalar por cima uma versão com código
      igual ou menor. Suba `version` junto (`0.1.0` → `0.1.1`).
- [ ] Gere com antecedência: o plano gratuito do EAS tem fila, que pode passar
      de uma hora. Não gere na véspera da entrega.

## Gerar

```bash
npx eas login                               # conta Expo da associação
npx eas build -p android --profile apk
```

Na primeira vez o `eas build` pergunta duas coisas:

1. **Criar o projeto no EAS** → sim. Ele grava `extra.eas.projectId` no
   `app.json`. Faça commit dessa mudança.
2. **Gerar uma keystore Android** → sim, deixe o EAS gerar e guardar.

O perfil `apk` do `eas.json` força `buildType: apk`. Sem ele o EAS gera um
`.aab`, que só serve para a Play Store e **não instala direto no celular**.
Confira que o arquivo baixado termina em `.apk`.

Ao terminar, o EAS mostra um link da página do build, com botão de download
e QR code.

## A keystore não pode ser perdida

A keystore é o que assina o APK. Toda atualização precisa ser assinada com
a **mesma** keystore, senão o Android recusa instalar por cima ("Aplicativo
não instalado", "conflito com pacote existente").

A única saída nesse caso é desinstalar o app antigo, e **desinstalar apaga o
banco SQLite do aparelho** — inclusive os pré-cadastros que ainda não foram
enviados. É exatamente o tipo de perda que o app existe para evitar.

Por isso:

- A keystore fica no EAS, na conta da associação. Não gere uma nova com
  `eas credentials` nem troque de conta Expo entre uma versão e outra.
- Guarde um backup fora do EAS: `npx eas credentials -p android` →
  *Download credentials*. Guarde o `.jks` e as senhas num cofre de senhas da
  associação, **nunca no repositório**.
- Antes de pedir para a agente atualizar, confira no app que a fila está vazia
  (tudo enviado). Se algo der errado, não se perde nada.

## Entregar

- Mande o **link do download do APK**, não o arquivo solto, sempre que der: o
  link abre no Chrome, que é o caminho que o passo a passo descreve.
- Os links de build do EAS expiram. Para uma entrega que precisa durar, baixe
  o `.apk` e publique num lugar da associação (Google Drive, por exemplo).
- Junto com o link, mande o passo a passo em PDF ou as imagens dele.
- O código de convite vai **separado** do link, por outra mensagem.

## Critérios de aceite da issue #10

- [ ] APK instalado e aberto num celular Android de verdade (anotar abaixo).
- [ ] Passo a passo seguido por alguém de fora do time, sem ajuda. Observe em
      silêncio e anote onde a pessoa parou ou hesitou — é isso que precisa
      virar texto ou print novo.

| Data | Aparelho / Android | Versão do APK | Quem testou | Travou em |
|---|---|---|---|---|
| | | | | |
