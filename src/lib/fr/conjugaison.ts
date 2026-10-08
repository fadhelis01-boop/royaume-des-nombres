// Moteur de conjugaison française, sans dépendance.
// Couvre : les verbes du 1er groupe et leurs particularités orthographiques (-cer, -ger, -eler/-eter, e/é + consonne + er, -yer),
// le 2e groupe (finir, haïr), environ soixante modèles du 3e groupe et leurs composés (prendre → comprendre, venir → devenir…),
// les verbes pronominaux, tous les temps simples et composés de l'indicatif, du conditionnel, du subjonctif et de l'impératif,
// l'accord du participe passé avec être. Les variantes des rectifications de 1990 sont proposées comme réponses acceptées.

export type Temps =
  | "present" | "imparfait" | "passe_simple" | "futur"
  | "passe_compose" | "plus_que_parfait" | "passe_anterieur" | "futur_anterieur"
  | "conditionnel" | "conditionnel_passe"
  | "subjonctif" | "subjonctif_imparfait" | "subjonctif_passe" | "subjonctif_pqp"
  | "imperatif" | "imperatif_passe";

export const TEMPS_NOMS: Record<Temps, string> = {
  present: "présent de l'indicatif", imparfait: "imparfait", passe_simple: "passé simple", futur: "futur simple",
  passe_compose: "passé composé", plus_que_parfait: "plus-que-parfait", passe_anterieur: "passé antérieur", futur_anterieur: "futur antérieur",
  conditionnel: "conditionnel présent", conditionnel_passe: "conditionnel passé",
  subjonctif: "subjonctif présent", subjonctif_imparfait: "subjonctif imparfait", subjonctif_passe: "subjonctif passé", subjonctif_pqp: "subjonctif plus-que-parfait",
  imperatif: "impératif présent", imperatif_passe: "impératif passé",
};
export const PRONOMS = ["je", "tu", "il", "nous", "vous", "ils"];

type Six = [string, string, string, string, string, string];
type PS = "a" | "i" | "u" | "in";

interface Modele {
  pres: Six;
  ps: [string, PS]; // radical du passé simple + type de terminaison
  fut: string; // radical du futur et du conditionnel
  pp: string; // participe passé masculin singulier
  subj?: [string, string]; // radicaux du subjonctif (je/tu/il/ils, nous/vous) si irréguliers
  impf?: string; // radical de l'imparfait si irrégulier
  ppr?: string; // participe présent si irrégulier
  imp?: [string, string, string]; // impératif si irrégulier
  ppf?: string; // participe passé féminin irrégulier (absous → absoute)
}

const ETRE: Record<string, Six> = {
  present: ["suis", "es", "est", "sommes", "êtes", "sont"],
  imparfait: ["étais", "étais", "était", "étions", "étiez", "étaient"],
  passe_simple: ["fus", "fus", "fut", "fûmes", "fûtes", "furent"],
  futur: ["serai", "seras", "sera", "serons", "serez", "seront"],
  conditionnel: ["serais", "serais", "serait", "serions", "seriez", "seraient"],
  subjonctif: ["sois", "sois", "soit", "soyons", "soyez", "soient"],
  subjonctif_imparfait: ["fusse", "fusses", "fût", "fussions", "fussiez", "fussent"],
};
const AVOIR: Record<string, Six> = {
  present: ["ai", "as", "a", "avons", "avez", "ont"],
  imparfait: ["avais", "avais", "avait", "avions", "aviez", "avaient"],
  passe_simple: ["eus", "eus", "eut", "eûmes", "eûtes", "eurent"],
  futur: ["aurai", "auras", "aura", "aurons", "aurez", "auront"],
  conditionnel: ["aurais", "aurais", "aurait", "aurions", "auriez", "auraient"],
  subjonctif: ["aie", "aies", "ait", "ayons", "ayez", "aient"],
  subjonctif_imparfait: ["eusse", "eusses", "eût", "eussions", "eussiez", "eussent"],
};

