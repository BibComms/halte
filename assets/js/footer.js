async function loadSharedFooter() {
  const mount = document.getElementById("footerMount");
  if (!mount) return;

  const src = mount.dataset.footerSrc || "assets/partials/footer.html";

  try {
    const res = await fetch(src, { cache: "no-store" });
    if (!res.ok) return;
    mount.innerHTML = await res.text();
    const yearEl = mount.querySelector("#footerYear");
    if (yearEl) yearEl.textContent = `— ${new Date().getFullYear()}`;
  } catch (err) {
    console.error("Erreur de chargement du footer:", err);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadSharedFooter();
});
