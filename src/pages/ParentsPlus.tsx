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
  const [vue, setVue] = useState<"bilan" | "groupe" | "securite" | "programmes">("bilan");
  const child = children.find((c) => c.id === id);
  const parPlanete = new Map<string, World[]>();
  for (const w of worlds) parPlanete.set(w.matiere, [...(parPlanete.get(w.matiere) ?? []), w]);
  return (
    <div className="stack bilans">
      <div className="tabs no-print" role="tablist">
        <button role="tab" aria-selected={vue === "bilan"} className={`tab ${vue === "bilan" ? "active" : ""}`} onClick={() => setVue("bilan")}>📋 Ce que mon enfant sait faire</button>
        {children.length > 1 && <button role="tab" aria-selected={vue === "groupe"} className={`tab ${vue === "groupe" ? "active" : ""}`} onClick={() => setVue("groupe")}>👥 Vue d'ensemble</button>}
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
        <button className="btn btn-soft" onClick={() => exporterCsv(children, worlds)} title="Tous les profils, une ligne par leçon commencée : à ouvrir dans un tableur">📊 Tableau de suivi (CSV)</button>

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
          <BilanFluence child={child} />
          <BilanAutrement child={child} />
        </section>
      )}

      {vue === "groupe" && <VueGroupe children={children} worlds={worlds} />}
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
            Chaque monde indique les classes qu'il couvre. En version 2.3, le contenu de mathématiques (cycles 2 et 3) et de français (CP, CE1) a été confronté objectif par objectif aux programmes officiels publiés en 2024 et 2025 :{" "}
            <a href="./alignement-programmes.html" target="_blank" rel="noopener">voir la grille de correspondance détaillée</a>. Cette table reste un repère : elle ne remplace pas les programmes officiels (eduscol.education.fr).
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

