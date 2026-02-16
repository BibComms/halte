/* assets/js/experience.js */
const DATA_URL = "assets/data/experiences.json";

// TODO: Remplace par l'URL du webhook n8n
const N8N_WEBHOOK_URL = "https://ordo.bib.umontreal.ca/webhook/halte-retroaction";
let currentStopFn = null;

/* -----------------------------
   Utils
------------------------------ */

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderChips(list) {
  const row = document.getElementById("chipRow");
  row.innerHTML = (list || [])
    .map((c) => `<span class="chip">${String(c)}</span>`)
    .join("");
}

function getEpisodesUi() {
  const container = document.getElementById("spotifyEpisodes");
  const list = document.getElementById("spotifyEpisodeList");
  const title = document.querySelector(".spotify-episodes__title");
  return { container, list, title };
}

function resetEpisodesUi() {
  const { container, list, title } = getEpisodesUi();
  if (container) container.hidden = true;
  if (list) list.innerHTML = "";
  if (title) {
    title.hidden = true;
    title.textContent = "Épisodes";
  }
}

function openEpisodesUi(titleText = "Épisodes") {
  const { container, list, title } = getEpisodesUi();
  if (!container || !list || !title) return null;
  container.hidden = false;
  title.hidden = false;
  title.textContent = titleText;
  return { container, list, title };
}

async function sendFeedback({ experienceName, sentiment }) {
  if (!N8N_WEBHOOK_URL) {
    console.warn("N8N_WEBHOOK_URL manquant.");
    return;
  }

  try {
    await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experience: experienceName,
        feedback: sentiment,
        sent_at: new Date().toISOString()
      })
    });
  } catch (err) {
    console.error("Erreur webhook n8n:", err);
  }
}

/* -----------------------------
   Players
------------------------------ */

function toYouTubeId(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const idPattern = /^[A-Za-z0-9_-]{11}$/;
  if (idPattern.test(raw)) return raw;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] || "";
      return idPattern.test(id) ? id : "";
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v") || "";
        return idPattern.test(id) ? id : "";
      }

      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && ["embed", "shorts", "live"].includes(parts[0])) {
        const id = parts[1];
        return idPattern.test(id) ? id : "";
      }
    }
  } catch {}

  return "";
}

function normalizeYouTubeEpisodeItem(entry, index) {
  if (!entry) return null;

  if (typeof entry === "string") {
    const youtubeId = toYouTubeId(entry);
    if (!youtubeId) return null;
    return { youtube_id: youtubeId, label: `Épisode ${index + 1}`, start: 0 };
  }

  const youtubeId = toYouTubeId(
    entry.youtube_id ||
    entry.video_id ||
    entry.id ||
    entry.url ||
    entry.src
  );
  if (!youtubeId) return null;

  const label = entry.label || entry.title || entry.name || `Épisode ${index + 1}`;
  const startValue = Number(entry.start || entry.start_at || 0);
  const start = Number.isFinite(startValue) && startValue > 0 ? Math.floor(startValue) : 0;

  return { youtube_id: youtubeId, label, start };
}

function normalizeYouTubeEpisodes(list) {
  return (list || [])
    .map((entry, index) => normalizeYouTubeEpisodeItem(entry, index))
    .filter(Boolean);
}

function setupYouTubeEpisodes(episodes, activeId, onSelect) {
  const ui = openEpisodesUi("Épisodes");
  if (!ui) return;

  const normalized = normalizeYouTubeEpisodes(episodes);
  if (normalized.length === 0) {
    resetEpisodesUi();
    return;
  }

  ui.list.innerHTML = normalized.map((ep, index) => {
    const isActive = ep.youtube_id === activeId;
    return `
      <button class="episode${isActive ? " is-active" : ""}" type="button" data-youtube-id="${ep.youtube_id}" data-start="${ep.start}" aria-pressed="${isActive ? "true" : "false"}">
        ${escapeHtml(ep.label || `Épisode ${index + 1}`)}
      </button>
    `;
  }).join("");

  ui.list.querySelectorAll("[data-youtube-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const youtubeId = btn.getAttribute("data-youtube-id");
      const startAt = Number(btn.getAttribute("data-start") || "0");
      if (!youtubeId) return;
      onSelect(youtubeId, Number.isFinite(startAt) ? startAt : 0);

      ui.list.querySelectorAll(".episode").forEach((el) => {
        el.classList.remove("is-active");
        el.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
    });
  });
}

