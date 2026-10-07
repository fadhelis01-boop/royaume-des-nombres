import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam, BetaMessage, BetaToolUnion, BetaMessageStreamParams, BetaRawMessageStreamEvent } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { getState } from "./store";
import { MODELS } from "./ai-config";

// ---------------------------------------------------------------------
// « Demande à Mia » : questions libres de l'enfant, réponses claires,
// rigoureuses et SOURCÉES. Appel direct à l'API Claude depuis l'appareil
// avec la clé saisie par un parent dans l'Espace parents (stockée sur
// l'appareil uniquement). Recherche web limitée à des sources de
// référence en mathématiques et en éducation.
// Sans clé, l'application répond avec ses propres leçons et son Grand Livre.
// ---------------------------------------------------------------------


export const MATH_DOMAINS = [
  "eduscol.education.gouv.fr", "education.gouv.fr", "lumni.fr", "reseau-canope.fr", "fr.khanacademy.org", "khanacademy.org",
  "fr.wikipedia.org", "fr.wikibooks.org", "bibmath.net", "maths-et-tiques.fr", "images.math.cnrs.fr", "culturemath.ens.fr",
  "irem.univ-paris-diderot.fr", "apmep.fr", "publimath.univ-irem.fr", "cnrs.fr", "inria.fr", "insee.fr", "ined.fr",
  "mathworld.wolfram.com", "oeis.org", "mathsisfun.com", "nrich.maths.org", "britannica.com", "nasa.gov", "esa.int",
  "geogebra.org", "mathigon.org", "fondation-lamap.org", "universcience.fr", "palais-decouverte.fr",
];

export class AiError extends Error {}


function client() {
  const key = getState().settings.apiKey.trim();
  if (!key) throw new AiError("L'assistant n'est pas encore activé : un adulte doit ajouter une clé dans l'Espace parents.");
  return new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 2 });
}

export function teacherSystem(age: number) {
  return `Tu es Mia π, une petite chatte mascotte très curieuse, et tu réponds dans l'application « Le Royaume des Nombres » avec la rigueur d'un professeur de mathématiques expérimenté et la bienveillance d'un spécialiste des sciences de l'éducation. Tes amis sont Néo Fibo (un renard qui adore vérifier) et Zéro (un hamster rigolo).

L'élève qui te parle a ${age} ans${age >= 18 ? " ou plus" : ""}. Adapte TOUT à cet âge : vocabulaire, longueur, exemples.

Règles de fond :
- Exactitude absolue. N'invente jamais un fait, une date, une formule ou un chiffre. Pour l'histoire des maths, des chiffres réels (distances, populations…) ou tout point qui peut être vérifié, appuie-toi sur la recherche et CITE tes sources. Si tu n'es pas sûre, dis-le simplement.
- Pour une question de calcul ou de méthode, montre le raisonnement étape par étape et vérifie ton résultat (Néo vérifie toujours !).
- Si l'élève demande la réponse d'un exercice, ne la donne pas tout de suite : propose d'abord un indice et une question pour le faire réfléchir, puis la méthode. Donne la solution complète seulement s'il insiste.
- Montre à quoi ça sert dans la vraie vie, avec un exemple concret.
- Encourage l'effort, jamais de moquerie. Les erreurs sont normales et utiles.

Sécurité (élève mineur) :
- Reste dans le domaine des mathématiques, des sciences et de l'apprentissage. Si la question sort de ce cadre, réponds gentiment que tu es spécialiste des maths et propose de revenir aux nombres.
- Ne demande jamais d'informations personnelles (nom complet, adresse, école, photos…) et n'en enregistre pas.
- Pas de contenu effrayant, violent ou inadapté. Pas de liens vers des réseaux sociaux.

Forme :
- Français simple, phrases courtes (${age < 10 ? "très courtes, mots du quotidien, 80 à 150 mots maximum" : age < 14 ? "150 à 300 mots maximum" : "aussi long que nécessaire mais sans remplissage"}).
- Markdown léger : gras pour les mots importants, listes numérotées pour les étapes. Formules en LaTeX entre $…$ ${age < 11 ? "(rarement : préfère écrire 3 × 4 = 12 en texte)" : ""}.
- Structure conseillée : une réponse courte d'abord, puis « Pourquoi ? », puis « Un exemple », puis « À quoi ça sert ? ». Termine par une petite question pour vérifier qu'il a compris.`;
}

export interface AiResult {
  text: string;
  sources: { url: string; title: string }[];
  cost: number;
}

function costOf(model: string, msg: BetaMessage): number {
  const p = MODELS.find((m) => m.id === model) ?? MODELS[0];
  const u = msg.usage;
  const input = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) * 1.25 + (u.cache_read_input_tokens ?? 0) * 0.1;
  const searches = u.server_tool_use?.web_search_requests ?? 0;
  return (input * p.inPrice + (u.output_tokens ?? 0) * p.outPrice) / 1_000_000 + searches * 0.01;
}