// Modèles du 3e groupe (formes du verbe de base ; les composés ajoutent leur préfixe).
const M: Record<string, Modele> = {
  aller: { pres: ["vais", "vas", "va", "allons", "allez", "vont"], ps: ["all", "a"], fut: "ir", pp: "allé", subj: ["aill", "all"], imp: ["va", "allons", "allez"] },
  venir: { pres: ["viens", "viens", "vient", "venons", "venez", "viennent"], ps: ["v", "in"], fut: "viendr", pp: "venu" },
  tenir: { pres: ["tiens", "tiens", "tient", "tenons", "tenez", "tiennent"], ps: ["t", "in"], fut: "tiendr", pp: "tenu" },
  partir: { pres: ["pars", "pars", "part", "partons", "partez", "partent"], ps: ["part", "i"], fut: "partir", pp: "parti" },
  sortir: { pres: ["sors", "sors", "sort", "sortons", "sortez", "sortent"], ps: ["sort", "i"], fut: "sortir", pp: "sorti" },
  sentir: { pres: ["sens", "sens", "sent", "sentons", "sentez", "sentent"], ps: ["sent", "i"], fut: "sentir", pp: "senti" },
  mentir: { pres: ["mens", "mens", "ment", "mentons", "mentez", "mentent"], ps: ["ment", "i"], fut: "mentir", pp: "menti" },
  dormir: { pres: ["dors", "dors", "dort", "dormons", "dormez", "dorment"], ps: ["dorm", "i"], fut: "dormir", pp: "dormi" },
  servir: { pres: ["sers", "sers", "sert", "servons", "servez", "servent"], ps: ["serv", "i"], fut: "servir", pp: "servi" },
  ouvrir: { pres: ["ouvre", "ouvres", "ouvre", "ouvrons", "ouvrez", "ouvrent"], ps: ["ouvr", "i"], fut: "ouvrir", pp: "ouvert" },
  couvrir: { pres: ["couvre", "couvres", "couvre", "couvrons", "couvrez", "couvrent"], ps: ["couvr", "i"], fut: "couvrir", pp: "couvert" },
  offrir: { pres: ["offre", "offres", "offre", "offrons", "offrez", "offrent"], ps: ["offr", "i"], fut: "offrir", pp: "offert" },
  souffrir: { pres: ["souffre", "souffres", "souffre", "souffrons", "souffrez", "souffrent"], ps: ["souffr", "i"], fut: "souffrir", pp: "souffert" },
  cueillir: { pres: ["cueille", "cueilles", "cueille", "cueillons", "cueillez", "cueillent"], ps: ["cueill", "i"], fut: "cueiller", pp: "cueilli" },
  courir: { pres: ["cours", "cours", "court", "courons", "courez", "courent"], ps: ["cour", "u"], fut: "courr", pp: "couru" },
  mourir: { pres: ["meurs", "meurs", "meurt", "mourons", "mourez", "meurent"], ps: ["mour", "u"], fut: "mourr", pp: "mort" },
  fuir: { pres: ["fuis", "fuis", "fuit", "fuyons", "fuyez", "fuient"], ps: ["fu", "i"], fut: "fuir", pp: "fui" },
  acquérir: { pres: ["acquiers", "acquiers", "acquiert", "acquérons", "acquérez", "acquièrent"], ps: ["acqu", "i"], fut: "acquerr", pp: "acquis" },
  conquérir: { pres: ["conquiers", "conquiers", "conquiert", "conquérons", "conquérez", "conquièrent"], ps: ["conqu", "i"], fut: "conquerr", pp: "conquis" },
  bouillir: { pres: ["bous", "bous", "bout", "bouillons", "bouillez", "bouillent"], ps: ["bouill", "i"], fut: "bouillir", pp: "bouilli" },
  vêtir: { pres: ["vêts", "vêts", "vêt", "vêtons", "vêtez", "vêtent"], ps: ["vêt", "i"], fut: "vêtir", pp: "vêtu" },
  prendre: { pres: ["prends", "prends", "prend", "prenons", "prenez", "prennent"], ps: ["pr", "i"], fut: "prendr", pp: "pris" },
  mettre: { pres: ["mets", "mets", "met", "mettons", "mettez", "mettent"], ps: ["m", "i"], fut: "mettr", pp: "mis" },
  battre: { pres: ["bats", "bats", "bat", "battons", "battez", "battent"], ps: ["batt", "i"], fut: "battr", pp: "battu" },
  rompre: { pres: ["romps", "romps", "rompt", "rompons", "rompez", "rompent"], ps: ["romp", "i"], fut: "rompr", pp: "rompu" },
  vaincre: { pres: ["vaincs", "vaincs", "vainc", "vainquons", "vainquez", "vainquent"], ps: ["vainqu", "i"], fut: "vaincr", pp: "vaincu" },
  faire: { pres: ["fais", "fais", "fait", "faisons", "faites", "font"], ps: ["f", "i"], fut: "fer", pp: "fait", subj: ["fass", "fass"] },
  dire: { pres: ["dis", "dis", "dit", "disons", "dites", "disent"], ps: ["d", "i"], fut: "dir", pp: "dit" },
  lire: { pres: ["lis", "lis", "lit", "lisons", "lisez", "lisent"], ps: ["l", "u"], fut: "lir", pp: "lu" },
  crire: { pres: ["cris", "cris", "crit", "crivons", "crivez", "crivent"], ps: ["criv", "i"], fut: "crir", pp: "crit" },
  rire: { pres: ["ris", "ris", "rit", "rions", "riez", "rient"], ps: ["r", "i"], fut: "rir", pp: "ri" },
  suffire: { pres: ["suffis", "suffis", "suffit", "suffisons", "suffisez", "suffisent"], ps: ["suff", "i"], fut: "suffir", pp: "suffi" },
  connaître: { pres: ["connais", "connais", "connaît", "connaissons", "connaissez", "connaissent"], ps: ["conn", "u"], fut: "connaîtr", pp: "connu" },
  paraître: { pres: ["parais", "parais", "paraît", "paraissons", "paraissez", "paraissent"], ps: ["par", "u"], fut: "paraîtr", pp: "paru" },
  naître: { pres: ["nais", "nais", "naît", "naissons", "naissez", "naissent"], ps: ["naqu", "i"], fut: "naîtr", pp: "né" },
  plaire: { pres: ["plais", "plais", "plaît", "plaisons", "plaisez", "plaisent"], ps: ["pl", "u"], fut: "plair", pp: "plu" },
  taire: { pres: ["tais", "tais", "tait", "taisons", "taisez", "taisent"], ps: ["t", "u"], fut: "tair", pp: "tu" },
  croire: { pres: ["crois", "crois", "croit", "croyons", "croyez", "croient"], ps: ["cr", "u"], fut: "croir", pp: "cru" },
  boire: { pres: ["bois", "bois", "boit", "buvons", "buvez", "boivent"], ps: ["b", "u"], fut: "boir", pp: "bu" },
  voir: { pres: ["vois", "vois", "voit", "voyons", "voyez", "voient"], ps: ["v", "i"], fut: "verr", pp: "vu" },
  prévoir: { pres: ["prévois", "prévois", "prévoit", "prévoyons", "prévoyez", "prévoient"], ps: ["prév", "i"], fut: "prévoir", pp: "prévu" },
  savoir: { pres: ["sais", "sais", "sait", "savons", "savez", "savent"], ps: ["s", "u"], fut: "saur", pp: "su", subj: ["sach", "sach"], ppr: "sachant", imp: ["sache", "sachons", "sachez"] },
  pouvoir: { pres: ["peux", "peux", "peut", "pouvons", "pouvez", "peuvent"], ps: ["p", "u"], fut: "pourr", pp: "pu", subj: ["puiss", "puiss"] },
  vouloir: { pres: ["veux", "veux", "veut", "voulons", "voulez", "veulent"], ps: ["voul", "u"], fut: "voudr", pp: "voulu", subj: ["veuill", "voul"], imp: ["veuille", "veuillons", "veuillez"] },
  devoir: { pres: ["dois", "dois", "doit", "devons", "devez", "doivent"], ps: ["d", "u"], fut: "devr", pp: "dû", ppf: "due" },
  cevoir: { pres: ["çois", "çois", "çoit", "cevons", "cevez", "çoivent"], ps: ["ç", "u"], fut: "cevr", pp: "çu" },
  valoir: { pres: ["vaux", "vaux", "vaut", "valons", "valez", "valent"], ps: ["val", "u"], fut: "vaudr", pp: "valu", subj: ["vaill", "val"] },
  falloir: { pres: ["", "", "faut", "", "", ""], ps: ["fall", "u"], fut: "faudr", pp: "fallu", subj: ["faill", "faill"], impf: "fall", ppr: "" },
  pleuvoir: { pres: ["", "", "pleut", "", "", "pleuvent"], ps: ["pl", "u"], fut: "pleuvr", pp: "plu", impf: "pleuv", ppr: "pleuvant" },
  suivre: { pres: ["suis", "suis", "suit", "suivons", "suivez", "suivent"], ps: ["suiv", "i"], fut: "suivr", pp: "suivi" },
  vivre: { pres: ["vis", "vis", "vit", "vivons", "vivez", "vivent"], ps: ["véc", "u"], fut: "vivr", pp: "vécu" },
  résoudre: { pres: ["résous", "résous", "résout", "résolvons", "résolvez", "résolvent"], ps: ["résol", "u"], fut: "résoudr", pp: "résolu" },
  coudre: { pres: ["couds", "couds", "coud", "cousons", "cousez", "cousent"], ps: ["cous", "i"], fut: "coudr", pp: "cousu" },
  conclure: { pres: ["conclus", "conclus", "conclut", "concluons", "concluez", "concluent"], ps: ["concl", "u"], fut: "conclur", pp: "conclu" },
  exclure: { pres: ["exclus", "exclus", "exclut", "excluons", "excluez", "excluent"], ps: ["excl", "u"], fut: "exclur", pp: "exclu" },
  inclure: { pres: ["inclus", "inclus", "inclut", "incluons", "incluez", "incluent"], ps: ["incl", "u"], fut: "inclur", pp: "inclus" },
  asseoir: { pres: ["assieds", "assieds", "assied", "asseyons", "asseyez", "asseyent"], ps: ["ass", "i"], fut: "assiér", pp: "assis" },
  mouvoir: { pres: ["meus", "meus", "meut", "mouvons", "mouvez", "meuvent"], ps: ["m", "u"], fut: "mouvr", pp: "mû", ppf: "mue" },
  croître: { pres: ["croîs", "croîs", "croît", "croissons", "croissez", "croissent"], ps: ["cr", "u"], fut: "croîtr", pp: "crû", ppf: "crue" },
  clore: { pres: ["clos", "clos", "clôt", "", "", "closent"], ps: ["clos", "i"], fut: "clor", pp: "clos" },
};
const PP_SPECIAL: Record<string, string> = { émouvoir: "ému", promouvoir: "promu" };
// composés : base → préfixes acceptés (sécurité : pas de rapprochement abusif « rendre » ≠ « prendre »)
const BASES = Object.keys(M).sort((a, b) => b.length - a.length);
const DEUXIEME_EXCEPTIONS = new Set(["répartir", "assortir", "impartir", "asservir", "ressortir_juridique"]);
const AUX_ETRE = new Set([
  "aller", "venir", "devenir", "revenir", "parvenir", "survenir", "intervenir", "advenir", "provenir", "arriver", "partir", "repartir", "sortir", "ressortir",
  "entrer", "rentrer", "rester", "tomber", "retomber", "naître", "renaître", "mourir", "décéder", "monter", "remonter", "descendre", "redescendre",
  "passer", "repasser", "retourner", "apparaître", "éclore",
]);
const H_ASPIRE = new Set(["haïr", "hurler", "hacher", "hausser", "heurter", "harceler", "hisser", "huer", "hanter", "harponner", "hâter", "hennir", "hérisser", "hocher", "hululer", "hacher"]);
const DOUBLE_CONS = ["appeler", "jeter", "épeler", "renouveler", "étinceler", "ruisseler", "ficeler", "chanceler", "niveler", "feuilleter", "étiqueter", "cacheter", "interpeller"];
const VOY = /^[aeiouyhâàäéèêëîïôöûùüœæ]/i;

