// Tests unitaires des modules purs : fusion des progressions (changement d'appareil),
// exercices de production (relier, rappel libre), plan des défis.
// npm run test:unit (inclus dans npm test)
import { fusionnerEnfant, fusionnerProfils } from "../src/lib/fusion";
import { check, idees, instantiate, pourquoiBlocs } from "../src/lib/gen";
import { planDefi } from "../src/lib/plan";
import { toSpeech } from "../src/lib/speech";
import { nombreDit } from "../src/lib/nombresDits";
import type { Child, ExSpec, Lesson, World } from "../src/lib/types";
import { nomClasse, domainesATester, exercicesTest, jeuneLecteur, lectriceAgile8, plancherBacle, questionsIle, testBacle, classeDeLAge, construireParcours, departEscalier, niveauDuMoment, pointConseille, questionsParIle, domainesDe, estimation, mondesAOuvrir, niveauLecon, pas, tranche } from "../src/lib/parcours";


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
const lib: ExSpec = { type: "libre", enonce: "Écris", cles: [["évaporation"], ["condensation"], ["nuage", "nuages"]], modele: "L'eau s'évapore, puis la condensation forme les nuages.", min_cles: 2 };
const li = instantiate(lib, 1);
eq("libre : idées retrouvées malgré les accents et les pluriels", idees(li, "L'eau s'evapore (evaporation) puis forme des nuages"), [0, 2]);
eq("libre : réussi avec 2 idées sur 3", check(li, { kind: "text", value: "Il y a l'evaporation puis la condensation" }).ok, true);
eq("libre : une liste de mots-clés ne suffit pas", check(li, { kind: "text", value: "evaporation condensation nuages" }).ok, false);
eq("libre : fautes d'orthographe tolérées", check(li, { kind: "text", value: "Il y a l'evaporaton puis la condesation" }).ok, true);
eq("libre : un mot voisin n'est pas une idée", idees(li, "la vaporisation de la conversation"), []);
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
eq("échelle jusqu'à Bac+3", [tranche("Bac+2"), tranche("Supérieur – Bac+3"), classeDeLAge(20), classeDeLAge(18), nomClasse(15)], [[14, 14], [13, 15], 15, 13, "Bac+3"]);
const lec = (id: string): Lesson => ({ id, titre: id, objectif: "", duree: 5, etapes: [], nb_defi: 6, exercices: [{ type: "nombre", enonce: "q", reponse: "1" }] });
const monde = (id: string, niveau: string, n: number, ordre: number) => ({ id, titre: id, emoji: "", couleur: "", cycle: "graines", age: "", niveau, ordre, prerequis: [], version: "1", matiere: "maths", lecons: Array.from({ length: n }, (_, i) => lec(`${id}-${i}`)) }) as unknown as World;
const W2 = [monde("a", "CP – CE2", 3, 1), monde("b", "CE2 – CM2", 3, 2), monde("g", "CE1 – CM1", 4, 3)];
eq("niveau d'une leçon interpolé", [niveauLecon(W2[0], 0), niveauLecon(W2[0], 1), niveauLecon(W2[0], 2)], [1, 2, 3]);
const D2 = domainesDe("maths", W2, [{ id: "calc", titre: "Calcul", mondes: ["a", "b"] }, { id: "geo", titre: "Géo", mondes: ["g"] }]);
eq("domaines : leçons rangées par niveau", D2[0].lecons.map((l) => l.niveau), [1, 2, 3, 3, 4, 5]);
eq("domaines : spécialité facultative hors test", domainesDe("maths", [...W2, { ...monde("s", "1ʳᵉ", 3, 9), specialite: "NSI" } as World]).flatMap((d) => d.lecons.map((l) => l.world.id)).includes("s"), false);
const ETE = new Date(2027, 6, 1); // classe finie : niveau attendu = classe de l'âge
eq("niveau du moment : 8 ans en octobre = CE1 acquis (≈ 2,1)", Math.round(niveauDuMoment(8, new Date(2026, 9, 15)) * 10) / 10, 2.1);
eq("niveau du moment : 8 ans en été = CE2 fini", niveauDuMoment(8, ETE), 3);
eq("escalier : en octobre, départ sous la classe en cours", departEscalier(D2[0], 8, undefined, new Date(2026, 9, 15)).cible < 3, true);
let e8 = departEscalier(D2[0], 8, undefined, ETE);
eq("escalier : départ au niveau de l'âge", e8.cible, 3);
e8 = pas(e8, D2[0], 3, true);
e8 = pas(e8, D2[0], 4, true);
e8 = pas(e8, D2[0], 5, false);
eq("escalier : estimation = plus haut réussi sous le premier échec", estimation(e8, D2[0]), 4);
let ef = departEscalier(D2[0], 8, undefined, ETE);
ef = pas(ef, D2[0], 3, false);
ef = pas(ef, D2[0], 2, false);
ef = pas(ef, D2[0], 1, true);
eq("escalier : en difficulté, on redescend jusqu'à la réussite", estimation(ef, D2[0]), 1);
const plan = construireParcours(D2, { calc: 1, geo: 2 }, 8, () => false, 18, ETE);
eq("parcours : le domaine le plus en retard passe d'abord", plan[0].dom, "calc");
eq("parcours : un domaine au maximum ne propose plus rien", construireParcours(D2, { calc: 1, geo: 4 }, 8, () => false, 18, ETE).some((x) => x.dom === "geo"), false);
eq("parcours : une consolidation pour le domaine en retard", plan[0].raison, "consolider");
eq("parcours : les deux domaines sont entremêlés", plan.slice(0, 3).map((x) => x.dom).includes("geo"), true);
eq("parcours : rien sous le niveau sauf la consolidation", plan.filter((x) => x.dom === "calc" && x.raison !== "consolider").every((x) => Number(x.key.split("-")[1]) >= 0), true);
eq("parcours : les leçons déjà réussies sont retirées", construireParcours(D2, { calc: 1, geo: 4 }, 8, (k) => k === "a/a-1", 18, ETE).some((x) => x.key === "a/a-1"), false);
const P0 = { at: 0, niveaux: {}, etapes: [{ key: "a/a-1", dom: "calc", raison: "nouveau" as const }], nonTestes: [] };
eq("faire le point : 8 jours après le premier test", pointConseille(P0, () => false, 8 * 86400000, true), true);
eq("faire le point : 8 jours après un test suivant, pas encore", pointConseille(P0, () => false, 8 * 86400000, false), false);
eq("test : 2 questions par île à 8 ans", questionsParIle(8, 6), 2);
eq("test : 3 questions par île à 9 ans", questionsParIle(9, 6), 3);
eq("test : 5 questions pour une planète à une île", questionsParIle(8, 1), 5);
eq("faire le point : 2 questions", questionsParIle(12, 6, true), 2);
let e2q = departEscalier(D2[0], 8, undefined, ETE);
e2q = pas(e2q, D2[0], 3, true);
e2q = pas(e2q, D2[0], 4, false);
eq("escalier à 2 questions : réussite puis échec = niveau réussi", estimation(e2q, D2[0]), 3);
eq("mondes ouverts : acquis + parcours", mondesAOuvrir(D2, { calc: 3, geo: 2 }, []).sort(), ["a", "b", "g"]);

