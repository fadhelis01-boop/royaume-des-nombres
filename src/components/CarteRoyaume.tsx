import { useEffect, useMemo, useRef } from "react";
import { go } from "../lib/router";
import { worldProgress, worldUnlocked } from "../lib/content";
import { useStore } from "../lib/store";
import type { Child, World } from "../lib/types";
import { Avatar } from "./Avatar";

// La carte du Royaume : un long chemin qui monte du Nid jusqu'au Temple.
// Chaque monde est un lieu ; quand son cristal est rallumé, le lieu reprend
// ses couleurs et se repeuple (le Royaume se reconstruit sous les yeux de l'enfant).
// Dessinée par le programme en attendant l'illustration (cahier des charges, section 10).

const DECO: Record<string, string[]> = {
  "nid-des-nombres": ["🥚", "🐣", "🪺"],
  "foret-des-nombres": ["🌳", "🐿️", "🍄"],
  "prairie-des-additions": ["🌼", "🐰", "🥕"],
  "montagne-des-multiplications": ["🏔️", "🌰", "🦫"],
  "riviere-du-partage": ["🐟", "🦫", "🌊"],
  "marche-des-mesures": ["⚖️", "🍯", "🕒"],
  "cite-des-formes": ["🏠", "🔺", "🟦"],
  "village-des-fractions": ["🍰", "🍕", "🎉"],
  "port-des-decimaux": ["⛵", "🐚", "🦀"],
  "atelier-des-problemes": ["🔎", "🧰", "💡"],
  "jardin-de-fibonacci": ["🌻", "🐌", "🌀"],
  "tour-des-proportions": ["🗼", "🗺️", "🚂"],
  "royaume-des-relatifs": ["🧊", "🐧", "👑"],
  "grotte-de-l-algebre": ["🔮", "🦎", "⚖️"],
  "chateau-de-la-geometrie": ["🏰", "📐", "🐐"],
  "tour-des-puissances": ["🚀", "⭐", "📦"],
  "observatoire-des-donnees": ["🔭", "📊", "🌠"],
  "labyrinthe-des-fonctions": ["🎢", "🌿", "🗺️"],
  "volcan-du-second-degre": ["🌋", "🔥", "📕"],
  "palais-de-l-arithmetique": ["🔐", "🏮", "📗"],
  "jardin-des-suites": ["🪜", "🌱", "📘"],
  "vallee-des-derivees": ["🏔️", "🎿", "📙"],
  "monts-exponentiels": ["📈", "🪷", "📒"],
  "mer-des-integrales": ["🌊", "⛵", "📓"],
  "fete-foraine-des-probabilites": ["🎡", "🎲", "📔"],
  "archipel-des-vecteurs": ["🏝️", "🧭", "⛵"],
  "ile-des-complexes": ["🌙", "🌴", "🔷"],
  "pont-des-matrices": ["🌉", "⚙️", "🟦"],
  "temple-de-la-logique": ["🏛️", "📜", "✨"],
};

const STEP = 116; // espacement vertical entre deux lieux (px)