export interface Infos {
  groupe: 1 | 2 | 3;
  aux: "avoir" | "être";
  pronominal: boolean;
  base: string; // verbe sans « se »
}

function split(verbe: string): { base: string; pron: boolean } {
  const v = verbe.trim().toLowerCase().replace(/’/g, "'");
  if (v.startsWith("se ")) return { base: v.slice(3), pron: true };
  if (v.startsWith("s'")) return { base: v.slice(2), pron: true };
  return { base: v, pron: false };
}

function modele(base: string): { m: Modele; pre: string } | null {
  for (const b of BASES) {
    if (base === b) return { m: M[b], pre: "" };
    if (base.endsWith(b) && base.length > b.length) {
      const pre = base.slice(0, base.length - b.length);
      // garde-fous : « rendre », « tendre »… ne sont pas des composés de « prendre » ; « sentir » ≠ « mentir »
      if (b === "crire" || /^(re|ré|dé|de|com|ap|sur|entre|par|con|sou|pré|pro|ad|ob|dis|ab|ex|in|em|en|r|s|mé|inter|contre|trans|pour|main|sous|sub|pres|ins|cir|circon|é|res|ren|des|entr|ac|se|per|o|appar|satis|circons|aper|a|cor|abs)$/.test(pre)) {
        if (b === "voir" && pre === "pré") continue; // prévoir a son modèle
        return { m: M[b], pre };
      }
    }
  }
  return null;
}

