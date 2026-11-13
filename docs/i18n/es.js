// Español — copy this file to add a language, then add a <script> line in index.html.
TakaroI18n.add("es", "Español", {
  "meta": {
    "title": "Takaro — YouTube Music en el escritorio, con Discord Rich Presence",
    "description": "Un reproductor de YouTube Music para Windows, ligero, que muestra en Discord lo que estás escuchando. Sin Electron, unos 4 MB."
  },
  "announce": {
    "text": "Takaro es de código abierto, con licencia MIT.",
    "link": "Dale una estrella en GitHub"
  },
  "nav": {
    "skip": "Saltar al contenido",
    "features": "Funciones",
    "plugins": "Plugins",
    "faq": "Preguntas",
    "extensions": "Extensiones",
    "language": "Idioma",
    "cta": "Descargar"
  },
  "hero": {
    "eyebrow": "YouTube Music · Discord · Windows",
    "title": "Tu música en el escritorio. Tu estado en Discord.",
    "subtitle": "Takaro abre el YouTube Music de siempre en una ventana nativa y ligera, y muestra en tu perfil de Discord lo que suena: portada, barra de progreso en vivo y un botón para que tus amigos escuchen también.",
    "download": "Descargar para Windows",
    "github": "Ver en GitHub",
    "meta1": ".exe portable de ~4 MB",
    "meta2": "Sin Electron",
    "meta3": "Gratis y de código abierto"
  },
  "demo": {
    "label": "Discord Rich Presence",
    "caption": "Así te ven tus amigos mientras Takaro reproduce.",
    "listening": "Escuchando",
    "paused": "En pausa",
    "listenButton": "Escuchar en YouTube Music",
    "memberStatus": "Escuchando",
    "tabPlaying": "Reproduciendo",
    "tabPaused": "En pausa"
  },
  "features": {
    "title": "App pequeña, todo lo que necesitas",
    "subtitle": "El YouTube Music completo que ya usas, sin un navegador pesado encima.",
    "presence": {
      "title": "Rich Presence bien hecho",
      "text": "Portada, artista, álbum, barra de progreso en vivo y botones para tus amigos. Cuando pausas, tu estado sigue ahí y muestra que está en pausa, en lugar de desaparecer."
    },
    "light": {
      "title": "Ligero de verdad",
      "text": "Hecho con Tauri y el WebView2 que ya trae Windows. Sin Chromium incluido, sin Electron."
    },
    "account": {
      "title": "Tu cuenta, tu biblioteca",
      "text": "Es el reproductor web oficial de YouTube Music: inicia sesión y tendrás tus listas, me gusta, mixes y letras."
    },
    "plugins": {
      "title": "Plugins incluidos",
      "text": "SponsorBlock, volumen preciso, velocidad de reproducción y más. Activa o desactiva cada uno en el panel de Takaro."
    },
    "open": {
      "title": "Código abierto",
      "text": "Licencia MIT. Lee el código, abre un issue, crea un plugin o una traducción."
    },
    "more": "Más información",
    "code": "Ver el código"
  },
  "plugins": {
    "title": "Plugins",
    "subtitle": "Abre el panel de Takaro desde la barra superior de YouTube Music para configurarlos.",
    "sponsorblock": "Salta intros, cierres y partes sin música de los videoclips usando la base de SponsorBlock.",
    "dislikedName": "Saltar canciones con no me gusta",
    "disliked": "Pasa a la siguiente pista cuando marcas \"no me gusta\".",
    "autoplayName": "Desactivar reproducción automática",
    "autoplay": "Abre la app sin que empiece a sonar música. La primera canción empieza en pausa.",
    "resumeName": "Reanudar última sesión",
    "resume": "Vuelve a abrir la canción, lista o mix que escuchabas, justo donde se quedó.",
    "volumeName": "Volumen preciso",
    "volume": "Rueda del ratón sobre la barra del reproductor y flechas, pasos de 1%, un indicador pequeño sobre el control, y tu volumen se guarda.",
    "speedName": "Velocidad de reproducción",
    "speed": "De 0,07× a 16×, directamente en el menú ⋮ del reproductor.",
    "qualityName": "Selector de calidad",
    "quality": "Elige la calidad del stream con un botón sobre el reproductor.",
    "videoName": "Video o portada",
    "video": "Muestra el videoclip, solo la portada, u oculta el reproductor.",
    "note": "Los plugins están portados de pear-desktop (MIT)."
  },
  "extensions": {
    "title": "Extensiones del navegador",
    "subtitle": "Instala extensiones de Chrome Web Store o de Edge Add-ons directamente en Takaro.",
    "step1Title": "Abre una tienda",
    "step1": "En los ajustes de Takaro, abre la pestaña Extensiones y elige Chrome Web Store o Edge Add-ons.",
    "step2Title": "Instala en Takaro",
    "step2": "En la página de cualquier extensión, usa el cuadro \"Instalar en Takaro\" de la esquina.",
    "step3Title": "Recarga y gestiona",
    "step3": "Recarga Takaro para usarla. Activa, desactiva, abre las opciones o quita las extensiones en la misma pestaña.",
    "note": "Funcionan mejor las extensiones que modifican las páginas (bloqueadores, temas, ajustes). Los popups de la barra de herramientas no están disponibles, y algunas APIs de Chrome no son compatibles."
  },
  "download": {
    "title": "Consigue Takaro",
    "text": "Un solo .exe portable. Sin instalador y sin otra cuenta que la tuya de YouTube.",
    "button": "Descargar para Windows",
    "meta": "Windows 10 u 11 · x64 · requiere Microsoft Edge WebView2 (ya incluido en Windows)",
    "smartscreen": "El .exe aún no tiene firma digital, así que SmartScreen de Windows puede avisarte. Haz clic en \"Más información\" → \"Ejecutar de todas formas\"."
  },
  "faq": {
    "title": "Preguntas",
    "q1": "¿Takaro es una app oficial de YouTube o de Discord?",
    "a1": "No. Takaro es un proyecto independiente y de código abierto, sin relación con Google, YouTube ni Discord.",
    "q2": "¿Necesito tener Discord abierto?",
    "a2": "Solo para el Rich Presence. Sin él, Takaro funciona como un reproductor normal, y se conecta solo cuando abres Discord.",
    "q3": "¿Dónde se guardan mis datos?",
    "a3": "Tu sesión de YouTube y tus ajustes se quedan en tu computadora, en el perfil de WebView2 en %LOCALAPPDATA%\\com.takaro.player. Takaro no tiene servidor y no recopila nada.",
    "q4": "¿Funciona en macOS o Linux?",
    "a4": "Todavía no. Por ahora Takaro es solo para Windows. Las contribuciones son bienvenidas.",
    "q5": "¿Cómo agrego una traducción?",
    "a5": "Copia uno de los archivos de traducción, traduce los valores y abre un pull request. El README explica dónde están los archivos, tanto de la app como de este sitio."
  },
  "footer": {
    "tagline": "YouTube Music en el escritorio, con Discord Rich Presence.",
    "releases": "Versiones",
    "issues": "Reportar un problema",
    "disclaimer": "Licencia MIT. YouTube Music es una marca de Google LLC y Discord es una marca de Discord Inc. Takaro no tiene relación con ninguna de las dos."
  }
});
