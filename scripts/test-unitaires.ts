// Tests unitaires des modules purs : fusion des progressions (changement d'appareil),
// exercices de production (relier, rappel libre), plan des défis.
// npm run test:unit (inclus dans npm test)
import { fusionnerEnfant, fusionnerProfils } from "../src/lib/fusion";
import { check, idees, instantiate } from "../src/lib/gen";
import { planDefi } from "../src/lib/plan";
import type { Child, ExSpec, Lesson, World } from "../src/lib/types";
import { classeDeLAge, construireParcours, departEscalier, domainesDe, estimation, mondesAOuvrir, niveauLecon, pas, tranche } from "../src/lib/parcours";


let ok = 0;
const ko: string[] = [];
function eq(label: string, got: unknown, want: unknown) {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) ok++;
  else ko.push(`${label} : obtenu ${g}, attendu ${w}`);
}

// ---------- Fusion de deux appareils ----------
const base = (o: Partial<Child>): Child =>
  ({
    id: "a1", name: "Léa", avatar: "mia", age: 8, createdAt: 1, xp: 0, stars: 0, streak: 0, bestStreak: 0, lastDay: "", days: {}, badges: [], progress: {}, srs: {},
    skills: {}, mistakes: [], games: {}, tables: {}, enigmes: [], validatedWorlds: [], counters: {}, inventions: [], crystals: [], story: {}, vraieVie: [],
    gems: 0, owned: [], equipped: {}, cabane: Array(9).fill(null), lecteur: "oui", abandons: {}, sessions: [], recordsJeux: {}, matiere: "maths", carnet: [], ...o,
  }) as Child;
const tablette = base({
  majAt: 100, xp: 300, gems: 40, lastDay: "2026-10-08", streak: 3, bestStreak: 3, badges: ["premier"],
  progress: { "m/a": { step: 4, done: true, stars: 2, best: 0.8, attempts: 2, lastAt: 90 }, "m/b": { step: 2, done: false, stars: 0, best: 0, attempts: 0, lastAt: 95 } },
  counters: { ok: 40, ko: 10 }, avatar: "neo", mistakes: [{ key: "m/a", q: "Q1", given: "1", expected: "2", at: 50 }],
});
const ordi = base({
  majAt: 200, xp: 250, gems: 55, lastDay: "2026-10-09", streak: 1, bestStreak: 5, badges: ["lecteur"],
  progress: { "m/a": { step: 1, done: false, stars: 0, best: 0.5, attempts: 1, lastAt: 150 }, "f/x": { step: 3, done: true, stars: 3, best: 1, attempts: 1, lastAt: 160 } },
  counters: { ok: 20, ko: 2, fluence: 1 }, avatar: "zero", mistakes: [{ key: "f/x", q: "Q2", given: "a", expected: "b", at: 60 }],
});
const f = fusionnerEnfant(tablette, ordi);
eq("fusion : xp max", f.xp, 300);
eq("fusion : gemmes max", f.gems, 55);
eq("fusion : badges réunis", [...f.badges].sort(), ["lecteur", "premier"]);
eq("fusion : leçon réussie sur un appareil reste réussie", f.progress["m/a"].done, true);
eq("fusion : meilleures étoiles", f.progress["m/a"].stars, 2);
eq("fusion : leçon de l'autre appareil conservée", !!f.progress["f/x"]?.done && !!f.progress["m/b"], true);
eq("fusion : compteurs max", f.counters, { ok: 40, ko: 10, fluence: 1 });
eq("fusion : réglage de forme = le plus récent", f.avatar, "zero");
eq("fusion : série de l'appareil joué en dernier", [f.streak, f.lastDay, f.bestStreak], [1, "2026-10-09", 5]);
eq("fusion : erreurs réunies et triées", f.mistakes.map((m) => m.q), ["Q2", "Q1"]);
eq("fusion : identifiant gardé", f.id, "a1");
eq("fusion symétrique sur les avancées", fusionnerEnfant(ordi, tablette).progress["m/a"].done, true);
const r = fusionnerProfils([tablette], [{ ...ordi, id: "zz" }, base({ id: "b2", name: "Tom" })]);
eq("profils : même prénom = même enfant, nouveau prénom ajouté", [r.fusionnes, r.ajoutes, r.enfants.length], [1, 1, 2]);
eq("profils : fusion par prénom insensible aux accents", fusionnerProfils([tablette], [base({ id: "x", name: "LEA" })]).fusionnes, 1);

// ---------- Relier ----------
const rel: ExSpec = { type: "relier", enonce: "Relie", paires: [["cat", "chat"], ["dog", "chien"], ["bird", "oiseau"], ["fish", "poisson"]] };
const ri = instantiate(rel, 42);
eq("relier : la bonne association est acceptée", check(ri, { kind: "state", values: ri.itemCats! }).ok, true);
const faux = [...ri.itemCats!];
[faux[0], faux[1]] = [faux[1], faux[0]];
const vf = check(ri, { kind: "state", values: faux });
eq("relier : deux paires inversées refusées", vf.ok, false);
eq("relier : chaque élément de droite apparaît une fois", [...ri.texts!].sort(), ["chat", "chien", "oiseau", "poisson"]);

