import { visuel } from "../lib/img";

/** Une illustration du dossier img/<cat>/ si elle existe, sinon l'émoji de secours. */
export function Icone({ cat, id, emoji, size = 32, eteint = false, className = "" }: { cat: string; id?: string; emoji: string; size?: number; eteint?: boolean; className?: string }) {
  const src = visuel(cat, eteint ? `${id}-eteint` : id) ?? (eteint ? visuel(cat, id) : undefined);
  if (src) return <img src={src} alt="" width={size} height={size} className={`icone ${eteint ? "icone-eteint" : ""} ${className}`} draggable={false} />;
  return (
    <span className={`icone-emoji ${className}`} style={{ fontSize: size * 0.85 }} aria-hidden>
      {emoji}
    </span>
  );
}
