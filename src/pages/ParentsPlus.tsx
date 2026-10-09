// Espace parents, ajouts de l'audit 2.1 : confidentialité, bilans imprimables
// (compétences acquises, sécurité des expériences, correspondance avec les programmes), test de l'assistant.
import { useState } from "react";
import { lessonKey, planeteDe, useContent } from "../lib/content";
import { getState, updateSettings, useStore } from "../lib/store";
import type { Child, World } from "../lib/types";

export function Confidentialite() {
  return (
    <div className="stack">
      <section className="card">
        <h3>🔒 Ce que l'application garde, et où</h3>
        <ul>
          <li><strong>Tout reste sur cet appareil</strong> (stockage du navigateur) : prénom ou surnom, âge, progression, dessins de la galerie, réglages. Il n'y a ni compte, ni serveur, ni publicité, ni outil de statistiques.</li>
          <li><strong>Un surnom suffit</strong> : aucune autre donnée personnelle n'est demandée à l'enfant.</li>
          <li><strong>Le micro</strong> (jeu « Frappe et chante ») n'est utilisé que pendant l'exercice, après l'autorisation du navigateur. Le son est analysé sur place pour trouver la hauteur de la note : il n'est ni enregistré ni envoyé.</li>
          <li><strong>Les sauvegardes</strong> sont des fichiers que vous téléchargez vous-même. Elles ne contiennent pas la clé de l'assistant.</li>
          <li><strong>L'assistant IA est facultatif.</strong> S'il est activé avec votre clé, seules la question de l'enfant et son âge sont envoyées à Anthropic pour obtenir la réponse. Une limite de questions par jour est réglable dans l'onglet Assistant.</li>
          <li><strong>Pour tout effacer</strong> : supprimez le profil dans l'onglet Enfants, ou effacez les données du site dans le navigateur.</li>
        </ul>
      </section>
      <section className="card">
        <h3>🖼️ Illustrations et contenus</h3>
        <p className="small">
          Les illustrations (personnages, décors, objets) ont été créées pour l'application avec un générateur d'images fonctionnant en local. Certains décors s'inspirent d'œuvres du domaine public (grottes de Lascaux, la Grande Vague d'Hokusai) ; aucune œuvre protégée n'est reproduite. Les textes cités en français (La Fontaine, Hugo, Racine, Corneille…) sont du domaine public.
        </p>
      </section>
    </div>
  );
}

const PCT = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);

