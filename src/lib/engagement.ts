// Motivation (audit 2.1) : quêtes du jour variées, habitant libéré à mi-monde, album à compléter.
// Les récompenses récompensent l'effort et la variété, jamais le temps passé devant l'écran.
import { VISUELS } from "./visuels";
import { addGems, dayKey, toast, updateChild } from "./store";
import type { Child, World } from "./types";

// ---------- Quêtes du jour ----------
export interface Quete {
  id: string;
  emoji: string;
  texte: string;
  compteur: string; // clé de child.counters
  n: number;
  vers?: string; // où aller pour la faire
}
const APPRENDRE: Quete[] = [
  { id: "justes", emoji: "🎯", texte: "Réponds juste à 10 questions", compteur: "ok", n: 10 },
  { id: "defi", emoji: "⭐", texte: "Termine un défi de leçon", compteur: "defis", n: 1 },
  { id: "souvenir", emoji: "🧠", texte: "Réussis une question souvenir dans un défi", compteur: "souvenir-ok", n: 1 },
];
const EXPLORER: Quete[] = [
  { id: "experience", emoji: "🧪", texte: "Fais une expérience pour de vrai", compteur: "experience", n: 1, vers: "/galaxie" },
  { id: "dessin", emoji: "✏️", texte: "Dessine dans l'Atelier", compteur: "dessin-libre", n: 1, vers: "/studio/dessin" },
  { id: "oreille", emoji: "👂", texte: "Joue une partie d'Oreille d'or", compteur: "oreille-parties", n: 1, vers: "/jeux/oreille" },
  { id: "jeu", emoji: "🎮", texte: "Joue à un jeu de la Galaxie", compteur: "jeux", n: 1, vers: "/jeux" },
  { id: "musique", emoji: "🎹", texte: "Compose une mélodie au studio", compteur: "studio-notes", n: 1, vers: "/studio/musique" },
];
const HABITUDE: Quete[] = [
  { id: "revision", emoji: "🔁", texte: "Fais une séance de révision", compteur: "revision", n: 1, vers: "/revisions" },
  { id: "echauffement", emoji: "🏃", texte: "Fais un échauffement", compteur: "echauffement", n: 1, vers: "/echauffement" },
  { id: "explique", emoji: "💬", texte: "Explique ton raisonnement à un personnage", compteur: "explique", n: 1 },
];
const TOUTES = [...APPRENDRE, ...EXPLORER, ...HABITUDE];
const GAIN = 5;

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Les 3 quêtes du jour (une pour apprendre, une pour explorer, une bonne habitude), stables dans la journée. */
export function quetesDuJour(c: Child): { q: Quete; fait: number; ok: boolean }[] {
  const day = dayKey();
  const h = hash(day + c.id);
  const ids = [APPRENDRE[h % APPRENDRE.length], EXPLORER[(h >>> 5) % EXPLORER.length], HABITUDE[(h >>> 9) % HABITUDE.length]];
  const base = c.quetes?.day === day ? c.quetes.base : null;
  return ids.map((q) => {
    const fait = base ? Math.max(0, (c.counters[q.compteur] ?? 0) - (base[q.compteur] ?? 0)) : 0;
    return { q, fait: Math.min(fait, q.n), ok: !!c.quetes?.faites?.includes(q.id) };
  });
}

/** À appeler à l'affichage : pose le point de départ du jour, puis récompense les quêtes accomplies. */
export function majQuetes(c: Child) {
  const day = dayKey();
  if (c.quetes?.day !== day) {
    updateChild((x) => {
      x.quetes = { day, base: Object.fromEntries(TOUTES.map((q) => [q.compteur, x.counters[q.compteur] ?? 0])), faites: [] };
    });
    return;
  }
  for (const { q, fait, ok } of quetesDuJour(c)) {
    if (!ok && fait >= q.n) {
      updateChild((x) => {
        x.quetes!.faites = [...(x.quetes!.faites ?? []), q.id];
      });
      addGems(GAIN);
      toast(`Quête réussie : ${q.texte} (+${GAIN} 💎)`, q.emoji);
    }
  }
}

// ---------- Habitants libérés et album ----------
const NOMS: Record<string, string> = {
  "bebe-nombre": "Le bébé nombre", oiselle: "Maman Oiselle", ecureuil: "L'écureuil", herisson: "Le hérisson", chouette: "La chouette",
  lapin: "Le lapin", herissonne: "La hérissonne", abeille: "L'abeille", marmotte: "La marmotte", bouquetin: "Le bouquetin", aigle: "L'aigle",
  castor: "Le castor", grenouille: "La grenouille", poisson: "Le poisson bavard", marchande: "La marchande", souris: "La souris", client: "Le client pressé",
  tortue: "La tortue géomètre", "castor-architecte": "Le castor architecte", pigeon: "Le pigeon", patissier: "Le lapin pâtissier", boulangere: "La souris boulangère",
  oiseau: "L'oiseau gourmand", loutre: "La loutre du port", pelican: "Le pélican capitaine", crabe: "Le crabe", raton: "Le raton bricoleur",
  araignee: "L'araignée détective", escargot: "L'escargot curieux", girafe: "La girafe cartographe", fourmi: "La fourmi", "chef-gare": "Le chef de gare",
  manchot: "Le manchot", phoque: "Le phoque", "chauve-souris": "La chauve-souris", axolotl: "L'axolotl", hibou: "Le hibou architecte", chevre: "La chèvre",
  "ecureuil-volant": "L'écureuil volant", "lapin-astronaute": "Le lapin astronaute", suricate: "Le suricate", "hibou-stat": "Le hibou statisticien",
};
export const HABITANTS_ALBUM: { id: string; nom: string }[] = (VISUELS.habitants ?? []).filter((id) => !id.startsWith("muse-")).map((id) => ({ id, nom: NOMS[id] ?? id }));

