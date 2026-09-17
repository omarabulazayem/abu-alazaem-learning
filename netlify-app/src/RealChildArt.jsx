const assetBase = import.meta.env.BASE_URL || "/";
const heroSrc = `${assetBase}assets/hero-kids.webp?v=3`;
const cardsSrc = `${assetBase}assets/world-card-art.webp?v=3`;

function setStyles(node, styles) {
  Object.assign(node.style, styles);
}

function ensureHeroArt() {
  document.querySelectorAll(".homeHeroVisual").forEach((host) => {
    if (host.querySelector(":scope > .real-child-hero-img")) return;
    host.style.position = "relative";
    host.style.overflow = "hidden";
    const img = document.createElement("img");
    img.className = "real-child-hero-img";
    img.src = heroSrc;
    img.alt = "طفلان سعيدان مع المصحف في عالم تعليمي ملوّن";
    img.loading = "eager";
    img.decoding = "async";
    setStyles(img, {
      position: "absolute",
      inset: "14px",
      width: "calc(100% - 28px)",
      height: "calc(100% - 28px)",
      objectFit: "cover",
      objectPosition: "center 56%",
      zIndex: "40",
      display: "block",
      borderRadius: "26px",
      opacity: "1",
      visibility: "visible",
      pointerEvents: "none",
    });
    img.addEventListener("error", () => img.remove(), { once: true });
    host.appendChild(img);
  });
}

function artIndex(host) {
  if (host.classList.contains("play")) return 0;
  if (host.classList.contains("memorize")) return 1;
  if (host.classList.contains("review")) return 2;
  if (host.closest(".rewards") || host.classList.contains("rewards")) return 3;
  return 4;
}

function ensureCardArt() {
  document.querySelectorAll(".home-world-art,.child-world-art").forEach((host) => {
    if (host.querySelector(":scope > .real-world-art")) return;
    host.style.position = "relative";
    host.style.overflow = "hidden";

    const frame = document.createElement("span");
    frame.className = "real-world-art";
    frame.setAttribute("aria-hidden", "true");
    setStyles(frame, {
      position: "absolute",
      inset: "0",
      zIndex: "6",
      overflow: "hidden",
      display: "block",
      pointerEvents: "none",
      borderRadius: "inherit",
      background: "rgba(255,255,255,.72)",
    });

    const img = document.createElement("img");
    img.src = cardsSrc;
    img.alt = "";
    img.loading = "eager";
    img.decoding = "async";
    const index = artIndex(host);
    setStyles(img, {
      position: "absolute",
      top: "50%",
      left: `${index * -100}%`,
      width: "500%",
      maxWidth: "none",
      height: "auto",
      transform: "translateY(-50%)",
      display: "block",
      opacity: "1",
      visibility: "visible",
    });
    img.addEventListener("error", () => frame.remove(), { once: true });
    frame.appendChild(img);
    host.appendChild(frame);
  });
}

function applyArtwork() {
  ensureHeroArt();
  ensureCardArt();
}

export function installRealChildArt() {
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      applyArtwork();
    });
  };

  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
  window.addEventListener("popstate", schedule);
  return () => {
    observer.disconnect();
    window.removeEventListener("popstate", schedule);
  };
}
