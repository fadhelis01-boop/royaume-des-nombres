// Sauvegarde, reprise et changement d'appareil — sans serveur.
//  1. stockage protégé : on demande au navigateur de ne pas effacer les données (storage.persist) ;
//  2. instantanés automatiques : une copie par jour, les 7 derniers jours, pour revenir en arrière ;
//  3. code de transfert : toute la progression compressée en un texte à copier ou partager ;
//  4. fichier synchronisé (Chrome / Edge sur ordinateur) : l'appli écrit elle-même dans un fichier
//     choisi par le parent, par exemple dans un dossier OneDrive / Google Drive / Dropbox, et le relit
//     au démarrage : deux ordinateurs partagent ainsi la même progression.
// Toute importation FUSIONNE (voir fusion.ts) : on ne perd jamais une avancée.
import { dbGet, dbSet } from "./db";
import { fusionnerProfils } from "./fusion";
import { getState, setState, dayKey } from "./store";
import type { Child } from "./types";

export const APP = "royaume-des-nombres";

/** Contenu d'une sauvegarde (sans la clé de l'assistant, qui reste sur l'appareil). */
export function instantane() {
  const s = getState();
  return { app: APP, version: 2, at: new Date().toISOString(), settings: { ...s.settings, apiKey: "" }, children: s.children };
}

/** Importe une sauvegarde (objet déjà lu) en fusionnant avec les profils présents. */
export function importerDonnees(data: { app?: string; children?: Child[]; settings?: Record<string, unknown> }) {
  if (data.app !== APP || !Array.isArray(data.children)) throw new Error("Ce n'est pas une sauvegarde de la Galaxie des Savoirs.");
  const s = getState();
  const r = fusionnerProfils(s.children, data.children);
  setState({
    children: r.enfants,
    settings: { ...s.settings, ...(s.children.length ? {} : data.settings), apiKey: s.settings.apiKey, pin: s.settings.pin || String(data.settings?.pin ?? "") },
    activeId: s.activeId || r.enfants[0]?.id || "",
  });
  return r;
}