// ---------- Audit « 7 ans » : test, défis, voix ----------
const NOV = new Date(2026, 10, 8);
const DOMS = [{ id: "nb", min: 0 }, { id: "calc", min: 1 }, { id: "frac", min: 2 }, { id: "geo", min: 2 }] as unknown as Parameters<typeof domainesATester>[0];
eq("test 7 ans en novembre : îles déjà commencées seulement", domainesATester(DOMS, 7, NOV).map((d) => d.id), ["nb", "calc"]);
eq("test 8 ans en novembre : îles du CE1", domainesATester(DOMS, 8, NOV).map((d) => d.id), ["nb", "calc", "frac", "geo"]);
eq("test : toujours au moins une île", domainesATester([{ id: "x", min: 5 }] as never, 6, NOV).map((d) => d.id), ["x"]);
const LT = { exercices: [{ type: "mot", enonce: "a", niveau: 1 }, { type: "nombre", enonce: "b", niveau: 1 }, { type: "nombre", enonce: "c", niveau: 3 }] } as unknown as Lesson;
eq("test < 9 ans : ni mot à écrire, ni niveau 3", exercicesTest(LT, 7).map((e) => e.enonce), ["b"]);
eq("test 10 ans : tout", exercicesTest(LT, 10).length, 3);
eq("jeune lecteur : 8 ans", jeuneLecteur({ age: 8 }), true);
eq("jeune lecteur : 10 ans débutant", jeuneLecteur({ age: 10, lecteur: "debutant" }), true);
eq("jeune lecteur : 10 ans lecteur", jeuneLecteur({ age: 10, lecteur: "oui" }), false);
const SPJ = [
  { type: "qcm", enonce: "q", choix: ["a", "b", "c"], niveau: 1 },
  { type: "relier", enonce: "r", niveau: 2 },
  { type: "libre", enonce: "l", niveau: 3 },
  { type: "mot", enonce: "m", niveau: 3, rappel: true },
  { type: "nombre", enonce: "n", niveau: 2 },
] as ExSpec[];
for (let i = 0; i < 20; i++) {
  const p = planDefi(SPJ, 5, { jeune: true });
  if (p.some((e) => e.type === "libre" || e.rappel)) { ko.push("défi jeune : rédaction ou rappel présent"); break; }
  if (!p.some((e) => e.type === "relier")) { ko.push("défi jeune : pas de production (relier)"); break; }
}
ok++;
eq("défi 10 ans : la rédaction reste possible", planDefi(SPJ, 5).some((e) => e.type === "libre" || e.type === "mot"), true);
eq("voix : fraises", toSpeech("Y a-t-il plus de 🍓 ou de 🍌 ?"), "Y a-t-il plus de fraises ou de bananes ?");
eq("voix : ronds de couleur", toSpeech("🔴🔵🔴"), "rond rouge rond bleu rond rouge");
eq("voix : trois ronds", toSpeech("🔴🔴🔴"), "3 ronds rouges");
eq("voix : couleur déjà dite", toSpeech("red 🔴 rouge"), "red rouge");
eq("voix : ordinaux", toSpeech("🍎 1ᵉʳ, 🍌 2ᵉ, le 15ᵉ rond, la 1ʳᵉ"), "pomme premier, banane deuxième, le quinzième rond, la première");
eq("voix : nombre cherché", toSpeech("3 × ? = 12"), "3 fois combien égale 12");
eq("voix : flèche", toSpeech("23 → 230"), "23 donne 230");
eq("voix : signe cité", toSpeech("Le signe **<** est une bouche"), "Le signe « plus petit que » est une bouche");
eq("voix : neuvième, cinquième", toSpeech("9ᵉ et 5ᵉ"), "neuvième et cinquième");

