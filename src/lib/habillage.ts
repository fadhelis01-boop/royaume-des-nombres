// Habillage des questions : un habitant du monde « présente » chaque question,
// avec une phrase différente. Les nombres changent déjà à chaque tirage ; ainsi
// la mise en scène change aussi, et la 5ᵉ question ne ressemble plus à la 1ʳᵉ.
// Le 3ᵉ élément est l'identifiant de l'illustration (img/habitants/<id>.webp), quand elle existe.

type H = [string, string, string];
const HABITANTS: Record<string, H[]> = {
  "nid-des-nombres": [["🐣", "un bébé nombre", "bebe-nombre"], ["🐦", "Maman Oiselle", "oiselle"], ["🐿️", "l'écureuil du nid", "ecureuil"]],
  "foret-des-nombres": [["🐿️", "un écureuil", "ecureuil"], ["🦔", "un hérisson", "herisson"], ["🦉", "la chouette de l'Arbre-Monde", "chouette"]],
  "prairie-des-additions": [["🐰", "un lapin", "lapin"], ["🦔", "une hérissonne", "herissonne"], ["🐝", "une abeille", "abeille"]],
  "montagne-des-multiplications": [["🦫", "une marmotte", "marmotte"], ["🐐", "le bouquetin guide", "bouquetin"], ["🦅", "un aigle", "aigle"]],
  "riviere-du-partage": [["🦫", "un castor", "castor"], ["🐸", "une grenouille", "grenouille"], ["🐟", "un poisson bavard", "poisson"]],
  "marche-des-mesures": [["🦔", "la marchande", "marchande"], ["🐭", "une souris", "souris"], ["🐰", "un client pressé", "client"]],
  "cite-des-formes": [["🐢", "la tortue géomètre", "tortue"], ["🦫", "un castor architecte", "castor-architecte"], ["🕊️", "un pigeon", "pigeon"]],
  "village-des-fractions": [["🐰", "le lapin pâtissier", "patissier"], ["🐭", "la souris boulangère", "boulangere"], ["🐦", "un oiseau gourmand", "oiseau"]],
  "port-des-decimaux": [["🦦", "une loutre du port", "loutre"], ["🐦", "le pélican capitaine", "pelican"], ["🦀", "un crabe", "crabe"]],
  "atelier-des-problemes": [["🦝", "le raton laveur bricoleur", "raton"], ["🕷️", "l'araignée détective", "araignee"], ["🐌", "un escargot curieux", "escargot"]],
  "jardin-de-fibonacci": [["🐌", "un escargot", "escargot"], ["🐝", "une abeille", "abeille"], ["🐰", "un lapin", "lapin"]],
  "tour-des-proportions": [["🦒", "la girafe cartographe", "girafe"], ["🐜", "une fourmi", "fourmi"], ["🦊", "le chef de gare", "chef-gare"]],
  "royaume-des-relatifs": [["🐧", "un manchot", "manchot"], ["🦭", "le phoque", "phoque"], ["🐧", "un manchot frileux", "manchot"]],
  "grotte-de-l-algebre": [["🦇", "une chauve-souris", "chauve-souris"], ["🦎", "un axolotl", "axolotl"], ["🦇", "une chauve-souris rieuse", "chauve-souris"]],
  "chateau-de-la-geometrie": [["🦉", "le hibou architecte", "hibou"], ["🐐", "une chèvre des remparts", "chevre"], ["🦉", "le hibou des tours", "hibou"]],
  "tour-des-puissances": [["🐿️", "un écureuil volant", "ecureuil-volant"], ["🐰", "l'astronaute lapin", "lapin-astronaute"], ["🐿️", "un écureuil pilote", "ecureuil-volant"]],
  "observatoire-des-donnees": [["🦦", "un suricate guetteur", "suricate"], ["🦉", "le hibou statisticien", "hibou-stat"], ["🦦", "une suricate qui compte", "suricate"]],
};
const PAR_CYCLE: Record<string, H[]> = {
  astuces: [["🦉", "la chouette de l'École", "chouette"]],
  maitres: [["🦉", "le gardien de la Bibliothèque", "hibou"], ["🦉", "une chouette savante", "chouette"]],
};
const LEADS = ["{n} a besoin de toi :", "{n} te lance un défi :", "{n} se gratte la tête :", "{n} te demande :", "{n} parie que tu ne trouveras pas :"];

export interface Lead {
  emoji: string;
  id: string;
  text: string;
}

export function leadFor(worldId: string, cycle: string, seed: number): Lead | undefined {
  const pool = HABITANTS[worldId] ?? PAR_CYCLE[cycle];
  if (!pool) return undefined;
  const [emoji, n, id] = pool[seed % pool.length];
  const t = LEADS[Math.floor(seed / 7) % LEADS.length].replace("{n}", n);
  return { emoji, id, text: t.charAt(0).toUpperCase() + t.slice(1) };
}