// ---------- 1. Stockage protégé ----------
export async function protegerStockage(): Promise<"protege" | "non" | "inconnu"> {
  try {
    if (!navigator.storage?.persist) return "inconnu";
    if (await navigator.storage.persisted()) return "protege";
    return (await navigator.storage.persist()) ? "protege" : "non";
  } catch {
    return "inconnu";
  }
}
/** Sur iPhone/iPad, Safari efface les données d'un site non installé après 7 jours sans visite. */
export const estIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const estInstallee = () => window.matchMedia?.("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

// ---------- 2. Instantanés quotidiens ----------
interface Instantane {
  jour: string;
  at: number;
  children: Child[];
}
export async function instantanes(): Promise<Instantane[]> {
  return (await dbGet<Instantane[]>("instantanes")) ?? [];
}
async function noterInstantane() {
  const s = getState();
  if (!s.children.length) return;
  const liste = await instantanes();
  const jour = dayKey();
  const autres = liste.filter((x) => x.jour !== jour);
  await dbSet("instantanes", [{ jour, at: Date.now(), children: s.children }, ...autres].slice(0, 7));
}
/** Revient à un instantané (remplace, ne fusionne pas : c'est un retour en arrière voulu). */
export async function restaurerInstantane(jour: string) {
  const x = (await instantanes()).find((i) => i.jour === jour);
  if (!x) throw new Error("Instantané introuvable.");
  setState({ children: x.children, activeId: x.children.some((c) => c.id === getState().activeId) ? getState().activeId : "" });
}

// ---------- 3. Code de transfert ----------
const PREFIXE = "GDS2:";
const b64 = (u: Uint8Array) => {
  let s = "";
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const deb64 = (t: string) => Uint8Array.from(atob(t.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
async function flux(data: Uint8Array, t: CompressionStream | DecompressionStream) {
  const r = new Blob([data as BlobPart]).stream().pipeThrough(t as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  return new Uint8Array(await new Response(r).arrayBuffer());
}
/** Toute la progression en un texte compact (compressé) à copier, envoyer ou coller ailleurs. */
export async function codeTransfert(): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(instantane()));
  if (typeof CompressionStream === "undefined") return "GDS0:" + b64(json);
  return PREFIXE + b64(await flux(json, new CompressionStream("gzip")));
}
export async function lireCodeTransfert(code: string) {
  const t = code.trim().replace(/\s+/g, "");
  let json: string;
  if (t.startsWith(PREFIXE)) {
    if (typeof DecompressionStream === "undefined") throw new Error("Ce navigateur est trop ancien pour lire ce code : utilisez plutôt le fichier de sauvegarde.");
    json = new TextDecoder().decode(await flux(deb64(t.slice(PREFIXE.length)), new DecompressionStream("gzip")));
  } else if (t.startsWith("GDS0:")) json = new TextDecoder().decode(deb64(t.slice(5)));
  else if (t.startsWith("{")) json = t;
  else throw new Error("Code non reconnu : il doit commencer par « GDS2: ».");
  return importerDonnees(JSON.parse(json));
}

// ---------- 4. Fichier synchronisé (File System Access : Chrome, Edge) ----------
type Handle = FileSystemFileHandle & {
  queryPermission?: (o: { mode: string }) => Promise<PermissionState>;
  requestPermission?: (o: { mode: string }) => Promise<PermissionState>;
};
export const syncFichierPossible = () => typeof window !== "undefined" && "showSaveFilePicker" in window;
let handle: Handle | null = null;
let etatSync: { nom: string; derniere: number; erreur: string; autorise: boolean } = { nom: "", derniere: 0, erreur: "", autorise: false };
const ecouteurs = new Set<() => void>();
export const etatSynchro = () => etatSync;
export const surSynchro = (f: () => void) => (ecouteurs.add(f), () => ecouteurs.delete(f));
const majEtat = (p: Partial<typeof etatSync>) => {
  etatSync = { ...etatSync, ...p };
  ecouteurs.forEach((f) => f());
};

async function ecrireFichier() {
  if (!handle || !etatSync.autorise) return;
  try {
    const w = await handle.createWritable();
    await w.write(JSON.stringify(instantane()));
    await w.close();
    majEtat({ derniere: Date.now(), erreur: "" });
  } catch (e) {
    majEtat({ erreur: (e as Error).message, autorise: false });
  }
}
async function lireEtFusionner() {
  if (!handle) return;
  const f = await handle.getFile();
  const txt = await f.text();
  if (txt.trim()) importerDonnees(JSON.parse(txt));
}
/** Le parent choisit (ou crée) le fichier de synchronisation, idéalement dans un dossier cloud. */
export async function choisirFichierSynchro() {
  const w = window as unknown as { showSaveFilePicker: (o: object) => Promise<Handle> };
  handle = await w.showSaveFilePicker({ suggestedName: "galaxie-des-savoirs-synchro.json", types: [{ description: "Sauvegarde", accept: { "application/json": [".json"] } }] });
  await dbSet("syncHandle", handle);
  majEtat({ nom: handle.name, autorise: true, erreur: "" });
  try {
    await lireEtFusionner(); // le fichier existait (autre ordinateur) : on récupère ses avancées
  } catch {
    /* fichier neuf ou vide */
  }
  await ecrireFichier();
}
/** Au démarrage : retrouve le fichier choisi ; s'il est encore autorisé, fusionne puis réécrit. */
export async function reprendreSynchro() {
  if (!syncFichierPossible()) return;
  handle = (await dbGet<Handle>("syncHandle")) ?? null;
  if (!handle) return;
  const p = (await handle.queryPermission?.({ mode: "readwrite" })) ?? "prompt";
  majEtat({ nom: handle.name, autorise: p === "granted" });
  if (p === "granted") {
    try {
      await lireEtFusionner();
    } catch (e) {
      majEtat({ erreur: (e as Error).message });
    }
    await ecrireFichier();
  }
}
/** Après un redémarrage du navigateur, l'accès doit être redonné d'un geste (bouton). */
export async function reautoriserSynchro() {
  if (!handle) return;
  const p = (await handle.requestPermission?.({ mode: "readwrite" })) ?? "denied";
  majEtat({ autorise: p === "granted" });
  if (p === "granted") {
    await lireEtFusionner().catch(() => undefined);
    await ecrireFichier();
  }
}
export async function arreterSynchro() {
  handle = null;
  await dbSet("syncHandle", null);
  majEtat({ nom: "", autorise: false, derniere: 0, erreur: "" });
}

// ---------- Branchement sur l'enregistrement ----------
let minuteur = 0;
/** Appelé après chaque enregistrement local : instantané du jour et fichier synchronisé (regroupés). */
export function apresEnregistrement() {
  clearTimeout(minuteur);
  minuteur = window.setTimeout(() => {
    void noterInstantane();
    void ecrireFichier();
  }, 4000);
}