export function CarteRoyaume({
  worlds,
  child,
}: {
  worlds: World[];
  child: Child;
}) {
  const settings = useStore((s) => s.settings);
  const list = useMemo(
    () => worlds.filter((w) => w.id !== "ecole-des-astuces"),
    [worlds],
  );
  const H = list.length * STEP + 140;
  const pos = list.map((_, i) => ({
    x: 50 + 30 * Math.sin(i * 0.95),
    y: H - 90 - i * STEP,
  }));
  const crystals = child.crystals ?? [];
  // lieu courant : le dernier monde ouvert et pas encore terminé
  const cur = (() => {
    let k = 0;
    list.forEach((w, i) => {
      if (
        worldUnlocked(child, w, worlds, settings) &&
        (worldProgress(child, w).ratio < 1 || !crystals.includes(w.id))
      )
        k = k || i;
    });
    const firstOpen = list.findIndex(
      (w) =>
        worldUnlocked(child, w, worlds, settings) && !crystals.includes(w.id),
    );
    return firstOpen >= 0 ? firstOpen : k;
  })();
  const ref = useRef<HTMLDivElement>(null);
  // la fenêtre de la carte s'ouvre sur le lieu où se trouve l'enfant (sans faire défiler la page)
  useEffect(() => {
    const v = ref.current;
    if (v) v.scrollTop = Math.max(0, pos[cur].y - v.clientHeight / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // chemin lissé (courbes de Bézier) entre les lieux, en coordonnées 0–100 × px
  const d = pos
    .map((p, i) =>
      i === 0
        ? `M ${p.x} ${p.y}`
        : `C ${pos[i - 1].x} ${pos[i - 1].y - STEP / 2}, ${p.x} ${p.y + STEP / 2}, ${p.x} ${p.y}`,
    )
    .join(" ");
  const bands = (["maitres", "explorateurs", "graines"] as const).map((cy) => {
    const idx = list
      .map((w, i) => (w.cycle === cy ? i : -1))
      .filter((i) => i >= 0);
    if (!idx.length) return null;
    const top = Math.min(...idx.map((i) => pos[i].y)) - STEP / 2;
    const bottom = Math.max(...idx.map((i) => pos[i].y)) + STEP / 2;
    return {
      cy,
      top: Math.max(0, top - (cy === "maitres" ? 60 : 0)),
      h:
        bottom -
        top +
        (cy === "graines" ? 60 : 0) +
        (cy === "maitres" ? 60 : 0),
    };
  });

  return (
    <div className="royaume-view" ref={ref}>
      <div
        className="royaume-map"
        style={{ height: H }}
        aria-label="Carte du Royaume"
      >
        {bands.map(
          (b) =>
            b && (
              <div
                key={b.cy}
                className={`rm-band rm-${b.cy}`}
                style={{ top: b.top, height: b.h }}
              />
            ),
        )}
        <svg
          className="rm-path"
          viewBox={`0 0 100 ${H}`}
          preserveAspectRatio="none"
          width="100%"
          height={H}
          aria-hidden
        >
          <path
            d={d}
            fill="none"
            stroke="var(--rm-path)"
            strokeWidth={14}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={d}
            fill="none"
            stroke="var(--rm-path-dash)"
            strokeWidth={3}
            strokeDasharray="2 10"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {list.map((w, i) => {
          const p = pos[i];
          const open = worldUnlocked(child, w, worlds, settings);
          const pr = worldProgress(child, w);
          const lit = crystals.includes(w.id);
          const deco = DECO[w.id] ?? [w.emoji];
          const side = p.x > 50 ? -1 : 1;
          return (
            <div key={w.id}>
              {deco.map((e, k) => (
                <span
                  key={k}
                  className={`rm-deco ${lit ? "lit" : "dim"}`}
                  style={{
                    left: `calc(${p.x + side * (18 + k * 9)}% - 14px)`,
                    top: p.y - 30 + (k % 2) * 34,
                  }}
                  aria-hidden
                >
                  {e}
                </span>
              ))}
              <button
                className={`rm-node ${open ? "" : "locked"} ${lit ? "lit" : ""} ${i === cur ? "current" : ""}`}
                style={
                  {
                    left: `${p.x}%`,
                    top: p.y,
                    "--wc": w.couleur,
                    "--pr": `${pr.ratio * 360}deg`,
                  } as React.CSSProperties
                }
                onClick={() => (open ? go(`/monde/${w.id}`) : undefined)}
                aria-disabled={!open}
                aria-label={`${w.titre}${open ? `, ${pr.done} leçons sur ${pr.total}` : ", fermé"}${lit ? ", cristal rallumé" : ""}`}
              >
                <span className="rm-ring" />
                <span className="rm-emoji">{open ? w.emoji : "🔒"}</span>
                {lit && <span className="rm-crystal">💎</span>}
                <span className="rm-label">
                  {w.titre.replace(/^(Le |La |L'|Les )/, "")}
                </span>
              </button>
              {i === cur && (
                <span
                  className="rm-me"
                  style={{
                    left: `calc(${p.x}% + ${side * 46}px)`,
                    top: p.y - 64,
                  }}
                >
                  <Avatar child={child} size={56} showCompanion={false} />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
