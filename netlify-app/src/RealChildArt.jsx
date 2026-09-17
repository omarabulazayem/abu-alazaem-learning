import React from "react";

const assetBase = import.meta.env.BASE_URL || "/";

export function RealHeroArt({ alt = "طفلان سعيدان يتعلمان القرآن" }) {
  return (
    <img
      className="real-child-hero-img"
      src={`${assetBase}assets/hero-kids.webp`}
      alt={alt}
      loading="eager"
      decoding="async"
      onError={(event) => { event.currentTarget.style.display = "none"; }}
    />
  );
}

export function RealWorldArt({ tone = "memorize", alt = "" }) {
  const index = tone === "play" ? 0 : tone === "memorize" ? 1 : tone === "review" ? 2 : tone === "rewards" ? 3 : 4;
  return (
    <span className={`real-world-art real-world-art-${tone}`} aria-hidden={alt ? undefined : "true"}>
      <img
        src={`${assetBase}assets/world-card-art.webp`}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={{ "--art-index": index }}
        onError={(event) => { event.currentTarget.style.display = "none"; }}
      />
    </span>
  );
}