/** Lectures chronométrées : les derniers résultats et la progression (mots correctement lus par minute). */
function BilanFluence({ child }: { child: Child }) {
  const essais = child.fluence ?? [];
  if (!essais.length) return null;
  const premier = essais[essais.length - 1];
  const dernier = essais[0];
  return (
    <div className="bilan-planete">
      <h3>⏱️ Lecture à voix haute (fluence)</h3>
      <p className="small">
        {essais.length} lecture{essais.length > 1 ? "s" : ""} chronométrée{essais.length > 1 ? "s" : ""}. Première : {premier.mclm} mots/min ; dernière : {dernier.mclm} mots/min
        {essais.length > 1 ? ` (${dernier.mclm - premier.mclm >= 0 ? "+" : ""}${dernier.mclm - premier.mclm})` : ""}. Repères de fin d'année (Éduscol) : CP 30 sans préparation et 50 après préparation, CE1 70, CE2 90.
      </p>
      <ul>
        {essais.slice(0, 6).map((e) => (
          <li key={e.at}>
            {new Date(e.at).toLocaleDateString("fr-FR")} · {e.niveau} · <strong>{e.mclm} mots/min</strong> ({e.lus} mots, {e.erreurs} erreur{e.erreurs > 1 ? "s" : ""}, {e.prepare ? "texte préparé" : "texte découvert"})
            {e.prosodie?.length ? ` · lecture expressive : ${e.prosodie.length}/3` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Les notions où l'enfant a demandé « Explique-moi autrement », et les façons qui l'ont aidé. */
function BilanAutrement({ child }: { child: Child }) {
  const { worlds } = useContent();
  const notions = Object.entries(child.counters)
    .filter(([k]) => k.startsWith("autrement:"))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, n]) => {
      const [wid, lid] = k.slice("autrement:".length).split("/");
      const w = worlds.find((x) => x.id === wid);
      return { k, n, titre: w?.lecons.find((l) => l.id === lid)?.titre ?? lid, monde: w?.titre ?? wid };
    });
  if (!notions.length) return null;
  const FACONS: Record<string, string> = { dessin: "un dessin", image: "une image de la vie", exemple: "un exemple pas à pas", manip: "la manipulation", cours: "le cours relu lentement" };
  const aides = Object.keys(FACONS)
    .map((f) => ({ f, oui: child.counters[`autrement-aide-${f}`] ?? 0 }))
    .filter((x) => x.oui > 0)
    .sort((a, b) => b.oui - a.oui);
  return (
    <div className="bilan-planete">
      <h3>🤔 Notions où {child.name} a demandé une autre explication</h3>
      <ul>
        {notions.map((x) => (
          <li key={x.k}>
            {x.titre} <small className="muted">({x.monde} · {x.n} fois)</small>
          </li>
        ))}
      </ul>
      {aides.length > 0 && <p className="small">Ce qui l'aide le plus : {aides.map((a) => `${FACONS[a.f]} (${a.oui})`).join(", ")}. C'est une bonne piste pour l'aider à la maison.</p>}
    </div>
  );
}

/** Rappel quotidien sans serveur ni notification : un événement répété ajouté à l'agenda de la famille (.ics). */
export function RappelAgenda() {
  const [heure, setHeure] = useState("17:30");
  const [jours, setJours] = useState<string[]>(["MO", "TU", "TH", "FR"]);
  const J: [string, string][] = [["MO", "lun"], ["TU", "mar"], ["WE", "mer"], ["TH", "jeu"], ["FR", "ven"], ["SA", "sam"], ["SU", "dim"]];
  const telecharger = () => {
    const [h, m] = heure.split(":").map(Number);
    const pad = (n: number) => String(n).padStart(2, "0");
    // heure locale « flottante » : le rappel suit le fuseau de l'agenda qui l'importe
    const local = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
    const d0 = new Date();
    d0.setHours(h, m, 0, 0);
    const debut = local(d0);
    const fin = local(new Date(d0.getTime() + 15 * 60000));

    const url = location.href.split("#")[0];
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Galaxie des Savoirs//FR", "BEGIN:VEVENT",
      `UID:galaxie-${Date.now()}@galaxie-des-savoirs`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTSTART:${debut}`, `DTEND:${fin}`, `RRULE:FREQ=WEEKLY;BYDAY=${jours.join(",")}`,
      "SUMMARY:🚀 15 minutes dans la Galaxie des Savoirs", `DESCRIPTION:Une petite séance régulière vaut mieux qu'une longue de temps en temps. ${url}`,
      "BEGIN:VALARM", "TRIGGER:PT0M", "ACTION:DISPLAY", "DESCRIPTION:C'est l'heure de la Galaxie !", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "rappel-galaxie-des-savoirs.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  return (
    <section className="card stack">
      <h3>⏰ Un rappel régulier dans votre agenda</h3>
      <p className="small">Apprendre un peu, souvent, est ce qui fonctionne le mieux. Ce fichier ajoute à votre agenda (téléphone, tablette ou ordinateur) un rappel répété : aucune notification n'est envoyée par l'application, et rien ne quitte l'appareil.</p>
      <div className="row">
        <label>
          Heure <input type="time" value={heure} onChange={(e) => setHeure(e.target.value || "17:30")} />
        </label>
        <div className="chips" role="group" aria-label="Jours">
          {J.map(([k, l]) => (
            <button key={k} className={`chip ${jours.includes(k) ? "sel" : ""}`} aria-pressed={jours.includes(k)} onClick={() => setJours((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <button className="btn btn-primary" disabled={!jours.length} onClick={telecharger}>
        📅 Ajouter le rappel à mon agenda
      </button>
    </section>
  );
}

/** Tableau de suivi de tous les profils (famille ou petit groupe) : un fichier CSV lisible dans un tableur. */
export function exporterCsv(children: Child[], worlds: World[]) {
  const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
  const lignes = [["Enfant", "Planète", "Monde", "Classes", "Leçon", "Compétence", "Acquise", "Étoiles", "Meilleur score (%)", "Demandes d'autre explication"].map(esc).join(";")];
  for (const c of children)
    for (const w of worlds)
      for (const l of w.lecons) {
        const k = lessonKey(w, l.id);
        const p = c.progress[k];
        const aut = c.counters[`autrement:${k}`] ?? 0;
        if (!p && !aut) continue;
        lignes.push([c.name, w.matiere, w.titre, w.niveau, l.titre, l.objectif, p?.done ? "oui" : "non", p?.stars ?? 0, Math.round((p?.best ?? 0) * 100), aut].map(esc).join(";"));
      }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + lignes.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  a.download = `galaxie-des-savoirs-suivi-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/** Vue d'ensemble de tous les profils (famille, petit groupe, classe) : un enfant par ligne. */
function VueGroupe({ children, worlds }: { children: Child[]; worlds: World[] }) {
  const semaine = (c: Child) => {
    let min = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      min += c.days[k]?.min ?? 0;
    }
    return Math.round(min);
  };
  const derniere = (c: Child) => Math.max(0, ...Object.values(c.progress).map((p) => p.lastAt || 0));
  const acquises = (c: Child) => worlds.reduce((n, w) => n + w.lecons.filter((l) => c.progress[lessonKey(w, l.id)]?.done).length, 0);
  const resistent = (c: Child) => Object.keys(c.counters).filter((k) => k.startsWith("autrement:")).length;
  const reussite = (c: Child) => {
    const ok = c.counters.ok ?? 0;
    const ko = c.counters.ko ?? 0;
    return ok + ko ? Math.round((100 * ok) / (ok + ko)) : 0;
  };
  return (
    <section className="card imprimable">
      <h2>Vue d'ensemble · {new Date().toLocaleDateString("fr-FR")}</h2>
      <p className="small">Une ligne par profil. Pour le détail d'un enfant, revenez à l'onglet « Ce que mon enfant sait faire » ; pour un tableur, utilisez le bouton « Tableau de suivi (CSV) ».</p>
      <div className="table-scroll">
        <table className="table-print">
          <thead>
            <tr><th>Enfant</th><th>Âge</th><th>Compétences acquises</th><th>Réussite</th><th>Minutes (7 j)</th><th>Série</th><th>Révisions dues</th><th>Notions qui résistent</th><th>Fluence</th><th>Dernière activité</th></tr>
          </thead>
          <tbody>
            {children.map((c) => {
              const d = derniere(c);
              const dues = Object.values(c.srs).filter((x) => x.due <= Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000)).length;
              return (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.age}</td>
                  <td>{acquises(c)}</td>
                  <td>{reussite(c)} %</td>
                  <td>{semaine(c)}</td>
                  <td>{c.streak} j</td>
                  <td>{dues}</td>
                  <td>{resistent(c)}</td>
                  <td>{c.fluence?.[0] ? `${c.fluence[0].mclm} mots/min` : "—"}</td>
                  <td>{d ? new Date(d).toLocaleDateString("fr-FR") : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
