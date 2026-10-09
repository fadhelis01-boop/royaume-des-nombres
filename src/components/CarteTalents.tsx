import { classeDeLAge, nomClasse, type Domaine } from "../lib/parcours";

/**
 * La carte des talents : une barre par domaine, du début du domaine jusqu'au niveau estimé.
 * Le repère « ton âge » situe sans juger : on parle d'avance, de « pile à ton niveau » ou de « prochain défi ».
 */
export function CarteTalents({ doms, niveaux, age, compact }: { doms: Domaine[]; niveaux: Record<string, number>; age: number; compact?: boolean }) {
  const attendu = classeDeLAge(age);
  const lignes = doms.filter((d) => niveaux[d.id] !== undefined);
  const haut = Math.max(attendu + 2, ...lignes.map((d) => niveaux[d.id] + 1));
  const pct = (g: number) => `${Math.max(3, Math.min(100, (100 * (g + 1)) / (haut + 1)))}%`;
  return (
    <div className={`talents ${compact ? "compact" : ""}`} role="list">
      {lignes.map((d) => {
        const n = niveaux[d.id];
        const ecart = n - attendu;
        const debut = n < d.min - 0.25; // pas encore entré dans ce domaine
        const msg = debut ? "à découvrir 🌱" : ecart >= 1 ? "en avance ✨" : ecart > -0.75 ? "pile à ton niveau 👍" : "ton prochain défi 💪";
        return (
          <div key={d.id} className={`talent ${ecart >= 1 ? "avance" : ecart > -0.75 ? "ok" : "defi"}`} role="listitem">
            <span className="t-nom">
              {d.emoji} {d.titre}
            </span>
            <span className="t-barre" aria-hidden>
              <i style={{ width: pct(n) }} />
              <b style={{ left: pct(attendu) }} title="ton âge" />
            </span>
            <span className="t-niv">
              {debut ? "on commence" : `niveau ${nomClasse(n)}`} · <small>{msg}</small>
            </span>
          </div>
        );
      })}
      {!compact && <p className="small muted">Le petit trait marque le niveau habituel à ton âge. Chacun avance à son rythme !</p>}
    </div>
  );
}
