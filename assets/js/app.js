/* assets/js/app.js */
const DATA_URL = "assets/data/experiences.json";

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function badgeForType(item) {
  const type = String(item?.type || "").trim().toLowerCase();
  if (type === "video") return "Vidéo";
  if (type) return "Audio";

  const kind = String(item?.player?.kind || "").trim().toLowerCase();
  if (kind === "youtube_embed") return "Vidéo";
  return "Audio";
}

function makeCard(item) {
  const tags = (item.category || []).slice(0, 3).map(t => `<span class="chip">${escapeHtml(t)}</span>`).join("");
  const duration = item.duration_min ? `${item.duration_min} min` : "";
  const level = item.level ? `• ${escapeHtml(item.level)}` : "";

   return `
    <article class="card embla__slide" role="group" aria-label="${escapeHtml(item.title)}">
      <div class="card__media" style="background-image:url('${escapeHtml(item.cover)}')"></div>
      <div class="card__body">
        <div class="card__kicker">
          <span class="pill">${escapeHtml(badgeForType(item))}</span>
          <span class="muted">${escapeHtml(duration)} ${level}</span>
        </div>
        <h3 class="card__title">${escapeHtml(item.title)}</h3>
        <p class="card__desc">${escapeHtml(item.description || "")}</p>
        <div class="chips">${tags}</div>

        <div class="card__actions">
          <a class="btn btn--primary" href="experience.html?id=${encodeURIComponent(item.id)}">Démarrer</a>
        </div>
      </div>
    </article>
  `;
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function hasTag(item, keywords) {
  const tags = (item.category || []).map(normalizeText);
  return keywords.some((k) => tags.some((t) => t.includes(normalizeText(k))));
}

const CATEGORY_DEFS = [
  {
    id: "balados",
    label: "Balados",
    match: (item) => hasTag(item, ["balado"])
  },
  {
    id: "respiration",
    label: "Exercices de respiration",
    match: (item) => hasTag(item, ["respiration"])
  },
  {
    id: "cepsum-pause-active",
    label: "CEPSUM - PAUSE ACTIVE",
    match: (item) => hasTag(item, ["cepsum - pause active"])
  },
  {
    id: "meditation",
    label: "Méditations",
    match: (item) => hasTag(item, ["meditation"])
  },
  {
    id: "musique",
    label: "Musique",
    match: (item) => hasTag(item, ["musique"])
  },
  {
    id: "concentration",
    label: "Concentration",
    match: (item) => hasTag(item, ["focus", "concentration"])
  },
  {
    id: "ambiance",
    label: "Ambiances sonores",
    match: (item) => hasTag(item, ["ambiance", "relaxation"])
  },
  {
    id: "sante",
    label: "Santé mentale",
    match: (item) => hasTag(item, ["sante mentale", "infos utiles"])
  },
  {
    id: "udem",
    label: "Coup de coeur des bibliothèques UdeM",
    match: (item) => hasTag(item, ["coup de coeur"])
  },
  {
    id: "motivation",
    label: "Motivation & études",
    match: (item) => hasTag(item, ["motivation", "vie etudiante"])
  }
];

function renderCategoryPanels(items) {
  const host = document.getElementById("categoryPanels");
  if (!host) return [];

  const categories = CATEGORY_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    items: items.filter(def.match)
  })).filter((cat) => cat.items.length > 0);

  host.innerHTML = categories.map((cat) => {
    const emblaId = `embla-${cat.id}`;
    const viewportId = `emblaViewport-${cat.id}`;
    const prevId = `prevBtn-${cat.id}`;
    const nextId = `nextBtn-${cat.id}`;
    const dotsId = `dots-${cat.id}`;
    return `
      <section class="panel panel--category" data-category="${escapeHtml(cat.id)}">
        <div class="panel__head">
          <h2 class="panel__title">${escapeHtml(cat.label)}</h2>
          <div class="panel__controls">
            <button class="btn btn--ghost btn--square" type="button" id="${prevId}" aria-label="Précédent" aria-controls="${viewportId}">←</button>
            <button class="btn btn--ghost btn--square" type="button" id="${nextId}" aria-label="Suivant" aria-controls="${viewportId}">→</button>
          </div>
        </div>

        <div class="embla" id="${emblaId}" role="region" aria-roledescription="carrousel" aria-label="Carrousel ${escapeHtml(cat.label)}">
          <div class="embla__viewport" id="${viewportId}">
            <div class="embla__container">
              ${cat.items.map(makeCard).join("")}
            </div>
          </div>

          <div class="embla__dots" id="${dotsId}"></div>
        </div>
      </section>
    `;
  }).join("");

  return categories;
}



async function init() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  const items = await res.json();

  const categories = renderCategoryPanels(items);

  categories.forEach((cat) => {
    const emblaRoot = document.getElementById(`embla-${cat.id}`);
    if (!emblaRoot) return;
    const viewport = emblaRoot.querySelector(".embla__viewport");

    const emblaApi = EmblaCarousel(viewport, {
      loop: false,
      align: "start",
      skipSnaps: false,
      dragFree: false
    });

    const prevBtn = document.getElementById(`prevBtn-${cat.id}`);
    const nextBtn = document.getElementById(`nextBtn-${cat.id}`);
    if (prevBtn) prevBtn.addEventListener("click", () => { emblaApi.scrollPrev(); });
    if (nextBtn) nextBtn.addEventListener("click", () => { emblaApi.scrollNext(); });

    const dots = document.getElementById(`dots-${cat.id}`);
    function renderDots() {
      if (!dots) return;
      dots.innerHTML = emblaApi.scrollSnapList().map((_, i) => {
        const isSelected = i === emblaApi.selectedScrollSnap();
        return `<button class="dot ${isSelected ? "is-selected" : ""}" type="button" aria-label="Aller à ${i + 1} — ${escapeHtml(cat.label)}" data-dot="${i}"></button>`;
      }).join("");
      dots.querySelectorAll("[data-dot]").forEach((btn) => {
        btn.addEventListener("click", () => {
          emblaApi.scrollTo(Number(btn.dataset.dot));
        });
      });
    }
    emblaApi.on("select", renderDots);
    renderDots();
  });

}

init().catch((err) => {
  console.error(err);
});