export function infos(verbe: string): Infos {
  const { base, pron } = split(verbe);
  let groupe: 1 | 2 | 3 = 3;
  if (base.endsWith("er") && base !== "aller") groupe = 1;
  else if ((base.endsWith("ir") || base === "haïr") && !modele(base) && !base.endsWith("oir")) groupe = 2;
  if (DEUXIEME_EXCEPTIONS.has(base)) groupe = 2;
  const aux = pron || AUX_ETRE.has(base) ? "être" : "avoir";
  return { groupe, aux, pronominal: pron, base };
}

// ---------- 1er groupe ----------
function premier(base: string) {
  const r = base.slice(0, -2); // radical
  const doubleCons = DOUBLE_CONS.some((d) => base === d || base.endsWith(d));
  // forme devant une terminaison muette (je, tu, il, ils au présent ; futur ; conditionnel)
  let muet = r;
  let futR = base; // radical du futur = infinitif
  let alt: string | undefined; // variante 1990 du futur
  // une seule consonne (ou consonne + l/r) entre le e et la terminaison : lever, mener, appeler, sevrer ; mais pas entrer, fermer
  const m1 = r.match(/^(.*)e([^aeiouyéèê]|[bcdfgptv][lr])$/);
  const m2 = r.match(/^(.*)é([^aeiouyéèê]|[bcdfgptv][lr])$/); // céder, espérer, célébrer
  if (/(oy|uy)$/.test(r)) {
    muet = r.slice(0, -1) + "i";
    futR = r.slice(0, -1) + "ier";
    if (base === "envoyer" || base === "renvoyer") futR = r.slice(0, -3) + "verr";
  } else if (/ay$/.test(r)) {
    muet = r.slice(0, -1) + "i"; // paie (paye accepté)
    futR = r.slice(0, -1) + "ier";
    alt = base;
  } else if (m1) {
    if (doubleCons) {
      muet = m1[1] + "e" + m1[2] + m1[2].slice(-1);
      futR = muet + "er";
    } else {
      muet = m1[1] + "è" + m1[2];
      futR = muet + "er";
    }
  } else if (m2) {
    muet = m2[1] + "è" + m2[2];
    futR = base; // céderai (tradition) ; cèderai accepté (1990)
    alt = muet + "er";
  }
  const dur = (s: string, term: string) => {
    // c → ç et g → ge devant a et o
    if (/^[aoâ]/.test(term)) {
      if (s.endsWith("c")) return s.slice(0, -1) + "ç";
      if (s.endsWith("g")) return s + "e";
    }
    return s;
  };
  return { r, muet, futR, alt, dur };
}