// ---------- Rappel libre ----------
const lib: ExSpec = { type: "libre", enonce: "Écris", cles: [["évaporation"], ["condensation"], ["nuage", "nuages"]], modele: "…", min_cles: 2 };
const li = instantiate(lib, 1);
eq("libre : idées retrouvées malgré les accents et les pluriels", idees(li, "L'eau s'evapore (evaporation) puis forme des nuages"), [0, 2]);
eq("libre : réussi avec 2 idées sur 3", check(li, { kind: "text", value: "evaporation et condensation" }).ok, true);
eq("libre : refusé avec une seule idée", check(li, { kind: "text", value: "il y a des nuages" }).ok, false);
eq("libre : mot plus long qui contient la clé", idees(instantiate({ ...lib, cles: [["oxygène"]], min_cles: 1 }, 1), "du dioxygène"), [0]);
eq("libre : un mot court ne déclenche pas une clé longue", idees(li, "eva conde nu"), []);

// ---------- Plan du défi ----------
const q = (i: number): ExSpec => ({ type: "qcm", enonce: "q" + i, choix: ["a", "b"] });
const n = (i: number): ExSpec => ({ type: "nombre", enonce: "n" + i, reponse: "1" });
const specs: ExSpec[] = [q(1), q(2), q(3), q(4), q(5), q(6), n(1), n(2), { type: "libre", enonce: "l", cles: [["x"]], modele: "x", niveau: 3 }];
for (let t = 0; t < 20; t++) {
  const p = planDefi(specs, 8);
  if (p.length !== 8 || p.filter((e) => e.type === "qcm").length > 4 || !p.some((e) => e.type === "libre")) {
    ko.push(`plan du défi : ${p.map((e) => e.type).join(",")}`);
    break;
  }
  if (t === 19) ok++;
}
eq("plan : que des QCM s'il n'y a rien d'autre", planDefi([q(1), q(2), q(3)], 6).length, 6);

// ---------- Carte des talents et parcours ----------
eq("tranche CE1 – CM2", tranche("CE1 – CM2"), [2, 5]);
eq("tranche GS – CP", tranche("GS – CP"), [0, 1]);
eq("tranche 1ʳᵉ – Terminale", tranche("1ʳᵉ – Terminale"), [11, 12]);
eq("tranche Terminale (maths expertes) – supérieur", tranche("Terminale (maths expertes) – supérieur"), [12, 13]);
eq("tranche 5ᵉ – lycée", tranche("5ᵉ – lycée"), [7, 11]);
eq("tranche Tous niveaux", tranche("Tous niveaux"), null);
eq("classe de l'âge 8 ans = CE2", classeDeLAge(8), 3);
const lec = (id: string): Lesson => ({ id, titre: id, objectif: "", duree: 5, etapes: [], nb_defi: 6, exercices: [{ type: "nombre", enonce: "q", reponse: "1" }] });
const monde = (id: string, niveau: string, n: number, ordre: number) => ({ id, titre: id, emoji: "", couleur: "", cycle: "graines", age: "", niveau, ordre, prerequis: [], version: "1", matiere: "maths", lecons: Array.from({ length: n }, (_, i) => lec(`${id}-${i}`)) }) as unknown as World;
const W2 = [monde("a", "CP – CE2", 3, 1), monde("b", "CE2 – CM2", 3, 2), monde("g", "CE1 – CM1", 4, 3)];
eq("niveau d'une leçon interpolé", [niveauLecon(W2[0], 0), niveauLecon(W2[0], 1), niveauLecon(W2[0], 2)], [1, 2, 3]);
const D2 = domainesDe("maths", W2, [{ id: "calc", titre: "Calcul", mondes: ["a", "b"] }, { id: "geo", titre: "Géo", mondes: ["g"] }]);
eq("domaines : leçons rangées par niveau", D2[0].lecons.map((l) => l.niveau), [1, 2, 3, 3, 4, 5]);
let e8 = departEscalier(D2[0], 8);
eq("escalier : départ au niveau de l'âge", e8.cible, 3);
e8 = pas(e8, D2[0], 3, true);
e8 = pas(e8, D2[0], 4, true);
e8 = pas(e8, D2[0], 5, false);
eq("escalier : estimation = plus haut réussi sous le premier échec", estimation(e8, D2[0]), 4);
let ef = departEscalier(D2[0], 8);
ef = pas(ef, D2[0], 3, false);
ef = pas(ef, D2[0], 2, false);
ef = pas(ef, D2[0], 1, true);
eq("escalier : en difficulté, on redescend jusqu'à la réussite", estimation(ef, D2[0]), 1);
const plan = construireParcours(D2, { calc: 1, geo: 2 }, 8, () => false);
eq("parcours : le domaine le plus en retard passe d'abord", plan[0].dom, "calc");
eq("parcours : un domaine au maximum ne propose plus rien", construireParcours(D2, { calc: 1, geo: 4 }, 8, () => false).some((x) => x.dom === "geo"), false);
eq("parcours : une consolidation pour le domaine en retard", plan[0].raison, "consolider");
eq("parcours : les deux domaines sont entremêlés", plan.slice(0, 3).map((x) => x.dom).includes("geo"), true);
eq("parcours : rien sous le niveau sauf la consolidation", plan.filter((x) => x.dom === "calc" && x.raison !== "consolider").every((x) => Number(x.key.split("-")[1]) >= 0), true);
eq("parcours : les leçons déjà réussies sont retirées", construireParcours(D2, { calc: 1, geo: 4 }, 8, (k) => k === "a/a-1").some((x) => x.key === "a/a-1"), false);
eq("mondes ouverts : acquis + parcours", mondesAOuvrir(D2, { calc: 3, geo: 2 }, []).sort(), ["a", "b", "g"]);

console.log(`Tests unitaires : ${ok} réussis, ${ko.length} échec(s).`);
if (ko.length) {
  console.error(ko.map((x) => "- " + x).join("\n"));
  process.exit(1);
}