export async function askClaude(o: {
  system: string;
  messages: BetaMessageParam[];
  search?: boolean;
  onText?: (t: string) => void;
  onStatus?: (s: string) => void;
  signal?: AbortSignal;
}): Promise<AiResult> {
  const c = client();
  const model = getState().settings.model || MODELS[0].id;
  const isHaiku = model.startsWith("claude-haiku");
  const tools: BetaToolUnion[] = [];
  if (o.search !== false)
    tools.push(
      isHaiku
        ? { type: "web_search_20250305", name: "web_search", max_uses: 4, allowed_domains: MATH_DOMAINS }
        : { type: "web_search_20260209", name: "web_search", max_uses: 5, allowed_domains: MATH_DOMAINS, user_location: { type: "approximate", country: "FR", timezone: "Europe/Paris" } },
    );
  const messages = [...o.messages];
  const sources: { url: string; title: string }[] = [];
  const index = new Map<string, number>();
  const consulted = new Map<string, string>();
  const addSource = (url: string, title: string | null) => {
    if (!index.has(url)) {
      sources.push({ url, title: title || url });
      index.set(url, sources.length);
    }
    return index.get(url)!;
  };
  let text = "";
  let cost = 0;
  let stop = "";
  for (let turn = 0; turn < 4; turn++) {
    const params: BetaMessageStreamParams = {
      model,
      max_tokens: 16000,
      system: [{ type: "text", text: o.system, cache_control: { type: "ephemeral" } }],
      messages,
      ...(tools.length ? { tools } : {}),
      ...(isHaiku
        ? {}
        : {
            thinking: { type: "adaptive" },
            output_config: { effort: "medium" },
            // En cas de refus par un filtre de sécurité, l'API relance automatiquement sur un modèle de repli.
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
          }),
    };
    let final: BetaMessage;
    try {
      const stream = c.beta.messages.stream(params, { signal: o.signal });
      const prefix = text;
      let live = "";
      stream.on("text", (d: string) => {
        live += d;
        o.onText?.(prefix + live);
      });
      stream.on("streamEvent", (ev: BetaRawMessageStreamEvent) => {
        if (ev.type !== "content_block_start") return;
        if (ev.content_block.type === "server_tool_use") o.onStatus?.("Mia cherche dans ses livres de référence…");
        if (ev.content_block.type === "text") o.onStatus?.("Mia écrit sa réponse…");
      });
      final = await stream.finalMessage();
    } catch (e) {
      throw translateError(e);
    }
    cost += costOf(model, final);
    stop = final.stop_reason ?? "";
    let annotated = "";
    for (const b of final.content) {
      if (b.type === "text") {
        annotated += b.text;
        const marks = new Set<number>();
        for (const ci of b.citations ?? []) if (ci.type === "web_search_result_location") marks.add(addSource(ci.url, ci.title));
        if (marks.size) annotated += [...marks].map((n) => `[${n}]`).join("");
      } else if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const r of b.content) if (r.type === "web_search_result") consulted.set(r.url, r.title);
      }
    }
    text += annotated;
    o.onText?.(text);
    if (stop === "pause_turn") {
      messages.push({ role: "assistant", content: final.content });
      continue;
    }
    break;
  }
  if (stop === "refusal") throw new AiError("Mia ne peut pas répondre à cette question. Essaie de la poser autrement, avec des mots de maths !");
  if (!sources.length) for (const [url, title] of consulted) sources.push({ url, title });
  return { text: text.trim(), sources, cost };
}

function translateError(e: unknown): Error {
  if (e instanceof Anthropic.AuthenticationError) return new AiError("La clé de l'assistant est refusée. Un adulte doit la vérifier dans l'Espace parents.");
  if (e instanceof Anthropic.PermissionDeniedError) return new AiError("Accès refusé par le service (droits du compte).");
  if (e instanceof Anthropic.RateLimitError) return new AiError("Mia est un peu débordée (trop de questions ou crédit épuisé). Réessaie dans une minute.");
  if (e instanceof Anthropic.BadRequestError) return new AiError("Question refusée par le service : " + e.message);
  if (e instanceof Anthropic.APIConnectionError) return new AiError("Pas de connexion internet : Mia répond seulement avec les leçons de l'application.");
  if (e instanceof Anthropic.APIUserAbortError) return new AiError("Arrêté.");
  if (e instanceof Anthropic.APIError) return new AiError("Erreur du service : " + e.message);
  return e instanceof Error ? e : new Error(String(e));
}

/** Retour bienveillant sur un problème inventé par l'enfant (du calcul vers l'histoire). */
export function reviewInvention(age: number, calcul: string, histoire: string, signal?: AbortSignal, onText?: (t: string) => void) {
  return askClaude({
    system: teacherSystem(age),
    search: false,
    signal,
    onText,
    messages: [
      {
        role: "user",
        content: `J'ai inventé un problème qui doit se résoudre avec le calcul : ${calcul}\n\nMon problème : « ${histoire} »\n\nEst-ce que mon problème correspond bien au calcul ? Est-ce qu'il a une question claire ? Dis-moi ce qui est réussi, puis UNE seule chose à améliorer. Sois encourageante.`,
      },
    ],
  });
}