const E_PRES1 = ["e", "es", "e", "ons", "ez", "ent"];
const E_IMPF = ["ais", "ais", "ait", "ions", "iez", "aient"];
const E_FUT = ["ai", "as", "a", "ons", "ez", "ont"];
const E_SUBJ = ["e", "es", "e", "ions", "iez", "ent"];
const E_PS: Record<PS, string[]> = {
  a: ["ai", "as", "a", "âmes", "âtes", "èrent"],
  i: ["is", "is", "it", "îmes", "îtes", "irent"],
  u: ["us", "us", "ut", "ûmes", "ûtes", "urent"],
  in: ["ins", "ins", "int", "înmes", "întes", "inrent"],
};
const E_SUBJI: Record<PS, string[]> = {
  a: ["asse", "asses", "ât", "assions", "assiez", "assent"],
  i: ["isse", "isses", "ît", "issions", "issiez", "issent"],
  u: ["usse", "usses", "ût", "ussions", "ussiez", "ussent"],
  in: ["insse", "insses", "înt", "inssions", "inssiez", "inssent"],
};

/** Formes simples (sans pronom) d'un verbe non pronominal, pour les 6 personnes. */
function simples(base: string): Record<string, Six> & { pp: string; ppf: string; ppr: string; imp: [string, string, string]; alt: Record<string, Six> } {
  const alt: Record<string, Six> = {};
  if (base === "être" || base === "avoir") {
    const T = base === "être" ? ETRE : AVOIR;
    return {
      ...T,
      pp: base === "être" ? "été" : "eu",
      ppf: base === "être" ? "été" : "eue",
      ppr: base === "être" ? "étant" : "ayant",
      imp: base === "être" ? ["sois", "soyons", "soyez"] : ["aie", "ayons", "ayez"],
      alt,
    } as never;
  }
  const g = infos(base).groupe;
  let pres: Six, impfR: string, ps: [string, PS], futR: string, pp: string, ppf: string | undefined, ppr: string, subj: [string, string], imp: [string, string, string];
  if (g === 1) {
    const P = premier(base);
    const forms = E_PRES1.map((e, i) => P.dur([0, 1, 2, 5].includes(i) ? P.muet : P.r, e) + e) as Six;
    pres = forms;
    impfR = P.r;
    ps = [P.r, "a"];
    futR = P.futR;
    pp = P.r + "é";
    ppr = P.dur(P.r, "ant") + "ant";
    subj = [P.muet, P.r];
    imp = [pres[1].replace(/s$/, ""), pres[3], pres[4]];
    if (P.alt) {
      const fa = E_FUT.map((e) => P.alt + e) as Six;
      alt.futur = fa;
      alt.conditionnel = E_IMPF.map((e) => P.alt + e) as Six;
      if (/ay$/.test(P.r)) {
        alt.present = E_PRES1.map((e) => P.r + e) as Six;
        alt.subjonctif = E_SUBJ.map((e) => P.r + e) as Six;
      }
    }
    const imparfait = E_IMPF.map((e) => P.dur(P.r, e) + e) as Six;
    const passe_simple = E_PS.a.map((e, i) => P.dur(P.r, e) + (i === 5 ? "èrent" : e)) as Six;
    const subjI = E_SUBJI.a.map((e) => P.dur(P.r, e) + e) as Six;
    return build(pres, imparfait, passe_simple, futR, subj, subjI, pp, undefined, ppr, imp, alt);
  }
  if (g === 2) {
    const r = base.slice(0, -2);
    if (base === "haïr") {
      pres = ["hais", "hais", "hait", "haïssons", "haïssez", "haïssent"];
      return build(pres, E_IMPF.map((e) => "haïss" + e) as Six, ["haïs", "haïs", "haït", "haïmes", "haïtes", "haïrent"], "haïr", ["haïss", "haïss"], ["haïsse", "haïsses", "haït", "haïssions", "haïssiez", "haïssent"], "haï", undefined, "haïssant", ["hais", "haïssons", "haïssez"], alt);
    }
    pres = [r + "is", r + "is", r + "it", r + "issons", r + "issez", r + "issent"];
    return build(pres, E_IMPF.map((e) => r + "iss" + e) as Six, E_PS.i.map((e) => r + e) as Six, base, [r + "iss", r + "iss"], E_SUBJI.i.map((e) => r + e) as Six, r + "i", undefined, r + "issant", [r + "is", r + "issons", r + "issez"], alt);
  }
  // 3e groupe
  const mm = modele(base) ?? generique3(base);
  if (!mm) throw new Error(`Je ne sais pas conjuguer « ${base} ».`);
  const { m, pre } = mm;
  const p = (s: string) => (s ? pre + s : "");
  pres = m.pres.map(p) as Six;
  // composés de « dire » : vous contredisez, interdisez, prédisez, médisez (mais redites)
  if (m === M.dire && pre && pre !== "re") pres[4] = pre + "disez";
  impfR = m.impf ? p(m.impf) : pres[3].replace(/ons$/, "") || p(m.fut);
  ps = [p(m.ps[0]), m.ps[1]];
  futR = p(m.fut);
  pp = PP_SPECIAL[base] ?? p(m.pp);
  ppf = m.ppf ? p(m.ppf) : undefined;
  ppr = m.ppr ? p(m.ppr) : (pres[3] ? pres[3].replace(/ons$/, "ant") : "");
  const s1 = m.subj ? p(m.subj[0]) : pres[5].replace(/ent$/, "");
  const s2 = m.subj ? p(m.subj[1]) : pres[3].replace(/ons$/, "");
  subj = [s1, s2];
  imp = m.imp ? (m.imp.map(p) as [string, string, string]) : [/e$/.test(pres[0]) ? pres[1].replace(/s$/, "") : pres[1], pres[3], pres[4]];
  const imparfait = E_IMPF.map((e) => (impfR ? impfR + e : "")) as Six;
  const passe_simple = E_PS[ps[1]].map((e) => ps[0] + e) as Six;
  const subjI = E_SUBJI[ps[1]].map((e) => ps[0] + e) as Six;
  // rectifications de 1990 : connait, parait, nait, plait (accent circonflexe facultatif sur i)
  if (/î/.test(pres[2])) alt.present = pres.map((x) => x.replace("î", "i")) as Six;
  if (base === "asseoir" || base.endsWith("asseoir")) alt.futur = E_FUT.map((e) => p("assoir") + e) as Six;
  return build(pres, imparfait, passe_simple, futR, subj, subjI, pp, ppf, ppr, imp, alt);
}