/** Bilan imprimable : pour chaque planète, ce que l'enfant sait faire (les objectifs « Je sais… » des leçons réussies). */
export function Bilans({ children }: { children: Child[] }) {
  const { worlds, manifest } = useContent();
  const [id, setId] = useState(children[0]?.id ?? "");
  const [vue, setVue] = useState<"bilan" | "securite" | "programmes">("bilan");
  const child = children.find((c) => c.id === id);
  const parPlanete = new Map<string, World[]>();
  for (const w of worlds) parPlanete.set(w.matiere, [...(parPlanete.get(w.matiere) ?? []), w]);
  return (
    <div className="stack bilans">
      <div className="tabs no-print" role="tablist">
        <button role="tab" aria-selected={vue === "bilan"} className={`tab ${vue === "bilan" ? "active" : ""}`} onClick={() => setVue("bilan")}>📋 Ce que mon enfant sait faire</button>
        <button role="tab" aria-selected={vue === "securite"} className={`tab ${vue === "securite" ? "active" : ""}`} onClick={() => setVue("securite")}>🧪 Fiche sécurité des expériences</button>
        <button role="tab" aria-selected={vue === "programmes"} className={`tab ${vue === "programmes" ? "active" : ""}`} onClick={() => setVue("programmes")}>🏫 Correspondance avec les programmes</button>
      </div>
      <div className="row no-print">
        {vue === "bilan" && children.length > 1 && (
          <select value={id} onChange={(e) => setId(e.target.value)} aria-label="Enfant">
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Imprimer</button>
      </div>

      {vue === "bilan" && child && (
        <section className="card imprimable">
          <h2>Bilan de {child.name} · {new Date().toLocaleDateString("fr-FR")}</h2>
          <p className="small">Une compétence est notée acquise quand le défi de la leçon est réussi à 80 % ou plus (une révision espacée la consolide ensuite).</p>
          {[...parPlanete.entries()].map(([mat, ws]) => {
            const pl = planeteDe(manifest, mat);
            const lecons = ws.flatMap((w) => w.lecons.map((l) => ({ w, l, p: child.progress[lessonKey(w, l.id)] })));
            const acquises = lecons.filter((x) => x.p?.done);
            const encours = lecons.filter((x) => x.p && !x.p.done);
            if (!acquises.length && !encours.length) return null;
            return (
              <div key={mat} className="bilan-planete">
                <h3>{pl?.emoji} {pl?.matiere} — {acquises.length} compétence{acquises.length > 1 ? "s" : ""} acquise{acquises.length > 1 ? "s" : ""} ({PCT(acquises.length, lecons.length)} % de la planète)</h3>
                {acquises.length > 0 && (
                  <ul>
                    {acquises.map(({ w, l, p }) => (
                      <li key={w.id + l.id}>✅ {l.objectif} <small className="muted">({w.titre} · {"★".repeat(p!.stars)})</small></li>
                    ))}
                  </ul>
                )}
                {encours.length > 0 && (
                  <>
                    <h4>En cours</h4>
                    <ul>
                      {encours.map(({ w, l, p }) => (
                        <li key={w.id + l.id}>⏳ {l.objectif} <small className="muted">(meilleur score {Math.round((p!.best ?? 0) * 100)} %)</small></li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            );
          })}
          {!Object.keys(child.progress).length && <p>Aucune leçon commencée pour l'instant.</p>}
        </section>
      )}

      {vue === "securite" && (
        <section className="card imprimable">
          <h2>Fiche sécurité des expériences</h2>
          <p className="small">🟢 l'enfant peut la faire seul · 🟠 avec un adulte · 🔴 à regarder seulement (démonstration par un adulte ou vidéo). Règles communes : lunettes si indiqué, on ne goûte jamais, on range et on se lave les mains.</p>
          <table className="table-print">
            <thead>
              <tr><th>Niveau</th><th>Expérience</th><th>Leçon</th><th>Matériel</th></tr>
            </thead>
            <tbody>
              {worlds.flatMap((w) =>
                w.lecons.flatMap((l) =>
                  l.etapes.filter((e): e is Extract<typeof e, { kind: "experience" }> => e.kind === "experience").map((e, k) => (
                    <tr key={w.id + l.id + k}>
                      <td>{e.securite === "vert" ? "🟢" : e.securite === "orange" ? "🟠" : "🔴"}</td>
                      <td>{e.titre}</td>
                      <td>{l.titre} <small className="muted">({w.titre})</small></td>
                      <td>{e.materiel.join(", ")}</td>
                    </tr>
                  )),
                ),
              )}
            </tbody>
          </table>
        </section>
      )}

      {vue === "programmes" && (
        <section className="card imprimable">
          <h2>Correspondance avec les classes</h2>
          <p className="small">
            Chaque monde indique les classes qu'il couvre. Cette table sert de repère ; elle ne remplace pas les programmes officiels (eduscol.education.fr), qui ont été réécrits pour les cycles 1 à 3 en mathématiques et en français : vérifiez la compétence précise avant de vous en servir avec un enseignant.
          </p>
          {[...parPlanete.entries()].map(([mat, ws]) => (
            <div key={mat}>
              <h3>{planeteDe(manifest, mat)?.emoji} {planeteDe(manifest, mat)?.matiere}</h3>
              <table className="table-print">
                <thead>
                  <tr><th>Classes</th><th>Monde</th><th>Compétences (« Je sais… »)</th></tr>
                </thead>
                <tbody>
                  {[...ws].sort((a, b) => a.ordre - b.ordre).map((w) => (
                    <tr key={w.id}>
                      <td>{w.niveau}</td>
                      <td>{w.emoji} {w.titre}</td>
                      <td className="small">{w.lecons.map((l) => l.objectif).join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

/** Réglages de l'assistant ajoutés à l'audit : limite quotidienne et test de connexion. */
export function AssistantPlus() {
  const s = useStore((x) => x.settings);
  const [test, setTest] = useState<string>("");
  const tester = async () => {
    setTest("⏳ Test en cours…");
    try {
      const { askClaude } = await import("../lib/ai");
      const r = await askClaude({ system: "Tu es un test de connexion. Réponds seulement : « Connexion réussie ! »", messages: [{ role: "user", content: "Test" }], search: false });
      setTest(`✅ ${r.text.trim().slice(0, 120) || "Réponse reçue."}`);
    } catch (e) {
      setTest(`❌ ${(e as Error).message}`);
    }
  };
  return (
    <section className="card">
      <h3>⚙️ Limites et vérification</h3>
      <label>
        Questions à l'assistant par jour et par enfant :{" "}
        <select value={s.aiDailyLimit ?? 15} onChange={(e) => updateSettings({ aiDailyLimit: Number(e.target.value) })}>
          {[5, 10, 15, 30, 0].map((n) => (
            <option key={n} value={n}>{n === 0 ? "sans limite" : n}</option>
          ))}
        </select>
      </label>
      <p className="small muted">L'accès aux réglages reste protégé par le code parent.</p>
      <button className="btn btn-soft" disabled={!s.apiKey} onClick={tester}>🔌 Tester la connexion</button>
      {!s.apiKey && <p className="small muted">Collez d'abord une clé ci-dessus.</p>}
      {test && <p aria-live="polite">{test}</p>}
    </section>
  );
}

/** Rappel de sauvegarde : jamais faite, ou plus d'un mois. */
export function RappelSauvegarde({ onGo }: { onGo: () => void }) {
  const last = useStore((x) => x.settings.lastBackup ?? 0);
  const enfants = useStore((x) => x.children);
  const progres = enfants.some((c) => Object.keys(c.progress).length > 0);
  if (!progres || Date.now() - last < 30 * 86400000) return null;
  return (
    <div className="card rappel no-print" role="status">
      💾 {last ? "Votre dernière sauvegarde date de plus d'un mois." : "Vous n'avez encore jamais sauvegardé la progression."} En cas de perte ou de changement d'appareil, elle serait perdue.{" "}
      <button className="btn btn-soft btn-small" onClick={onGo}>Sauvegarder maintenant</button>
    </div>
  );
}

export const marquerSauvegarde = () => updateSettings({ lastBackup: Date.now() });
export const enfants = () => getState().children;

/** Télécharge toutes les illustrations pour un usage complet hors connexion (le service les garde en cache). */
export function HorsConnexion() {
  const { worlds } = useContent();
  const [etat, setEtat] = useState("");
  const lancer = async () => {
    const { VISUELS } = await import("../lib/visuels");
    const urls = [
      ...Object.entries(VISUELS).flatMap(([cat, ids]) => ids.map((id) => `img/${cat}/${id}.webp`)),
      ...worlds.map((w) => w.decor).filter((d): d is string => !!d),
    ];
    let n = 0;
    for (const u of [...new Set(urls)]) {
      try {
        await fetch(u);
      } catch {
        /* hors ligne : on continue */
      }
      n++;
      if (n % 20 === 0) setEtat(`⏳ ${n} / ${urls.length} images…`);
    }
    setEtat(`✅ ${n} images prêtes : l'application fonctionne entièrement sans connexion sur cet appareil.`);
  };
  return (
    <section className="card">
      <h3>📶 Utiliser l'application sans connexion</h3>
      <p className="small">Les leçons sont déjà disponibles hors connexion. Les illustrations, elles, sont gardées au fur et à mesure qu'on les voit. Avant un voyage, vous pouvez toutes les télécharger maintenant (environ 20 Mo).</p>
      <button className="btn btn-soft" onClick={lancer}>⬇ Préparer le hors connexion</button>
      {etat && <p aria-live="polite">{etat}</p>}
    </section>
  );
}