/**
 * Mi-monde : quand la moitié des leçons d'un monde est réussie, un habitant est libéré du gris
 * (un petit événement au milieu du monde, avant le grand moment du Gardien) et rejoint l'album.
 */
export function verifierMiMonde(c: Child, w: World) {
  const faites = w.lecons.filter((l) => c.progress[`${w.id}/${l.id}`]?.done).length;
  if (w.lecons.length < 2 || faites < Math.ceil(w.lecons.length / 2) || c.counters[`mi:${w.id}`]) return;
  const libres = new Set(c.album ?? []);
  const restants = HABITANTS_ALBUM.filter((h) => !libres.has(h.id));
  const h = restants.length ? restants[hash(w.id) % restants.length] : null;
  updateChild((x) => {
    x.counters[`mi:${w.id}`] = 1;
    if (h) x.album = [...(x.album ?? []), h.id];
  });
  addGems(5);
  toast(h ? `Mi-parcours ! ${h.nom} est libéré du gris et rejoint ton album (+5 💎)` : "Mi-parcours du monde ! (+5 💎)", "🎉");
}

// ---------- Surprise du jour (2.4) ----------
// Un petit événement différent chaque jour (coffre, comète, visiteur…) avec une récompense qui varie.
// Aucune pression : rien n'est perdu si l'enfant ne vient pas, la surprise est seulement un bonus.
export interface Surprise {
  id: string;
  emoji: string;
  titre: string;
  texte: string;
  compteur?: string;
  n?: number;
  vers?: string;
  enigme?: boolean;
}
export const SURPRISES: Surprise[] = [
  { id: "coffre", emoji: "🎁", titre: "Le coffre mystère", texte: "Un coffre est apparu ! Il s'ouvrira après 5 bonnes réponses.", compteur: "ok", n: 5 },
  { id: "plume", emoji: "✒️", titre: "Le coffre des écrivains", texte: "Ce coffre s'ouvre quand tu réussis un exercice où il faut écrire, relier ou ranger.", compteur: "production-ok", n: 1 },
  { id: "comete", emoji: "☄️", titre: "La comète", texte: "Une comète traverse la Galaxie ! Joue à un jeu pour attraper sa poussière d'étoile.", compteur: "jeux", n: 1, vers: "/jeux" },
  { id: "visiteur", emoji: "🦉", titre: "Le visiteur mystère", texte: "Une chouette savante s'est posée sur ta cabane. Elle a une énigme pour toi.", enigme: true },
  { id: "cle", emoji: "🗝️", titre: "La clé du souvenir", texte: "Une clé brille au fond de tes révisions : fais une séance pour l'attraper.", compteur: "revision", n: 1, vers: "/revisions" },
  { id: "aide", emoji: "🤝", titre: "Le coffre de l'entraide", texte: "Il s'ouvre quand tu expliques ton raisonnement à un personnage.", compteur: "explique", n: 1 },
];
export function surpriseDuJour(c: Child): Surprise {
  return SURPRISES[hash("surprise" + dayKey() + c.id) % SURPRISES.length];
}
/** Avancement de la surprise du jour. */
export function etatSurprise(c: Child) {
  const s = surpriseDuJour(c);
  const st = c.surprise?.day === dayKey() ? c.surprise : null;
  const fait = st && s.compteur ? Math.max(0, (c.counters[s.compteur] ?? 0) - (st.base ?? 0)) : 0;
  return { s, st, fait: Math.min(fait, s.n ?? 1), pret: !!st && !st.ouvert && !s.enigme && fait >= (s.n ?? 1) };
}
/** À l'affichage : pose le point de départ du jour. */
export function initSurprise(c: Child) {
  const s = surpriseDuJour(c);
  if (c.surprise?.day === dayKey()) return;
  updateChild((x) => {
    x.surprise = { day: dayKey(), base: s.compteur ? x.counters[s.compteur] ?? 0 : 0, ouvert: false };
  });
}
/** Ouvre la surprise : une récompense tirée au sort (gemmes, habitant pour l'album, objet de la boutique). */
export async function ouvrirSurprise(c: Child): Promise<string> {
  const { ITEMS } = await import("./shop");
  const r = Math.random();
  const manquants = HABITANTS_ALBUM.filter((h) => !(c.album ?? []).includes(h.id));
  const objets = ITEMS.filter((i) => i.prix <= 30 && !c.owned.includes(i.id));
  let texte: string;
  if (r < 0.25 && manquants.length) {
    const h = manquants[Math.floor(Math.random() * manquants.length)];
    updateChild((x) => {
      x.album = [...(x.album ?? []), h.id];
    });
    texte = `${h.nom} sort du coffre et rejoint ton album !`;
  } else if (r < 0.4 && objets.length) {
    const o = objets[Math.floor(Math.random() * objets.length)];
    updateChild((x) => {
      x.owned = [...x.owned, o.id];
    });
    texte = `${o.emoji} ${o.nom} pour ton personnage ! (à équiper dans la boutique)`;
  } else {
    const g = [5, 8, 10, 12, 15, 20][Math.floor(Math.random() * 6)];
    addGems(g);
    texte = `${g} gemmes 💎 !`;
  }
  updateChild((x) => {
    x.surprise = { ...(x.surprise ?? { day: dayKey(), base: 0 }), ouvert: true, recompense: texte };
  });
  return texte;
}