/** Verbes en -dre réguliers (rendre, perdre, répondre), -indre (peindre, craindre), -uire (conduire). */
function generique3(base: string): { m: Modele; pre: string } | null {
  if (/(eindre|aindre|oindre)$/.test(base)) {
    const x = base.slice(0, -5); // pe|cra|jo + « in »
    return { m: { pres: [x + "ins", x + "ins", x + "int", x + "ignons", x + "ignez", x + "ignent"], ps: [x + "ign", "i"], fut: base.slice(0, -1), pp: x + "int" }, pre: "" };
  }
  if (/uire$/.test(base)) {
    const s = base.slice(0, -2); // condui
    const pp = base === "luire" || base === "nuire" ? s : s + "t";
    return { m: { pres: [s + "s", s + "s", s + "t", s + "sons", s + "sez", s + "sent"], ps: [s + "s", "i"], fut: base.slice(0, -1), pp }, pre: "" };
  }
  if (/(endre|andre|ondre|erdre|ordre|ourdre)$/.test(base)) {
    const s = base.slice(0, -2); // rend
    return { m: { pres: [s + "s", s + "s", s, s + "ons", s + "ez", s + "ent"], ps: [s, "i"], fut: base.slice(0, -1), pp: s + "u" }, pre: "" };
  }
  return null;
}