// ---------- Réponse dite au micro ----------
for (const [dit, n] of [["quarante-trois", 43], ["soixante-dix-sept", 77], ["quatre-vingts", 80], ["quatre-vingt-dix-neuf", 99], ["vingt et un", 21], ["cent quatre", 104], ["deux cent quatre-vingts", 280], ["mille deux cent", 1200], ["trois cent mille", 300000], ["43", 43], ["ça fait 12", 12], ["c'est euh quinze", 15], ["1 200", 1200], ["trois virgule cinq", 3.5], ["2,05", 2.05], ["zéro", 0], ["moins quatre", -4], ["bonjour", null], ["sept cents", 700]] as [string, number | null][]) eq(`nombre dit : ${dit}`, nombreDit(dit), n);

eq("blocs : inversion", pourquoiBlocs(0, 5, 9, 95), "Tu as inversé : tu as mis 5 barres de 10 et 9 petits cubes. Pour 95, il faut 9 barres de 10 et 5 petits cubes.");
eq("blocs : il manque", pourquoiBlocs(0, 1, 1, 95), "Tu as posé 1 barre de 10 et 1 petit cube : ça fait 11. Pour 95, ajoute 8 barres et ajoute 4 petits cubes.");

eq("voix : majuscules d'insistance", toSpeech("Résume CETTE leçon : COMPRENDRE, puis VÉRIFIER. CE1 et ADN."), "Résume cette leçon : comprendre, puis vérifier. CE1 et ADN.");
// ---------- Audit « 8 ans » ----------
eq("test bâclé : 5 « je ne sais pas » sur 6", testBacle(5, 6), true);
eq("test bâclé : 3 sur 6 = non", testBacle(3, 6), false);
eq("test bâclé : trop peu de réponses", testBacle(3, 3), false);
const DB = [{ id: "nb", min: 0, max: 12 }, { id: "mes", min: 2, max: 5 }] as unknown as Parameters<typeof plancherBacle>[0];
const pb = plancherBacle(DB, { nb: -1, mes: 1 }, 8, NOV);
eq("plancher bâclé : pas sous la classe précédente (8 ans, novembre)", Math.round(pb.nb * 10) / 10, 0.7);
eq("plancher bâclé : île pas commencée inchangée", pb.mes, 1);
eq("île sans marche basse : 1 question à 8 ans en novembre", questionsIle({ min: 2 } as never, 8, 6, false, NOV), 1);
eq("île commencée : 2 questions", questionsIle({ min: 0 } as never, 8, 6, false, NOV), 2);
eq("île sans marche basse : 3 questions à 9 ans", questionsIle({ min: 2 } as never, 9, 6, false, NOV), 3);
eq("lectrice à l'aise de 8 ans", lectriceAgile8({ age: 8, lecteur: "oui" }), true);
eq("lectrice débutante de 8 ans", lectriceAgile8({ age: 8, lecteur: "debutant" }), false);
const SP8 = [...SPJ, { type: "nombre", enonce: "n2", niveau: 1 }, { type: "nombre", enonce: "n3", niveau: 2 }] as ExSpec[];
for (let i = 0; i < 20; i++) {
  const p = planDefi(SP8, 5, { jeune: true, unRappel: true });
  if (p.filter((e) => e.rappel).length !== 1 || p.some((e) => e.type === "libre")) { ko.push("défi lectrice 8 ans : il faut exactement un « mot qui manque » et aucune rédaction"); break; }
}
ok++;
for (let i = 0; i < 20; i++) {
  const p = planDefi(SP8, 5, { jeune: true });
  const c: Record<string, number> = {};
  for (const e of p) c[e.type] = (c[e.type] ?? 0) + 1;
  if (Math.max(...Object.values(c)) > 2) { ko.push("défi : un type dépasse la moitié alors que d'autres existent"); break; }
}
ok++;
const W8: World[] = [{ id: "z", titre: "Z", matiere: "maths", cycle: "explorateurs", niveau: "CE2", lecons: [{ id: "l1", titre: "L1", exercices: [{ type: "nombre", enonce: "x" }] }, { id: "l2", titre: "L2", exercices: [{ type: "nombre", enonce: "x" }] }] } as unknown as World];
const D8 = domainesDe("maths", W8, [{ id: "geo", titre: "Géo", mondes: ["z"] }]);
const et8 = construireParcours(D8, { geo: D8[0].min - 1 }, 8, () => false, 18, NOV);
eq("parcours : île pas commencée = « nouveau »", et8.every((e) => e.raison === "nouveau"), true);

