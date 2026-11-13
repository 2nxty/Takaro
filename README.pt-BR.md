<p align="center">
  <img src="assets/icon.svg" width="96" height="96" alt="Ícone do Takaro">
</p>

<h1 align="center">Takaro</h1>

<p align="center">
  Um player de YouTube Music para Windows, leve, com Discord Rich Presence.<br>
  Sem Electron. Cerca de 4 MB.
</p>

<p align="center">
  <a href="https://github.com/2nxty/Takaro/releases/latest/download/Takaro.exe"><b>Baixar</b></a> ·
  <a href="README.md">English</a>
</p>

---

## O que é o Takaro?

O Takaro abre o **YouTube Music** oficial numa janela nativa e leve e publica o que você está ouvindo como um card de **Discord Rich Presence**: capa, título, artista, álbum, barra de progresso ao vivo e botões para os seus amigos ouvirem junto.

Ele é feito com [Tauri 2](https://tauri.app) e usa o runtime **Microsoft Edge WebView2**, que já vem no Windows 10/11, então não carrega um Chromium embutido. O app inteiro é um único `.exe` portable de ~4 MB.

## Recursos

- **Discord Rich Presence**: atividade "Ouvindo" com capa, artista, álbum, barra de progresso ao vivo e dois botões. Ao pausar, o card continua e mostra *Pausado* com o tempo atual, em vez de sumir.
- **Leve**: Tauri + WebView2, sem Electron. `.exe` portable, sem instalador.
- **Seu YouTube Music de verdade**: entre com sua conta e tenha playlists, curtidas, mixes, letras, tudo.
- **Plugins inclusos**: SponsorBlock, volume preciso, velocidade de reprodução, seletor de qualidade e mais, configuráveis num painel dentro do app.
- **Barra de título própria**: janela sem moldura cuja barra (voltar/avançar, configurações e os botões da janela) usa o fundo da página, inclusive os gradientes.
- **Atualização automática**: procura uma release nova no GitHub e, depois que você confirma, troca o exe e reinicia.
- **Ícone na bandeja**: música atual, tocar/pausar, anterior/próxima, mostrar/esconder, configurações e sair pela área de notificação. Clique no ícone para esconder a janela e continuar ouvindo.
- **Leve no PC**: scripts orientados a eventos, e o WebView2 reduz a memória enquanto a janela está minimizada ou escondida.
- **Extensões do navegador**: instale extensões da Chrome Web Store ou da Edge Add-ons direto no app.
- **Multilíngue**: English, Português (Brasil) e Español, seguindo automaticamente o idioma do YouTube Music. Um idioma novo é só um arquivo JSON.
- **Privado**: sem servidor, sem telemetria. Seu login fica num perfil local do WebView2.

## Download

Baixe o **`Takaro.exe`** na [última versão](https://github.com/2nxty/Takaro/releases/latest) e execute. Pronto.

**Requisitos**

- Windows 10 ou 11 (x64)
- Microsoft Edge WebView2 Runtime: já vem no Windows 11 e no Windows 10 atualizado. Se faltar, baixe na [Microsoft](https://developer.microsoft.com/microsoft-edge/webview2/).
- Discord desktop (só para o Rich Presence)

> [!NOTE]
> O `.exe` ainda não tem assinatura digital, então o SmartScreen do Windows pode avisar na primeira vez. Clique em **Mais informações → Executar assim mesmo**.

## Discord Rich Presence

Enquanto uma música toca, seu perfil mostra:

| Campo | Conteúdo |
|---|---|
| Atividade | **Ouvindo Takaro** (a lista de membros mostra o nome da música) |
| Imagem grande | Capa do álbum / vídeo |
| Linha 1 | Nome da música |
| Linha 2 | Artista |
| Linha 3 | Álbum (ou `⏸ Pausado · 01:23 / 03:41` quando pausado) |
| Progresso | Barra ao vivo com tempo decorrido / total (some quando pausado) |
| Botão 1 | **Ouvir no YouTube Music**: abre a música atual |
| Botão 2 | **Get Takaro**: o site do projeto (`SITE_URL`) |

Observações:

- O Discord calcula a barra de progresso pelo relógio, então não dá para "congelá-la". Pausado, a barra dá lugar ao tempo em que parou.
- O Discord não mostra os botões no seu próprio perfil, só os seus amigos veem.
- Durante anúncios, o card continua mostrando a música anterior.
- Se o Discord não estiver aberto, o Takaro tenta de novo a cada 15 segundos e conecta assim que ele abrir.
- As atualizações têm limite (no máximo uma a cada 4 s) para respeitar os limites do Discord.

## Plugins

Clique no botão **Configurações do Takaro** (ícone de sliders) na barra superior do YouTube Music, ou em **Configurações** no menu da bandeja. O painel tem três abas: **Plugins**, **Extensões** e **Geral** (idioma, versão e links). Na aba **Geral** também dá para escolher o que o **X** da janela faz: fechar o app ou minimizar para a bandeja. As mudanças são salvas na hora; quando alguma precisa recarregar a página, aparece uma barra **Recarregar** embaixo.

| Plugin | O que faz | Opções |
|---|---|---|
| **SponsorBlock** | Pula intros, encerramentos e trechos sem música em clipes, usando a base do [SponsorBlock](https://sponsor.ajay.app). | Categorias |
| **Pular músicas com dislike** | Vai para a próxima faixa quando você dá "não gostei". | — |
| **Desativar autoplay** | Faz as músicas começarem pausadas. | Só na primeira música ao abrir o app (padrão) |
| **Retomar última sessão** | Ao abrir o app, volta para a música, playlist ou mix que você estava ouvindo, no mesmo ponto. Playlists, álbuns, mixes e rádios voltam com a fila; uma fila montada à mão com "Adicionar à fila" só traz de volta a música atual. | Continuar de onde a música parou, começar pausado |
| **Volume preciso** | Roda do mouse sobre a barra do player, setas ↑/↓, um indicador pequeno de porcentagem acima do volume, e o volume fica salvo entre sessões. | Passo (%), setas |
| **Velocidade de reprodução** | Controle de 0,07× a 16× no menu ⋮ do player. Roda do mouse para passos de 0,01; clique no valor para voltar a 1×. | — |
| **Seletor de qualidade** | Botão sobre o player para escolher a qualidade do stream. | — |
| **Vídeo ou capa** | Escolha o que o player mostra: botão Música/Vídeo, sempre só a capa (sem vídeo), ou nada (a fila ocupa a tela). | O player mostra |

O Takaro também corrige o menu ⋮ da barra do player para que um segundo clique o feche.

## Extensões

O Takaro carrega extensões de navegador pelo WebView2.

1. Abra **Configurações do Takaro → Extensões** e clique em **Chrome Web Store** ou **Edge Add-ons**. A loja abre numa nova janela.
2. Abra a página de uma extensão. Uma caixa **Instalar no Takaro** aparece no canto inferior direito (o botão da própria loja só funciona no Chrome/Edge).
3. Depois de instalar, clique em **Recarregar o Takaro** nessa caixa.

As extensões instaladas aparecem na mesma seção, onde dá para ligar, desligar ou remover cada uma.

Por baixo, o Takaro baixa o `.crx` com o `curl.exe` do Windows, extrai com o `tar.exe` do Windows em `%LOCALAPPDATA%\com.takaro.player\extensions\<id>` e registra a pasta no WebView2 (`AddBrowserExtension`), então a extensão continua instalada depois de reiniciar.

Limitações: funcionam melhor as extensões que alteram as páginas (bloqueadores, temas, ajustes). O WebView2 não tem barra de ferramentas, então popups e botões de extensão não ficam disponíveis, e algumas APIs de extensões do Chrome não são suportadas.

## Idiomas

O app (painel de configurações, controles dos plugins e os textos do card do Discord) está disponível em `en` (English), `pt-BR` (Português do Brasil) e `es` (Español).

Por padrão, o idioma segue o **idioma da interface do YouTube Music**, depois o do sistema, e por último o inglês. Para fixar um idioma, use **Configurações do Takaro → Geral → Idioma**. O menu da bandeja segue o mesmo idioma.

O site (`docs/`) tem as próprias traduções em `docs/i18n/`.

## Compilando a partir do código

> [!IMPORTANT]
> **Vai compilar você mesmo? Precisa do seu próprio Client ID do Discord.** O repositório não inclui um. Crie uma aplicação no [Discord Developer Portal](https://discord.com/developers/applications) e defina o **Application ID** dela na variável de ambiente `DISCORD_CLIENT_ID` antes de compilar (veja [Configuração](#configuração)). Sem ele o app funciona normalmente, só sem o Rich Presence.

**Pré-requisitos**

- [Rust](https://rustup.rs) (stable)
- [Node.js](https://nodejs.org) 18+
- Windows 10/11 com WebView2 e as ferramentas de build do MSVC ([pré-requisitos do Tauri](https://tauri.app/start/prerequisites/))

```bash
git clone https://github.com/2nxty/Takaro.git
cd Takaro
npm install
```

Rodar em modo de desenvolvimento:

```bash
npm run dev
```

Gerar o `.exe` portable (saída: `src-tauri/target/release/takaro.exe`):

```bash
npm run build:portable
```

Gerar o instalador NSIS (saída em `src-tauri/target/release/bundle/nsis/`):

```bash
npm run build
```

Dica: para manter os arquivos de build fora da pasta do repositório, aponte `CARGO_TARGET_DIR` para outra pasta antes de compilar, por exemplo `$env:CARGO_TARGET_DIR = "D:\takaro-build"` no PowerShell.

### Depurando a página

Inicie o app com remote debugging e abra `http://localhost:9222` (ou `edge://inspect`) para ter o DevTools da página do YouTube Music. A API injetada fica em `window.Takaro`.

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS = "--remote-debugging-port=9222"
npm run dev
```

## Estrutura do projeto

```
Takaro/
├─ docs/                      # Site (GitHub Pages)
│  └─ i18n/                   # Traduções do site (<código>.js, uma por idioma)
├─ src-tauri/
│  ├─ src/
│  │  ├─ main.rs              # Janela, comandos IPC, payload do Rich Presence
│  │  ├─ discord.rs           # Cliente mínimo do Discord IPC (named pipe, sem dependências)
│  │  ├─ extensions.rs        # Extensões: download da loja, instalação, lista, remoção
│  │  ├─ window.rs            # Janela sem moldura + ações da barra de título
│  │  ├─ updater.rs           # Consulta as releases do GitHub e troca o exe
│  │  ├─ tray.rs              # Ícone e menu da bandeja
│  │  ├─ perf.rs              # Modo de pouca memória do WebView2 com a janela minimizada/escondida
│  │  ├─ i18n/                # Traduções do app: <código>.json (embutidas no build)
│  │  └─ inject/              # JavaScript injetado no music.youtube.com
│  │     ├─ core.js           # Registro de plugins, configurações, i18n, helpers, eventos do player
│  │     ├─ plugins/*.js      # Um arquivo por plugin
│  │     ├─ ui.js             # Painel de configurações, modais, correção do menu ⋮
│  │     ├─ presence.js       # Lê a faixa atual e envia para o Rust
│  │     └─ store.js          # Caixa "Instalar no Takaro" na janela da loja
│  ├─ capabilities/           # Quais páginas remotas podem chamar quais comandos (YTM, lojas)
│  ├─ build.rs                # Junta src/i18n/*.json + build do Tauri
│  └─ tauri.conf.json
├─ assets/                    # Ícone (SVG + PNG 1024 px)
└─ .github/workflows/         # Build de release
```

## Criando um plugin

Crie `src-tauri/src/inject/plugins/meu-plugin.js`, registre-o com `Takaro.register({ id, defaults, options, early, start, onPlayer })`, adicione o arquivo à lista `INJECT` em `src-tauri/src/main.rs` e coloque os textos (`name`, `description`, `options`, `choices`) em cada arquivo de `src-tauri/src/i18n/`. O [README em inglês](README.md#writing-a-plugin) tem um exemplo completo e a lista de helpers.

## Adicionando uma tradução

**App**: copie `src-tauri/src/i18n/en.json` para `src-tauri/src/i18n/<código>.json` (por exemplo `fr.json`), traduza os valores e coloque em `"_name"` o nome do idioma no próprio idioma. O `build.rs` inclui automaticamente todo JSON dessa pasta e falha o build se algum for inválido. Chaves que faltarem usam o inglês.

**Site**: copie `docs/i18n/en.js` para `docs/i18n/<código>.js`, troque o código e o nome do idioma na primeira linha, traduza o objeto JSON e adicione uma linha no `docs/index.html`, junto das outras:

```html
<script src="i18n/fr.js" defer></script>
```

As traduções são objetos JSON dentro de um script para que o site funcione também abrindo o `index.html` direto do disco (o navegador bloqueia ler `.json` via `file://`).

Pull requests com novos idiomas são muito bem-vindos.

## Configuração

Constantes no topo de `src-tauri/src/main.rs`:

| Constante | Padrão | Significado |
|---|---|---|
| `DISCORD_CLIENT_ID` | *(vazio)* | Aplicação do Discord usada na presença. **Não fica no código:** é lida da variável de ambiente `DISCORD_CLIENT_ID` na hora de compilar (vai embutida no exe) e também pode ser definida ao abrir o app (tem prioridade). |
| `SITE_URL` | o site do projeto | Link do segundo botão do card (“Get Takaro”) |
| `STATUS_DISPLAY_TYPE` | `2` | O que aparece depois de "Ouvindo" na lista de membros: `0` nome do app, `1` artista, `2` música |
| `SMALL_IMAGE_KEY` | `""` | Chave opcional de um Art Asset exibido como ícone pequeno sobre a capa |
| `UPDATE_REPO` (`updater.rs`) | `2nxty/Takaro` | Repositório do GitHub consultado para novas versões. Em forks, troque pelo seu. |

**Configurando sua aplicação do Discord:** crie uma aplicação no [Discord Developer Portal](https://discord.com/developers/applications), dê a ela o nome que deve aparecer no card ("Ouvindo *Nome*") e envie um ícone. Depois use o **Application ID** dela:

```powershell
# PowerShell: compila com o seu ID embutido
$env:DISCORD_CLIENT_ID = "123456789012345678"
npm run build:portable
```

Para o workflow de release do GitHub, adicione o ID como secret do repositório com o nome `DISCORD_CLIENT_ID` (**Settings → Secrets and variables → Actions → New repository secret**). Se fizer um fork, troque também o `SITE_URL` em `src-tauri/src/main.rs` e o `docs/CNAME` pelo seu site.

As configurações do usuário (plugins, idioma) ficam no `localStorage` da página, na chave `takaro:settings`, dentro do perfil do WebView2 em `%LOCALAPPDATA%\com.takaro.player`.

## Publicando uma versão

1. Confira se o secret `DISCORD_CLIENT_ID` existe no repositório (veja [Configuração](#configuração)) e atualize a versão em `package.json`, `src-tauri/Cargo.toml` e `src-tauri/tauri.conf.json`.
2. Faça o commit, crie a tag e envie:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

3. O workflow **Release** compila o `Takaro.exe` no Windows e o anexa a uma nova GitHub Release. Os botões de download do site apontam para `releases/latest/download/Takaro.exe`, então se atualizam sozinhos.

**Site:** nas configurações do repositório, ative **Pages → Deploy from a branch → `main` / `docs`**. Para usar um domínio próprio, coloque-o em `docs/CNAME` e crie um registro DNS `CNAME` apontando para `<usuário>.github.io`.

## Dúvidas e problemas

**O card não aparece no Discord.**
Confira se o Discord *desktop* está aberto (a versão do navegador não tem IPC) e se **Configurações de usuário → Privacidade de atividades → Compartilhar minha atividade** está ligado. O Takaro reconecta em até 15 segundos depois que o Discord abre.

**Onde ficam meus dados e como resetar tudo?**
Feche o Takaro e apague `%LOCALAPPDATA%\com.takaro.player`. Isso desconecta sua conta e reseta todas as configurações.

**Ele bloqueia anúncios?**
Não sozinho; durante um anúncio, o card do Discord mantém a música anterior. Você pode instalar uma extensão bloqueadora pelas lojas (veja [Extensões](#extensões)).

**macOS / Linux?**
Ainda não: o cliente do Discord usa named pipes do Windows. Contribuições são bem-vindas.

## Créditos

- Plugins portados do [pear-desktop](https://github.com/pear-devs/pear-desktop) (MIT); veja [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- [SponsorBlock](https://sponsor.ajay.app) pela base de segmentos.
- [Tauri](https://tauri.app) pelo framework.

## Licença

[MIT](LICENSE) © 2026 2nxty

O Takaro é um projeto independente, sem ligação, endosso ou patrocínio da Google LLC, do YouTube ou da Discord Inc. YouTube Music é marca registrada da Google LLC; Discord é marca registrada da Discord Inc.
