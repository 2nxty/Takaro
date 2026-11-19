<p align="center">
  <img src="assets/icon.svg" width="96" height="96" alt="Ícone do Takaro">
</p>

<h1 align="center">Takaro</h1>

<p align="center">
  Um player de YouTube Music para Windows, macOS e Linux, leve e rápido.<br>
  Sem Electron. Cerca de 5 MB.
</p>

<p align="center">
  <a href="https://takaro.im/#download"><b>Baixar</b></a> ·
  <a href="README.md">English</a>
</p>

---

## O que é o Takaro?

O Takaro é um player desktop para o **YouTube Music**: o player web oficial numa janela nativa e leve, com um visual mais caprichado, a capa da música como fundo, letras sincronizadas, plugins inclusos, ícone na bandeja e mais. Ele também pode mostrar o que você está ouvindo no Discord, no OBS ou como um link `tak://`.

Ele é feito com [Tauri 2](https://tauri.app) e usa o motor web que o seu sistema já tem (**WebView2** no Windows, **WebKit** no macOS e no Linux), então não carrega um Chromium embutido. O app inteiro tem cerca de 5 MB.

## Recursos

- **Leve**: Tauri + o motor web do sistema, sem Electron. Cerca de 5 MB: um `.exe` portable ou um instalador no Windows, um `.dmg` no macOS, um AppImage ou `.deb` no Linux.
- **Bloqueador de anúncios**: opcional, com as próprias listas de filtros do uBlock Origin, em todos os sistemas.
- **Seu YouTube Music de verdade**: entre com sua conta e tenha playlists, curtidas, mixes, uploads, tudo.
- **Player caprichado**: janela sem moldura com barra de título própria, a capa da música atual como fundo atrás do player (com desfoque opcional, efeito vidro), barra de progresso em gradiente e menus mais limpos.
- **Letras sincronizadas**: letras sincronizadas do Better Lyrics e do LRCLIB na aba Letra; clique numa linha para ir até ela.
- **Plugins inclusos**: SponsorBlock, volume preciso, velocidade de reprodução, seletor de qualidade, retomar a última sessão e mais, configuráveis num painel dentro do app.
- **Escala da página**: zoom de 80% a 120% (a barra de título mantém o tamanho).
- **Links do Takaro**: links `tak://` abrem uma música, playlist ou canal direto no Takaro.
- **Overlay para OBS**: um card local de "tocando agora" para usar como Browser Source no OBS.
- **Discord Rich Presence**: card opcional "Ouvindo" com capa, progresso e botões.
- **Mini player**: uma janela pequena sempre no topo com a capa, a música e os botões (o botão ao lado do histórico na barra de título).
- **Timer para dormir**: no menu ⋮ do player: pausa depois de 15 min … 2 h, ou no fim da música, com o som diminuindo aos poucos.
- **Takaro Jam**: ouçam juntos: salas compartilhadas com fila em comum, convites por código ou link `tak://jam/…` (veja [Takaro Jam](#takaro-jam)).
- **Last.fm**: conecte sua conta em Configurações → Geral para registrar (scrobble) o que você ouve.
- **Ícone na bandeja**: música atual, tocar/pausar, anterior/próxima, mostrar/esconder, configurações e sair pela área de notificação.
- **Atualização automática**: procura uma release nova no GitHub e, depois que você confirma, troca o exe e reinicia.
- **Leve no PC**: scripts orientados a eventos, otimizações opcionais de CPU/memória, e o WebView2 reduz a memória enquanto a janela está minimizada ou escondida.
- **Extensões do navegador**: instale extensões da Chrome Web Store ou da Edge Add-ons direto no app.
- **Multilíngue**: English, Português (Brasil) e Español, seguindo automaticamente o idioma do YouTube Music.
- **Privado**: sem servidor, sem telemetria. Seu login fica num perfil local do WebView2.

## Download

Baixe pelo [site](https://takaro.im/#download) (ele detecta o seu sistema) ou na [última versão](https://github.com/2nxty/Takaro/releases/latest):

| Sistema | Arquivo | Como usar |
|---|---|---|
| **Windows** 10 / 11 (x64) | [`Takaro.exe`](https://github.com/2nxty/Takaro/releases/latest/download/Takaro.exe) | Portable: é só executar. Precisa do WebView2 Runtime, que já vem no Windows 11 e no Windows 10 atualizado ([baixe](https://developer.microsoft.com/microsoft-edge/webview2/) se faltar). |
| **Windows** (instalador) | [`Takaro-Setup.exe`](https://github.com/2nxty/Takaro/releases/latest/download/Takaro-Setup.exe) | Instala para o seu usuário (sem administrador), com atalho no menu Iniciar e desinstalador; baixa o WebView2 se faltar. É o mesmo app, e também se atualiza sozinho. |
| **macOS** 11+ (Intel e Apple Silicon) | [`Takaro-macOS.dmg`](https://github.com/2nxty/Takaro/releases/latest/download/Takaro-macOS.dmg) | Abra o `.dmg` e arraste o Takaro para Aplicativos. |
| **Linux** (64 bits) | [`Takaro-Linux.AppImage`](https://github.com/2nxty/Takaro/releases/latest/download/Takaro-Linux.AppImage) | `chmod +x Takaro-Linux.AppImage` e execute. Funciona na maioria das distribuições. |
| **Debian / Ubuntu** | [`Takaro-Linux.deb`](https://github.com/2nxty/Takaro/releases/latest/download/Takaro-Linux.deb) | `sudo apt install ./Takaro-Linux.deb` |

O Discord desktop só é necessário para o Rich Presence.

> [!WARNING]
> **As versões de macOS e Linux são novas** (desde a 0.4.0) e ainda podem ter bugs: o Takaro nasceu no Windows, e esses sistemas usam outro motor web (WebKit). Se algo não funcionar, [abra uma issue](https://github.com/2nxty/Takaro/issues) dizendo qual sistema e versão você usa.

> [!NOTE]
> Os apps ainda não têm assinatura digital. **Windows:** o SmartScreen pode avisar na primeira vez; clique em **Mais informações → Executar assim mesmo**. **macOS:** o Gatekeeper bloqueia a primeira abertura; clique com o botão direito no Takaro → **Abrir**, ou rode `xattr -cr /Applications/Takaro.app`.

**Atualizações:** o Takaro verifica as versões novas e, depois de perguntar, se atualiza sozinho e reinicia: o `.exe` do Windows, o app do macOS e o AppImage do Linux. Com o `.deb` ele abre a página de download (instalar um pacote pede a sua senha). Seu login e suas configurações continuam.

**Por enquanto só no Windows:** extensões de navegador (dependem do WebView2). Todo o resto (plugins, bloqueador de anúncios, letras, links `tak://`, overlay para OBS, Discord) funciona nos três.

## Plugins

Clique no botão **Configurações do Takaro** (ícone de sliders) na barra superior do YouTube Music, ou em **Configurações** no menu da bandeja. O painel tem três abas: **Plugins**, **Extensões** e **Geral** (idioma, escala da página, overlay para OBS, o que o **X** da janela faz — fechar o app ou minimizar para a bandeja —, atualizações e links). As mudanças são salvas na hora; quando alguma precisa recarregar a página, aparece uma barra **Recarregar** embaixo.

| Plugin | O que faz | Opções |
|---|---|---|
| **SponsorBlock** | Pula intros, encerramentos e trechos sem música em clipes, usando a base do [SponsorBlock](https://sponsor.ajay.app). | Categorias |
| **Bloqueador de anúncios** | Remove os anúncios do YouTube Music com as listas do uBlock Origin (baixadas pelo app e atualizadas todo dia). Desligado por padrão. | — |
| **Pular músicas com dislike** | Vai para a próxima faixa quando você dá "não gostei". | — |
| **Desativar autoplay** | Faz as músicas começarem pausadas. | Só na primeira música ao abrir o app (padrão) |
| **Retomar última sessão** | Ao abrir o app, volta para a música, playlist ou mix que você estava ouvindo, no mesmo ponto. Playlists, álbuns, mixes e rádios voltam com a fila; uma fila montada à mão com "Adicionar à fila" só traz de volta a música atual. | Continuar de onde a música parou, começar pausado |
| **Volume preciso** | Roda do mouse sobre a barra do player, setas ↑/↓, um indicador pequeno de porcentagem acima do volume, e o volume fica salvo entre sessões. | Passo (%), setas |
| **Seletor de qualidade** | Botão sobre o player para escolher a qualidade do stream. | — |
| **Vídeo ou capa** | Escolha o que o player mostra: botão Música/Vídeo, sempre só a capa (sem vídeo), ou nada (a fila ocupa a tela). | O player mostra |
| **Fundo do player** | A capa da música atual, desfocada, como fundo na janela inteira enquanto o player está aberto. | — |
| **Barra do player** | Personalizações da barra na parte de baixo. | Barra de vidro (barra e menus translúcidos, com vidro fosco), centralizar botões (controles no meio com os tempos de cada lado, informações da música à esquerda) |
| **Letras sincronizadas** | Letras sincronizadas na aba Letra (veja abaixo). | Abrir a aba Letra quando encontrar a letra |
| **Fechar avisos automaticamente** | Fecha os avisos do YouTube Music ("Salvo nas músicas que gostei"…) depois de alguns segundos. | Segundos |
| **Áudio suave** | As músicas entram e saem com fade em vez de cortar, e as mais baixas sobem até o volume de referência do YouTube (com limitador). Desligado por padrão. | Fade (segundos), normalizar volume |
| **Otimizações de desempenho** | Reduz o uso de CPU do YouTube Music ([CPU Tamer](https://github.com/cyfung1031/userscript-supports)). Desligue se algo se comportar mal. | — |

Embutido (sempre ligado): um controle de **velocidade de reprodução** de 0,25× a 2× no topo do menu ⋮ do player (roda do mouse para passos de 0,01; clique no valor para voltar a 1×), com **Copiar link do Takaro** logo abaixo. O Takaro também corrige o menu ⋮ da barra do player para que um segundo clique o feche.

As configurações visuais (fundo do player, barra do player) e a maioria das opções valem na hora; o painel só pede para recarregar quando a mudança realmente precisa.

## Letras sincronizadas

Abra a aba **Letra** do player. O Takaro procura a música primeiro no [Better Lyrics](https://better-lyrics.boidu.dev) e depois no [LRCLIB](https://lrclib.net); quando existe letra sincronizada, a linha atual fica destacada e acompanha a música, e clicar numa linha pula para aquele ponto. Se só existir o texto, ele aparece como está; se nada for encontrado, fica a letra do próprio YouTube Music. Um selo pequeno mostra de onde veio a letra.

## Takaro Jam

Ouça junto com amigos: todo mundo escuta a mesma música no mesmo momento, cada um no seu YouTube Music (sua conta, seu volume). Nada é transmitido entre as pessoas; a sala só compartilha qual música está tocando, em que ponto e a fila da sala.

- **Criar uma sala:** Configurações do Takaro → **Jam** → digite seu nome → **Criar sala**. Você é o anfitrião: seu player conduz. Compartilhe o código (ex.: `A7K92P`) ou o link de convite `tak://jam/A7K92P`.
- **Entrar:** abra o link de convite (o Takaro abre a aba Jam com o código preenchido) ou cole o código ou o link em **Jam → Entrar numa sala**.
- **Fila compartilhada:** **⋮ → Adicionar ao Jam** em qualquer música (busca, playlists, álbuns, player). A fila da sala toca antes da fila do próprio YouTube Music; ela mostra quem adicionou cada música, o anfitrião pode tocar, reordenar e remover, e os convidados podem remover as que eles mesmos adicionaram. Com a fila vazia, o autoplay do anfitrião continua e todos acompanham.
- **O que os convidados podem fazer** (escolhido pelo anfitrião, dá para mudar durante o Jam):
  1. *Só ouvir*: o anfitrião controla tudo.
  2. *Adicionar músicas à fila* (padrão).
  3. *Adicionar, tocar, pausar, avançar e pular*.

  Quando os convidados não podem controlar, os botões tocar / anterior / próxima deles ficam escondidos e a barra de progresso não pode ser arrastada. O volume é sempre de cada um.
- **Sincronia:** as posições usam o relógio do servidor, e os convidados se corrigem quando ficam mais de 1,5 s fora. Quem estiver vendo um anúncio alcança os outros quando ele termina.
- **Quedas de conexão:** um participante (o anfitrião também) volta como ele mesmo depois de reconectar ou recarregar a página. Se o anfitrião sumir por mais de um minuto, o convidado que entrou primeiro vira o anfitrião. Uma sala vazia é apagada depois de uma hora.
- Enquanto você está num Jam, um botão de fone na barra de título abre a aba Jam.

O servidor das salas é um Cloudflare Worker com um Durable Object por sala, em [`jam-server/`](jam-server/README.md). O endereço dele não fica no repositório: os builds o recebem de `TAKARO_JAM_URL` (veja [Configuração](#configuração)), e ele também pode ser definido em **Jam → Servidor**.

## Links do Takaro (tak://)

Abrir um link `tak://` — pelo navegador, por um chat ou pelo **Win + R** — abre no Takaro; se ele já estiver aberto, a janela atual vai até lá. O registro não precisa de administrador:

- **Windows:** registrado para o seu usuário toda vez que o Takaro abre.
- **macOS:** declarado pelo próprio app.
- **Linux:** um arquivo `.desktop` do seu usuário, definido como o app padrão para `tak://`, toda vez que o Takaro abre. No AppImage ele também é a entrada do app no menu, com ícone.

O botão **Ouvir no Takaro** do cartão do Discord leva a `takaro.im/open/?v=<id>`, que abre a música no Takaro se você tiver o app e oferece o YouTube Music se não tiver.

| Link | Abre |
|---|---|
| `tak://watch/<videoId>` | Uma música |
| `tak://watch/<videoId>/<playlistId>` | Uma música dentro de uma playlist |
| `tak://playlist/<playlistId>` | Uma playlist ou álbum |
| `tak://channel/<UC…>` ou `tak://channel/@handle` | Um artista / canal |
| `tak://music.youtube.com/…` | Qualquer endereço do YouTube Music trocando `https://` por `tak://` (links do YouTube e youtu.be também funcionam) |
| `tak://jam/<CÓDIGO>` | Um convite do [Takaro Jam](#takaro-jam) (abre a aba Jam para entrar) |

Use **⋮ → Copiar link do Takaro** no player para copiar o link da música atual.

## Overlay para OBS

Ligue **Configurações do Takaro → Geral → Overlay para OBS** e copie o endereço que aparece (`http://127.0.0.1:13091/overlay` por padrão; a porta e as cores da barra de progresso podem ser trocadas ali). No OBS, adicione uma fonte **Navegador** (Browser Source) com esse endereço (cerca de 480×140). Ela mostra a capa, o nome, o artista e o progresso da música atual, com o logo do Takaro no canto, sobre fundo transparente. Outros layouts: `?layout=compact` e `?layout=text`. O servidor só escuta no seu próprio computador, e a música atual também fica disponível em JSON em `/now-playing`.

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


## Extensões

No Windows, o Takaro carrega extensões de navegador pelo WebView2. (O macOS e o Linux usam o WebKit, que não roda extensões do Chrome; o plugin **Bloqueador de anúncios** cobre o uso mais comum.)

1. Abra **Configurações do Takaro → Extensões** e clique em **Chrome Web Store** ou **Edge Add-ons**. A loja abre numa nova janela.
2. Abra a página de uma extensão. Uma caixa **Instalar no Takaro** aparece no canto inferior direito (se ela já estiver instalada, a caixa oferece **Atualizar**). Os botões da própria loja ("Usar no Chrome" / "Obter") ficam escondidos, porque só funcionam no Chrome/Edge; os botões de voltar/avançar ficam no canto inferior esquerdo.
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
│  │  ├─ window.rs            # Janela sem moldura, ações da barra de título, zoom da página
│  │  ├─ links.rs             # Protocolo tak://: registro + link → endereço
│  │  ├─ overlay.rs           # Servidor HTTP local do overlay para OBS (overlay.html)
│  │  ├─ updater.rs           # Consulta as releases do GitHub e troca o exe
│  │  ├─ tray.rs              # Ícone e menu da bandeja
│  │  ├─ mini.rs              # Janela do mini player (ui/mini.html)
│  │  ├─ lastfm.rs            # Login e scrobble do Last.fm
│  │  ├─ perf.rs              # Modo de pouca memória do WebView2 com a janela minimizada/escondida
│  │  ├─ i18n/                # Traduções do app: <código>.json (embutidas no build)
│  │  └─ inject/              # JavaScript injetado no music.youtube.com
│  │     ├─ core.js           # Registro de plugins, configurações, i18n, helpers, eventos do player
│  │     ├─ plugins/*.js      # Um arquivo por plugin
│  │     ├─ vendor/           # Scripts de terceiros (CPU Tamer)
│  │     ├─ ui.js             # Painel de configurações, modais, correção do menu ⋮
│     ├─ jam.js            # Takaro Jam: cliente da sala, sincronia, fila compartilhada, aba Jam
│  │     ├─ presence.js       # Lê a faixa atual e envia para o Rust
│  │     └─ store.js          # Caixa "Instalar no Takaro" na janela da loja
│  ├─ capabilities/           # Quais páginas remotas podem chamar quais comandos (YTM, lojas)
│  ├─ build.rs                # Junta src/i18n/*.json + build do Tauri
│  └─ tauri.conf.json
├─ jam-server/                # Servidor do Takaro Jam (Cloudflare Worker + Durable Objects)
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
| `LASTFM_API_KEY`, `LASTFM_API_SECRET` | *(vazio)* | Conta de API do Last.fm para o scrobble ([crie uma](https://www.last.fm/api/account/create)). Igual ao ID do Discord: lida na compilação (ou ao abrir o app), nunca fica no código. Sem elas o card do Last.fm não aparece. |
| `DISCORD_CLIENT_ID` | *(vazio)* | Aplicação do Discord usada na presença. **Não fica no código:** é lida da variável de ambiente `DISCORD_CLIENT_ID` na hora de compilar (vai embutida no exe) e também pode ser definida ao abrir o app (tem prioridade). |
| `TAKARO_JAM_URL` | *(vazio)* | Servidor do Takaro Jam, `wss://…` ([`jam-server/`](jam-server/README.md)). **Não fica no código:** lido do ambiente na compilação (vai embutido) ou ao abrir o app (tem prioridade); os workflows de release o pegam do secret ou da variável `TAKARO_JAM_URL` do repositório. O usuário também pode trocar em Configurações → Jam. |
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

3. O workflow **Release** compila cada sistema no seu próprio runner (`Takaro.exe` e `Takaro-Setup.exe` no Windows, `Takaro-macOS.dmg` universal para Intel e Apple Silicon, `Takaro-Linux.AppImage` e `Takaro-Linux.deb`) e os anexa a uma nova GitHub Release. Os nomes dos arquivos nunca mudam, então os botões de download do site (`releases/latest/download/<arquivo>`) e o atualizador do Windows sempre pegam a versão mais nova.

**Builds de teste privadas:** envie para o branch `tests` (ou um branch `test/…`, ou rode **Actions → Test build**). Os instaladores dos três sistemas vão para um *rascunho* de release, visível só para quem tem acesso de escrita.

**Site:** nas configurações do repositório, ative **Pages → Deploy from a branch → `main` / `docs`**. Para usar um domínio próprio, coloque-o em `docs/CNAME` e crie um registro DNS `CNAME` apontando para `<usuário>.github.io`.

## Dúvidas e problemas

**O card não aparece no Discord.**
Confira se o Discord *desktop* está aberto (a versão do navegador não tem IPC) e se **Configurações de usuário → Privacidade de atividades → Compartilhar minha atividade** está ligado. O Takaro reconecta em até 15 segundos depois que o Discord abre.

**Onde ficam meus dados e como resetar tudo?**
Feche o Takaro e apague a pasta de dados dele: `%LOCALAPPDATA%\com.takaro.player` no Windows, `~/Library/WebKit/com.takaro.player` e `~/Library/Application Support/com.takaro.player` no macOS, `~/.local/share/com.takaro.player` no Linux. Isso desconecta sua conta e reseta todas as configurações.

**Ele bloqueia anúncios?**
Ligue o plugin **Bloqueador de anúncios** (desligado por padrão). Ele usa as listas de filtros do uBlock Origin, baixadas pelo app e atualizadas todo dia, e funciona em todos os sistemas. Com YouTube Premium, não é necessário.

**Linux: "este formato de vídeo não é suportado" / nada toca.**
O WebKit toca mídia pelo GStreamer. O AppImage já traz o seu; com o `.deb` (ou se ainda falhar), instale os codecs: `sudo apt install gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-libav`.

## Créditos

- Plugins portados do [pear-desktop](https://github.com/pear-devs/pear-desktop) (MIT); veja [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- Ideias do visual do player, letras, overlay e `tak://` vindas do [ytmdesktop2](https://github.com/Venipa/ytmdesktop2) (CC0).
- [CPU Tamer](https://github.com/cyfung1031/userscript-supports), de CY Fung (MIT).
- Letras do [Better Lyrics](https://better-lyrics.boidu.dev) e do [LRCLIB](https://lrclib.net).
- [SponsorBlock](https://sponsor.ajay.app) pela base de segmentos.
- Regras do bloqueador de anúncios das listas do [uBlock Origin](https://github.com/uBlockOrigin/uAssets), executadas com os [AdGuard Scriptlets](https://github.com/AdguardTeam/Scriptlets) (ambos GPL-3.0, baixados pelo app, não embutidos).
- [Tauri](https://tauri.app) pelo framework.

## Licença

[MIT](LICENSE) © 2026 2nxty

O Takaro é um projeto independente, sem ligação, endosso ou patrocínio da Google LLC, do YouTube ou da Discord Inc. YouTube Music é marca registrada da Google LLC; Discord é marca registrada da Discord Inc.
