// Habillage des questions : un habitant du monde « présente » chaque question,
// avec une phrase différente. Les nombres changent déjà à chaque tirage ; ainsi
// la mise en scène change aussi, et la 5ᵉ question ne ressemble plus à la 1ʳᵉ.

const HABITANTS: Record<string, [string, string][]> = {
  "nid-des-nombres": [["🐣", "un bébé nombre"], ["🐦", "Maman Oiselle"], ["🐿️", "l'écureuil du nid"]],
  "foret-des-nombres": [["🐿️", "un écureuil"], ["🦔", "un hérisson"], ["🦉", "la chouette de l'Arbre-Monde"]],
  "prairie-des-additions": [["🐰", "un lapin"], ["🦔", "une hérissonne"], ["🐝", "une abeille"]],
  "montagne-des-multiplications": [["🦫", "une marmotte"], ["🐐", "le bouquetin guide"], ["🦅", "un aigle"]],
  "riviere-du-partage": [["🦫", "un castor"], ["🐸", "une grenouille"], ["🐟", "un poisson bavard"]],
  "marche-des-mesures": [["🦔", "la marchande"], ["🐭", "une souris"], ["🐰", "un client pressé"]],
  "cite-des-formes": [["🐢", "la tortue géomètre"], ["🦫", "un castor architecte"], ["🕊️", "un pigeon"]],
  "village-des-fractions": [["🐰", "le lapin pâtissier"], ["🐭", "la souris boulangère"], ["🐦", "un oiseau gourmand"]],
  "port-des-decimaux": [["🦦", "une loutre du port"], ["🐦", "le pélican capitaine"], ["🦀", "un crabe"]],
  "atelier-des-problemes": [["🦝", "le raton laveur bricoleur"], ["🕷️", "l'araignée détective"], ["🔎", "le carnet d'enquête"]],
  "jardin-de-fibonacci": [["🐌", "un escargot"], ["🐝", "une abeille"], ["🐰", "un lapin"]],
  "tour-des-proportions": [["🦒", "la girafe cartographe"], ["🐜", "une fourmi"], ["🚂", "le chef de gare"]],
  "royaume-des-relatifs": [["🐧", "un manchot"], ["🦭", "le phoque"], ["👑", "le roi Zéro"]],
  "grotte-de-l-algebre": [["🦎", "Ixe"], ["🦇", "une chauve-souris"], ["🦎", "un axolotl"]],
  "chateau-de-la-geometrie": [["🦉", "le hibou architecte"], ["🐐", "une chèvre des remparts"], ["📐", "l'arpenteur"]],
  "tour-des-puissances": [["🐿️", "un écureuil volant"], ["🐰", "l'astronaute lapin"], ["🚀", "le contrôle de vol"]],
  "observatoire-des-donnees": [["🦦", "un suricate guetteur"], ["🦉", "le hibou statisticien"], ["🔭", "l'astronome"]],
};
const PAR_CYCLE: Record<string, [string, string][]> = {
  astuces: [["💡", "la Lampe des Astuces"], ["🦉", "la chouette de l'École"]],
  maitres: [["📜", "un vieux livre"], ["🧭", "une savante"], ["🦉", "le gardien de la Bibliothèque"]],
};
const LEADS = ["{e} {n} a besoin de toi :", "{e} {n} te lance un défi :", "{e} {n} se gratte la tête :", "{e} {n} te demande :", "{e} {n} parie que tu ne trouveras pas :"];

export function leadFor(worldId: string, cycle: string, seed: number): string {
  const pool = HABITANTS[worldId] ?? PAR_CYCLE[cycle];
  if (!pool) return "";
  const [e, n] = pool[seed % pool.length];
  const t = LEADS[Math.floor(seed / 7) % LEADS.length];
  const s = t.replace("{e}", e).replace("{n}", n);
  return s.replace(/^(\S+) (\p{Ll})/u, (_, a, b) => `${a} ${b.toUpperCase()}`);
}
