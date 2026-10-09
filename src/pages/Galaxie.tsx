import { go } from "../lib/router";
import { CYCLES, lessonKey, matiereDe, objetLabel, useContent } from "../lib/content";
import { setMatiere, useChild } from "../lib/store";
import { visuel } from "../lib/img";
import { Bubble } from "../components/Mascot";
import type { Planete, World } from "../lib/types";

// La Galaxie des Savoirs : toutes les matières, rangées en trois familles.
// Chaque planète se décrit dans content-src/_planetes.yaml (rien à coder pour en ajouter une).

export function Galaxie() {
  const { manifest, worlds } = useContent();
  const child = useChild()!;
  const actuelle = matiereDe(child);
  const planetes = manifest?.planetes ?? [];
  const familles = manifest?.familles ?? [];
  const choisir = (p: Planete) => {
    setMatiere(p.id);
    go("/");
  };
  return (
    <div className="page galaxie">
      <h1>🌌 La Galaxie des Savoirs</h1>
      <Bubble
        who="neo"
        text={`${child.name}, chaque planète est une matière. Le Grand Neutre essaie de toutes les rendre grises… Choisis où partir : tu peux changer quand tu veux, ta progression est gardée partout.`}
      />
      {familles.map((f) => {
        const ps = planetes.filter((p) => p.famille === f.id);
        if (!ps.length) return null;
        return (
          <section key={f.id} className={`famille famille-${f.id}`}>
            <h2 className="famille-titre">
              <span>{f.emoji}</span> {f.titre}
              <small>{f.accroche}</small>
            </h2>
            <div className="planetes">
              {ps.map((p) => (
                <PlaneteCard key={p.id} p={p} ws={worlds.filter((w) => w.matiere === p.id)} on={p.id === actuelle} onPick={() => choisir(p)} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PlaneteCard({ p, ws, on, onPick }: { p: Planete; ws: World[]; on: boolean; onPick: () => void }) {
  const child = useChild()!;
  // Progression de l'étape en cours (Graines, Explorateurs, Maîtres) : « 0/199 leçons » décourage à 8 ans.
  const parcours = ws.filter((w) => w.cycle !== "astuces").sort((a, b) => a.ordre - b.ordre);
  const fait = (w: World) => w.lecons.every((l) => child.progress[lessonKey(w, l.id)]?.done);
  const cycle = (parcours.find((w) => !fait(w)) ?? parcours[parcours.length - 1])?.cycle;
  const etape = parcours.filter((w) => w.cycle === cycle);
  const total = etape.length;
  const faites = etape.filter(fait).length;
  const objets = (child.crystals ?? []).filter((id) => ws.some((w) => w.id === id)).length;
  const bientot = !ws.length;
  const img = visuel("planetes", p.id);
  return (
    <button className={`planete-card ${on ? "on" : ""} ${bientot ? "bientot" : ""}`} style={{ "--pc": p.couleur } as React.CSSProperties} onClick={() => !bientot && onPick()} aria-disabled={bientot}>
      <span className="pc-astre" aria-hidden>
        {img ? <img src={img} alt="" width={84} height={84} /> : <span className="pc-emoji">{p.emoji}</span>}
      </span>
      <span className="pc-txt">
        <strong>{p.titre}</strong>
        <small className="pc-matiere">{p.matiere}</small>
        <small>{p.accroche}</small>
        {bientot ? (
          <span className="pc-prog">🚧 Bientôt</span>
        ) : (
          <>
            <span className="pc-bar" role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={faites} aria-label={`${faites} mondes sur ${total}`}>
              <i style={{ width: `${total ? (100 * faites) / total : 0}%` }} />
            </span>
            <span className="pc-prog">
              {cycle ? `${CYCLES[cycle].emoji} ${CYCLES[cycle].titre} : ${faites}/${total} monde${total > 1 ? "s" : ""}` : ""} · {objetLabel(p, objets)}
            </span>
          </>
        )}
      </span>
      {on && <span className="pc-ici">Tu es ici</span>}
    </button>
  );
}
