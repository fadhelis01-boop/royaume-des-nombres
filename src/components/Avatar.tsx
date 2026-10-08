import type { Child } from "../lib/types";
import { ANCHORS, itemById } from "../lib/shop";
import { Mascot } from "./Mascot";
import { Icone } from "./Icone";

/** Le personnage de l'enfant, avec les accessoires achetés à la boutique. */
export function Avatar({ child, size = 64, humeur, talking, showCompanion = true }: { child: Pick<Child, "avatar" | "equipped">; size?: number; humeur?: string; talking?: boolean; showCompanion?: boolean }) {
  const eq = child.equipped ?? {};
  const a = ANCHORS[child.avatar];
  const cadre = itemById(eq.cadre)?.couleur;
  const piece = (slot: "chapeau" | "lunettes" | "cou") => {
    const it = itemById(eq[slot]);
    if (!it) return null;
    const [x, y, s] = a[slot];
    return (
      <span key={slot} className={`av-acc av-${slot}`} style={{ left: `${x}%`, top: `${y}%`, fontSize: size * s }} aria-hidden>
        <Icone cat="boutique" id={it.id} emoji={it.emoji} size={size * s * 1.15} />
      </span>
    );
  };
  const comp = showCompanion ? itemById(eq.compagnon) : undefined;
  return (
    <span className={`avatar ${cadre ? "avatar-cadre" : ""}`} style={{ width: size, height: size, ...(cadre ? { "--cadre": cadre } : {}) } as React.CSSProperties}>
      {/* accessoires calés sur la pose neutre : on la garde dès qu'un accessoire est porté */}
      <Mascot who={child.avatar} size={size} humeur={eq.chapeau || eq.lunettes || eq.cou ? undefined : humeur} talking={talking} />
      {piece("cou")}
      {piece("lunettes")}
      {piece("chapeau")}
      {comp && (
        <span className="av-acc av-compagnon" style={{ fontSize: size * 0.3 }} aria-hidden>
          <Icone cat="boutique" id={comp.id} emoji={comp.emoji} size={size * 0.36} />
        </span>
      )}
    </span>
  );
}
