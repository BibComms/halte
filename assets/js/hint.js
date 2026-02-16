const HINT_STORAGE_KEY = "hintModalDismissed";

async function loadHintModal() {
  const mount = document.getElementById("hintMount");
  if (!mount) return null;

  const src = mount.dataset.hintSrc || "assets/partials/hint.html";
  const res = await fetch(src, { cache: "no-store" });
  if (!res.ok) return null;
  mount.innerHTML = await res.text();

  return initHintModal();
}

function initHintModal() {
  const modal = document.getElementById("hintModal");
  const closeBtn = document.getElementById("hintCloseBtn");
  const main = document.getElementById("main");
  const backdrop = modal ? modal.querySelector("[data-modal-close]") : null;
  if (!modal || !closeBtn) return null;

  function updateHintState(show) {
    const showLink = document.getElementById("hintShowLink");
    modal.classList.toggle("is-open", show);
    modal.setAttribute("aria-hidden", show ? "false" : "true");
    document.body.classList.toggle("modal-open", show);
    if (main) main.setAttribute("aria-hidden", show ? "true" : "false");
    if (showLink) {
      showLink.setAttribute("aria-expanded", show ? "true" : "false");
      showLink.textContent = show ? "Fermer À propos" : "À propos";
    }
    if (show) {
      setTimeout(() => closeBtn.focus(), 0);
    }
  }

  function dismissHint() {
    try {
      localStorage.setItem(HINT_STORAGE_KEY, "1");
    } catch {}
    updateHintState(false);
  }

  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const showLink = target.closest("#hintShowLink");
    if (!showLink) return;
    e.preventDefault();
    updateHintState(true);
  });

  closeBtn.addEventListener("click", dismissHint);
  if (backdrop) backdrop.addEventListener("click", dismissHint);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      dismissHint();
    }
  });

  return {
    open: () => updateHintState(true),
    close: () => updateHintState(false),
    isDismissed: () => {
      try {
        return localStorage.getItem(HINT_STORAGE_KEY) === "1";
      } catch {
        return false;
      }
    }
  };
}

window.addEventListener("load", async () => {
  const hintModal = await loadHintModal();
  if (hintModal && !hintModal.isDismissed()) {
    hintModal.open();
  }
});