function mountYouTube({ youtube_id, start = 0, title = "Vidéo", episodes }) {
  const mount = document.getElementById("playerMount");
  mount.innerHTML = "";

  const normalizedEpisodes = normalizeYouTubeEpisodes(episodes);
  const resolvedId = toYouTubeId(youtube_id) || normalizedEpisodes[0]?.youtube_id;
  const resolvedStart = Number.isFinite(Number(start)) ? Math.max(0, Number(start)) : 0;

  if (!resolvedId) {
    mount.innerHTML = `<div class="empty">Lien YouTube manquant.</div>`;
    currentStopFn = null;
    resetEpisodesUi();
    return;
  }

  const mountVideo = (videoId, startAt = 0) => {
    mount.innerHTML = "";
    const src =
      `https://www.youtube-nocookie.com/embed/${videoId}` +
      `?autoplay=1&playsinline=1&rel=0&modestbranding=1&start=${startAt}&controls=1&fs=0`;

    const iframe = document.createElement("iframe");
    iframe.className = "yt";
    iframe.src = src;
    iframe.title = title;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture";
    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-presentation"
    );

    mount.appendChild(iframe);
    currentStopFn = () => {
      iframe.src = "about:blank";
      iframe.remove();
    };
  };

  mountVideo(resolvedId, resolvedStart);
  if (normalizedEpisodes.length > 0) {
    setupYouTubeEpisodes(normalizedEpisodes, resolvedId, mountVideo);
  } else {
    resetEpisodesUi();
  }
}

function toSpotifyEmbedUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname !== "open.spotify.com") return url;
    if (u.pathname.startsWith("/embed/")) return url;

    const parts = u.pathname.split("/").filter(Boolean);
    const type = parts[0];
    const id = parts[1];
    if (!type || !id) return url;

    return `https://open.spotify.com/embed/${type}/${id}`;
  } catch {
    return url;
  }
}

let spotifyIframeApiPromise = null;
let spotifyIframeApi = null;

function toSpotifyUri(value) {
  if (!value) return "";
  if (String(value).startsWith("spotify:")) return String(value);
  try {
    const u = new URL(value);
    if (!u.hostname.endsWith("spotify.com")) return "";
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed") parts.shift();
    const type = parts[0];
    const id = parts[1];
    if (!type || !id) return "";
    return `spotify:${type}:${id}`;
  } catch {
    return "";
  }
}

function loadSpotifyIframeApi() {
  if (spotifyIframeApi) return Promise.resolve(spotifyIframeApi);
  if (spotifyIframeApiPromise) return spotifyIframeApiPromise;

  spotifyIframeApiPromise = new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = (IFrameAPI) => {
      spotifyIframeApi = IFrameAPI;
      resolve(IFrameAPI);
    };
    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    script.onerror = () => reject(new Error("Spotify iframe API failed to load."));
    document.body.appendChild(script);
  });

  return spotifyIframeApiPromise;
}

function normalizeEpisodeItem(entry) {
  if (!entry) return null;
  if (typeof entry === "string") {
    const uri = toSpotifyUri(entry);
    return uri ? { uri, label: "Épisode" } : null;
  }
  const uri = toSpotifyUri(entry.uri || entry.spotify_uri || entry.embed_url || entry.src);
  if (!uri) return null;
  const label = entry.label || entry.title || entry.name || "Épisode";
  return { uri, label };
}

function normalizeEpisodes(list) {
  return (list || [])
    .map(normalizeEpisodeItem)
    .filter(Boolean);
}

function setupSpotifyEpisodes(controller, episodes, activeUri) {
  const ui = openEpisodesUi("Épisodes");
  if (!ui) return;

  const normalized = normalizeEpisodes(episodes);

  if (normalized.length === 0) {
    resetEpisodesUi();
    return;
  }

  ui.list.innerHTML = normalized.map((ep, index) => {
    const isActive = ep.uri === activeUri;
    return `
      <button class="episode${isActive ? " is-active" : ""}" type="button" data-spotify-id="${ep.uri}" aria-pressed="${isActive ? "true" : "false"}">
        ${escapeHtml(ep.label || `Épisode ${index + 1}`)}
      </button>
    `;
  }).join("");

  ui.list.querySelectorAll("[data-spotify-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const uri = btn.getAttribute("data-spotify-id");
      if (!uri) return;
      controller.loadUri(uri);
      ui.list.querySelectorAll(".episode").forEach((el) => {
        el.classList.remove("is-active");
        el.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
    });
  });
}