function build(pres: Six, imparfait: Six, passe_simple: Six, futR: string, subj: [string, string], subjI: Six, pp: string, ppf: string | undefined, ppr: string, imp: [string, string, string], alt: Record<string, Six>) {
  const futur = E_FUT.map((e) => futR + e) as Six;
  const conditionnel = E_IMPF.map((e) => futR + e) as Six;
  const subjonctif = E_SUBJ.map((e, i) => ([3, 4].includes(i) ? subj[1] : subj[0]) + e) as Six;
  return { present: pres, imparfait, passe_simple, futur, conditionnel, subjonctif, subjonctif_imparfait: subjI, pp, ppf: ppf ?? pp + (pp.endsWith("e") && !pp.endsWith("é") ? "" : "e"), ppr, imp, alt } as never as Record<string, Six> & {
    pp: string; ppf: string; ppr: string; imp: [string, string, string]; alt: Record<string, Six>;
  };
}

/** Participe passé accordé. genre "m" | "f", nombre 1 (singulier) | 2 (pluriel). */
export function participe(verbe: string, genre: "m" | "f" = "m", nombre: 1 | 2 = 1): string {
  const { base } = split(verbe);
  const s = simples(base);
  if (genre === "m" && nombre === 1) return s.pp;
  if (genre === "f") return nombre === 1 ? s.ppf : s.ppf + "s";
  // masculin pluriel : pas de s si le participe finit déjà par s ou x (pris, mis, assis)
  if (/[sx]$/.test(s.pp)) return s.pp;
  return (s.pp === "dû" ? "du" : s.pp === "mû" ? "mu" : s.pp === "crû" ? "crû" : s.pp) + "s";
}
export const participePresent = (verbe: string) => simples(split(verbe).base).ppr;

const COMPOSE: Partial<Record<Temps, Temps>> = {
  passe_compose: "present", plus_que_parfait: "imparfait", passe_anterieur: "passe_simple", futur_anterieur: "futur",
  conditionnel_passe: "conditionnel", subjonctif_passe: "subjonctif", subjonctif_pqp: "subjonctif_imparfait", imperatif_passe: "imperatif",
};