eq("plancher bâclé : île commencée depuis plus d'un an = au moins son début", plancherBacle([{ id: "calc", min: 1, max: 5 }] as never, { calc: 0 }, 8, NOV).calc, 1);
eq("voix : CO₂", toSpeech("Les plantes absorbent le CO₂."), "Les plantes absorbent le C O 2.");
eq("voix : H₂O", toSpeech("L'eau a pour formule H₂O."), "L'eau a pour formule H 2 O.");
eq("voix : siècle en chiffres romains", toSpeech("Au XVIIIᵉ siècle"), "Au dix-huitième siècle");
eq("voix : chapitre IX", toSpeech("Le chapitre IX"), "Le chapitre 9");
eq("voix : roi", toSpeech("Louis XIV"), "Louis 14");
eq("voix : perpendiculaire", toSpeech("(AB) ⊥ (CD)"), "(AB) est perpendiculaire à (CD)");
eq("voix : mètre cube", toSpeech("1 m³ = 1 000 L"), "1 mètre cube égale 1 000 litres");
eq("voix : centimètres carrés", toSpeech("12 cm²"), "12 centimètres carrés");
eq("voix : km/h", toSpeech("5 km/h"), "5 kilomètres par heure");
eq("voix : d / t", toSpeech("v = d / t"), "v égale d divisé par t");
eq("voix : « Le » n'est pas un chiffre romain", toSpeech("Le CE1 et la classe"), "Le CE1 et la classe");
eq("voix : « Ver » n'est pas un chiffre romain", toSpeech("Ver de terre"), "Ver de terre");
eq("voix : François Ier", toSpeech("François Ier"), "François premier");
eq("voix : ion fer", toSpeech("l'ion Fe²⁺"), "l'ion F e 2 plus");
eq("voix : ion hydroxyde", toSpeech("l'ion OH⁻"), "l'ion O H moins");
eq("voix : ion sodium", toSpeech("Na⁺"), "N a plus");
eq("voix : exposant", toSpeech("1,5 × 10⁸ km"), "1,5 fois 10 puissance 8 kilomètres");
eq("voix : exposant négatif", toSpeech("10⁻³"), "10 puissance moins 3");
eq("voix : carré inchangé", toSpeech("5 cm²"), "5 centimètres carrés");
eq("voix : fonction", toSpeech("$f : x \\mapsto 2x + 3$"), "f qui à x associe 2x plus 3");
eq("voix : norme", toSpeech("$\\|\\vec{u}\\|$"), "norme du vecteur u");
eq("voix : triangle Δ", toSpeech("ΔABC"), "le triangle A B C");
eq("voix : quadrilatère nommé", toSpeech("le quadrilatère ABCD"), "le quadrilatère A B C D");
eq("voix : f(x)", toSpeech("f(x) = 2x"), "f de x égale 2x");
eq("voix : signe entre parenthèses", toSpeech("aigu (< 90°)"), "aigu (moins de 90 degrés)");
eq("voix : vecteur en double", toSpeech("Un vecteur $\\overrightarrow{AB}$"), "Un vecteur A B");
eq("voix : chromosomes", toSpeech("XX ou XY"), "X X ou X Y");
eq("voix : inégalité dans une formule", toSpeech("le maximum (si $a<0$)"), "le maximum (si a inférieur à 0 )");
eq("voix : code Python", /x prend la valeur 3.*n égal à 0.*augmente de 1/.test(toSpeech("On écrit `x = 3`, on teste `n == 0` et `i += 1`.")), true);
eq("voix : sigle épelé", toSpeech("Le protocole HTTPS et la spécialité HGGSP").includes("HTTPS et la spécialité HGGSP"), true);
eq("voix : XXᵉ siècle, années, N·m, 1 m", [toSpeech("au XXᵉ siècle").includes("vingtième"), toSpeech("vers 1600-1750").includes("1600 à 1750"), toSpeech("un couple en N·m").includes("newton-mètres"), toSpeech("à 1 m de l'axe").includes("1 mètre de"), toSpeech("les chromosomes XY").includes("X Y")], [true, true, true, true, true]);
eq("voix : unités composées, sigles, milliers", [toSpeech("environ 1 g/L à jeun").includes("1 gramme par litre"), toSpeech("2 700 kg/m³").includes("kilogrammes par mètre cube"), toSpeech("1 ha = 10 000 m²").includes("10 000 mètres carrés"), toSpeech("la méthode HACCP").includes("HACCP"), toSpeech("70 q/ha").includes("quintaux par hectare")], [true, true, true, true, true]);
eq("voix : ordinaux en -s", [toSpeech("la 3ᵉ personne").includes("troisième"), toSpeech("le 23ᵉ jour").includes("vingt-troisième"), toSpeech("le 80ᵉ jour").includes("quatre-vingtième")], [true, true, true]);
eq("voix : tiret de titre, factorielle, implication", [
  toSpeech("Narrative tenses - les temps du récit").includes("tenses, les temps"),
  toSpeech("on calcule x - y").includes("moins"),
  toSpeech("12 - 5 = 7").includes("12 moins 5"),
  toSpeech(String.raw`$\dfrac{1}{2!}$`).includes("factorielle 2"),
  toSpeech("continue ⇒ solution").includes("donc"),
  toSpeech(String.raw`$y'' + a\,y' = 0$`).includes("a y prime"),
], [true, true, true, true, true, true]);
eq("voix : fraction contenant un indice ou un exposant", [
  toSpeech(String.raw`$\dfrac{V_{max} [S]}{K_m + [S]}$`).includes("max [S] sur K"),
  toSpeech(String.raw`$\dfrac{e^{x}}{x^{3}}$`).includes("e puissance x sur x au cube"),
  toSpeech(String.raw`$e^{-E_a / RT}$`).includes("E a sur RT"),
], [true, true, true]);
eq("voix : notations Bac+2 et Bac+3", [
  toSpeech(String.raw`$\sum_{n=0}^{+\infty} q^n$`).includes("somme pour n égale 0 jusqu'à"),
  toSpeech(String.raw`$\int_1^{+\infty} f(t)\,dt$`).includes("intégrale de 1 à"),
  toSpeech(String.raw`$\dfrac{\partial f}{\partial x}$`).includes("dérivée partielle de f par rapport à x"),
  toSpeech(String.raw`$\theta \leftarrow \theta - \eta \nabla J$`).includes("prend la valeur theta moins eta gradient de J"),
  toSpeech(String.raw`$\det(A)$`).includes("déterminant de"),
  toSpeech(String.raw`$\dfrac{1}{n^\alpha}$`).includes("puissance alpha"),
], [true, true, true, true, true, true]);
eq("voix : notations du supérieur", [
  toSpeech(String.raw`$\lim\limits_{n \to +\infty} u_n = \ell$`).includes("limite quand n tend vers"),
  toSpeech(String.raw`$\forall \varepsilon > 0, \exists N$`).includes("pour tout epsilon"),
  toSpeech(String.raw`$|u_n - \ell|$`).includes("valeur absolue de"),
  toSpeech(String.raw`$f'(a)$ et $y''$`).includes("f prime de a"),
  toSpeech(String.raw`$\ker f$`).includes("noyau de f"),
  toSpeech(String.raw`$\mathbb{R}^2$`).includes("R 2"),
  !toSpeech(String.raw`$\lim\limits_{x \to 0} f(x)$`).includes("its"),
], [true, true, true, true, true, true, true]);
console.log(`Tests unitaires : ${ok} réussis, ${ko.length} échec(s).`);
if (ko.length) {
  console.error(ko.map((x) => "- " + x).join("\n"));
  process.exit(1);
}