async function mountSpotify({ embed_url, src, uri, title = "Audio Spotify", episodes }) {
  const mount = document.getElementById("playerMount");
  mount.innerHTML = "";

  const spotifyUri = uri || toSpotifyUri(embed_url || src);
  if (!spotifyUri) {
    mount.innerHTML = `<div class="empty">Lien Spotify manquant.</div>`;
    currentStopFn = null;
    return;
  }

  const normalizedEpisodes = normalizeEpisodes(episodes);
  const initialUri = normalizedEpisodes[0]?.uri || spotifyUri;

  const iframeHost = document.createElement("div");
  iframeHost.className = "spotify";
  mount.appendChild(iframeHost);

  try {
    const IFrameAPI = await loadSpotifyIframeApi();
    IFrameAPI.createController(
      iframeHost,
      { uri: initialUri, width: "100%", height: "352" },
      (controller) => {
        currentStopFn = () => {
          try {
            if (controller && typeof controller.destroy === "function") {
              controller.destroy();
            }
          } catch {}
          mount.innerHTML = "";
        };
        setupSpotifyEpisodes(controller, normalizedEpisodes, initialUri);
      }
    );
  } catch (err) {
    console.error(err);
    mount.innerHTML = `<div class="empty">Erreur de chargement Spotify.</div>`;
    currentStopFn = null;
  }
}

function mountPodcasters({ embed_url, src, title = "Podcast" }) {
  const mount = document.getElementById("playerMount");
  mount.innerHTML = "";

  const resolvedUrl = embed_url || src;
  if (!resolvedUrl) {
    mount.innerHTML = `<div class="empty">Lien podcast manquant.</div>`;
    currentStopFn = null;
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.className = "podcasters";
  iframe.src = resolvedUrl;
  iframe.title = title;
  iframe.loading = "lazy";
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("scrolling", "no");

  mount.appendChild(iframe);
  currentStopFn = null;
}

function mountAudio({ src, title = "Audio" }) {
  const mount = document.getElementById("playerMount");
  mount.innerHTML = "";

  const audio = document.createElement("audio");
  audio.controls = true;
  audio.autoplay = true;
  audio.src = src;
  audio.setAttribute("aria-label", title);

  mount.appendChild(audio);

  currentStopFn = () => {
    audio.pause();
    audio.currentTime = 0;
  };
}

/* -----------------------------
   Init
------------------------------ */

async function init() {
  const id = qs("id");
  if (!id) {
    window.location.href = "index.html";
    return;
  }

  const res = await fetch(DATA_URL, { cache: "no-store" });
  const items = await res.json();
  const item = items.find((x) => x.id === id);

  if (!item) {
    window.location.href = "index.html";
    return;
  }

  const expH2 = document.getElementById("expH2");
  if (expH2) expH2.textContent = item.title;
  document.getElementById("expDesc").textContent = item.description || "";
  renderChips(item.category);
  resetEpisodesUi();

  const p = item.player || {};
  document.body.classList.remove("experience--spotify", "experience--podcasters");

  if (p.kind === "youtube_embed") {
    mountYouTube({ ...p, title: item.title });
  } else if (p.kind === "audio") {
    mountAudio({ ...p, title: item.title });
  } else if (p.kind === "spotify_embed") {
    document.body.classList.add("experience--spotify");
    mountSpotify({ ...p, title: item.title });
  } else if (p.kind === "podcasters_embed") {
    document.body.classList.add("experience--podcasters");
    mountPodcasters({ ...p, title: item.title });
  }

  const stopBtn = document.getElementById("stopBtn");
  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      if (currentStopFn) currentStopFn();
    });
  }

  const experienceName = item.title;
  const yesLink = document.getElementById("feedbackYes");
  const noLink = document.getElementById("feedbackNo");
  const feedbackNotice = document.getElementById("feedbackNotice");
  const feedbackText = document.getElementById("feedbackText");
  const feedbackLinks = document.getElementById("feedbackLinks");

  function finalizeFeedback(sentiment) {
    sendFeedback({ experienceName, sentiment });
    if (feedbackNotice) {
      feedbackNotice.textContent = "Merci!";
    } else {
      if (feedbackText) feedbackText.textContent = "Merci!";
      if (feedbackLinks) feedbackLinks.hidden = true;
    }
  }

  if (yesLink) {
    yesLink.addEventListener("click", (e) => {
      e.preventDefault();
      finalizeFeedback("up");
    }, { once: true });
  }
  if (noLink) {
    noLink.addEventListener("click", (e) => {
      e.preventDefault();
      finalizeFeedback("down");
    }, { once: true });
  }
}

init();