/**
 * Forme conjuguée (sans pronom sujet). personne : 1 à 6 (je, tu, il/elle, nous, vous, ils/elles).
 * Pour l'impératif, personnes 2, 4 et 5 seulement. genre sert à l'accord avec être.
 * Renvoie la forme principale ; `variantes` donne aussi les graphies acceptées (1990, paie/paye…).
 */
export function conjuguer(verbe: string, temps: Temps, personne: number, genre: "m" | "f" = "m"): string {
  return formes(verbe, temps, personne, genre)[0];
}

export function formes(verbe: string, temps: Temps, personne: number, genre: "m" | "f" = "m"): string[] {
  const i = personne - 1;
  const inf = infos(verbe);
  const s = simples(inf.base);
  const refl = (pr: number, next: string) => {
    if (!inf.pronominal) return "";
    const p = ["me", "te", "se", "nous", "vous", "se"][pr - 1];
    return VOY.test(next) && p.length === 2 && !(next[0] === "h" && H_ASPIRE.has(inf.base)) ? p[0] + "'" : p + " ";
  };
  const comp = COMPOSE[temps];
  if (comp) {
    const auxS = simples(inf.aux);
    const nombre: 1 | 2 = i >= 3 ? 2 : 1;
    const pp = inf.aux === "être" ? participe(inf.base, genre, nombre) : s.pp;
    if (comp === "imperatif") {
      const k = { 2: 0, 4: 1, 5: 2 }[personne];
      if (k === undefined) return [""];
      return [auxS.imp[k] + " " + pp];
    }
    const a = (auxS as unknown as Record<string, Six>)[comp][i];
    return [refl(personne, a) + a + " " + pp];
  }
  if (temps === "imperatif") {
    const k = { 2: 0, 4: 1, 5: 2 }[personne];
    if (k === undefined) return [""];
    const f = s.imp[k];
    if (!inf.pronominal) return [f];
    return [f + "-" + ["toi", "nous", "vous"][k]];
  }
  const tab = (s as unknown as Record<string, Six>)[temps];
  const f = tab?.[i] ?? "";
  const out = [refl(personne, f) + f];
  const altT = s.alt[temps];
  if (altT && altT[i] && altT[i] !== f) out.push(refl(personne, altT[i]) + altT[i]);
  return out.filter(Boolean);
}

/** Avec le pronom sujet et l'élision (j'aime, je chante, j'habite, je hurle). genre : pour il/elle et ils/elles. */
export function avecPronom(verbe: string, temps: Temps, personne: number, genre: "m" | "f" = "m"): string[] {
  if (temps === "imperatif" || temps === "imperatif_passe") return formes(verbe, temps, personne, genre);
  const p = personne === 3 ? (genre === "f" ? "elle" : "il") : personne === 6 ? (genre === "f" ? "elles" : "ils") : PRONOMS[personne - 1];
  const sub = temps.startsWith("subjonctif") ? (VOY.test(p) ? "qu'" : "que ") : "";
  const inf = infos(verbe);
  return formes(verbe, temps, personne, genre).map((f) => {
    const elide = p === "je" && VOY.test(f) && !(f[0] === "h" && H_ASPIRE.has(inf.base));
    return sub + (elide ? "j'" + f : p + " " + f);
  });
}

/** Tableau complet d'un temps (pour le conjugueur du dictionnaire). */
export function tableau(verbe: string, temps: Temps): string[] {
  if (temps === "imperatif" || temps === "imperatif_passe") return [2, 4, 5].map((p) => formes(verbe, temps, p)[0]);
  if (verbe === "falloir" || verbe === "pleuvoir") return [avecPronom(verbe, temps, 3)[0]];
  return [1, 2, 3, 4, 5, 6].map((p) => avecPronom(verbe, temps, p)[0]);
}

/** Le verbe est-il connu du moteur (pour refuser poliment un mot qui n'est pas un verbe) ? */
export function estConjugable(verbe: string): boolean {
  const { base } = split(verbe);
  if (!/^[a-zàâäéèêëîïôöûùüçœæ-]+$/i.test(base)) return false;
  if (base === "être" || base === "avoir" || base === "aller") return true;
  if (base.endsWith("er")) return true;
  try {
    simples(base);
    return /(ir|re|oir)$/.test(base);
  } catch {
    return false;
  }
}
