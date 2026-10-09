import { useEffect, useMemo, useState } from "react";
import { getContent, lessonKey } from "../lib/content";
import { instantiate, type Instance } from "../lib/gen";
import { aiConfigured } from "../lib/ai-config";
import { go } from "../lib/router";
import { activeChild, bump } from "../lib/store";
import type { Lesson, Step, Who, World } from "../lib/types";
import { Bubble, SpeakBtn } from "./Mascot";
import { Md } from "./Md";
import { Visuel } from "./Visuel";
import { ExercisePlayer } from "./ExercisePlayer";

// « Explique-moi autrement » : quand un enfant ne comprend pas, on ne répète pas la même
// explication plus fort. On change de porte d'entrée (approche concret → imagé → abstrait) :
// un dessin, une image de la vie, un exemple résolu pas à pas, une manipulation, le cours relu
// lentement, l'assistant, ou un adulte. L'enfant choisit ; on note ce qui l'a aidé (bilan parents).

const MANIP = ["blocs", "partage", "sauts", "colorier", "horloge", "payer"];

type Facon = "dessin" | "image" | "exemple" | "manip" | "cours" | "ia" | "adulte";

/** Retrouve la leçon d'un exercice : par la clé de statistique, sinon par l'exercice lui-même. */
export function leconDe(statKey: string, inst?: Instance): { world: World; lesson: Lesson } | null {
  const { worlds } = getContent();
  const [wid, lid] = statKey.split("/");
  const w = worlds.find((x) => x.id === wid);
  const l = w?.lecons.find((x) => x.id === lid);
  if (w && l) return { world: w, lesson: l };
  if (!inst) return null;
  const sig = JSON.stringify(inst.spec);
  for (const wx of worlds)
    for (const lx of wx.lecons) if (lx.exercices.some((e) => e === inst.spec || JSON.stringify(e) === sig)) return { world: wx, lesson: lx };
  return null;
}

/** Découpe une correction en petites étapes à dévoiler une par une. */
function etapesDe(texte: string): string[] {
  return texte
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Ý0-9$«(])|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function Autrement({ statKey, inst, onClose }: { statKey: string; inst?: Instance; onClose: () => void }) {
  const found = useMemo(() => leconDe(statKey, inst), [statKey, inst]);
  const [facon, setFacon] = useState<Facon | null>(null);
  const [aide, setAide] = useState<Record<string, boolean>>({});
  const lesson = found?.lesson;
  const steps = lesson?.etapes ?? [];
  const aut = lesson?.autrement;
  const of = <K extends Step["kind"]>(k: K) => steps.filter((s): s is Extract<Step, { kind: K }> => s.kind === k);

  const visuels = [...(aut?.visuel ? [{ visuel: aut.visuel, legende: aut.legende }] : []), ...of("visuel"), ...(inst?.visuel ? [{ visuel: inst.visuel, legende: "Le dessin de la question" }] : [])].slice(0, 3);
  const image = aut?.texte ?? [of("a_quoi_ca_sert")[0]?.texte, of("astuce")[0]?.texte].filter(Boolean).join("\n\n");
  const exempleEcrit = of("exemple")[0];
  const manipSpec = (inst && MANIP.includes(inst.type) ? null : lesson?.exercices.find((e) => MANIP.includes(e.type))) ?? null;
  const cours = [...of("texte").map((s) => s.texte), ...of("retiens").map((s) => s.texte)];

  // Un exemple tout neuf, du même modèle que la question ratée : même raisonnement, autres nombres.
  const exempleGen = useMemo(() => {
    const spec = inst?.spec ?? lesson?.exercices.find((e) => e.correction);
    if (!spec) return null;
    for (let t = 1; t < 8; t++) {
      const x = instantiate(spec, (inst?.seed ?? 7) * 31 + t * 977);
      if (!inst || x.enonce !== inst.enonce) return x;
    }
    return null;
  }, [inst, lesson]);
  const manipInst = useMemo(() => (manipSpec ? instantiate(manipSpec, Date.now() % 100000) : null), [manipSpec]);

  const facons: { id: Facon; emoji: string; label: string; dispo: boolean }[] = [
    { id: "dessin", emoji: "🖼️", label: "Avec un dessin", dispo: visuels.length > 0 },
    { id: "image", emoji: "🧸", label: "Avec une image de la vie", dispo: !!image },
    { id: "exemple", emoji: "👣", label: "Un exemple pas à pas", dispo: !!(exempleEcrit || exempleGen) },
    { id: "manip", emoji: "🤲", label: "Avec mes mains", dispo: !!manipInst },
    { id: "cours", emoji: "🐢", label: "Le cours, tout doucement", dispo: cours.length > 0 },
    { id: "ia", emoji: "🤖", label: "Demander à l'assistant", dispo: aiConfigured() },
    { id: "adulte", emoji: "🧑", label: "Avec un adulte", dispo: true },
  ];

  // une demande d'aide = une ouverture du panneau (pour le bilan parents)
  useEffect(() => {
    bump("autrement");
    if (found) bump(`autrement:${lessonKey(found.world, found.lesson.id)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const choisir = (f: Facon) => {
    setFacon(f);
    bump(`autrement-${f}`);
  };

  const noter = (ok: boolean) => {
    if (!facon || facon in aide) return;
    setAide((a) => ({ ...a, [facon]: ok }));
    bump(ok ? `autrement-aide-${facon}` : `autrement-pasaide-${facon}`);
  };
  const age = activeChild()?.age ?? 8;

  return (
    <div className="autrement-fond" role="dialog" aria-modal="true" aria-label="Explique-moi autrement" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="autrement">
        <button className="back autrement-x" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
        {!facon ? (
          <>
            <Bubble who="mia" humeur="reflexion" text={"Pas de souci : on va l'expliquer autrement. Chaque cerveau a sa porte d'entrée. Laquelle veux-tu essayer ?"} k="autrement:intro" />
            <div className="autrement-choix">
              {facons
                .filter((f) => f.dispo)
                .map((f) => (
                  <button key={f.id} className="autrement-carte" onClick={() => choisir(f.id)}>
                    <span className="autrement-emoji" aria-hidden>
                      {f.emoji}
                    </span>
                    {f.label}
                    {f.id in aide && <span className="small"> {aide[f.id] ? "👍" : "👎"}</span>}
                  </button>
                ))}
            </div>
          </>
        ) : (
          <>
            <button className="btn btn-ghost small" onClick={() => setFacon(null)}>
              ← Une autre façon
            </button>
            {facon === "dessin" && (
              <div className="autrement-corps">
                <Bubble who="mia" text="Regarde bien le dessin, sans te presser. Montre du doigt chaque partie et dis à voix haute ce qu'elle représente." k="autrement:dessin" />
                {visuels.map((v, i) => (
                  <Visuel key={i} v={v.visuel} legende={v.legende} />
                ))}
              </div>
            )}
            {facon === "image" && (
              <div className="autrement-corps">
                <Bubble who={(aut?.qui ?? "zero") as Who} humeur="joie" text={image} k="autrement:image" />
              </div>
            )}
            {facon === "exemple" && <ExemplePasAPas ecrit={exempleEcrit} gen={exempleGen} />}
            {facon === "manip" && manipInst && (
              <div className="autrement-corps">
                <Bubble who="neo" text="On le fait avec les mains : touche, déplace, compte. Ici, rien n'est noté, tu peux tâtonner." k="autrement:manip" />
                <ExercisePlayer key={manipInst.seed} inst={manipInst} statKey="autrement" maxTries={3} onResult={() => undefined} continueLabel="J'ai compris" />
              </div>
            )}
            {facon === "cours" && (
              <div className="autrement-corps">
                <Bubble who="narrateur" text="On relit l'essentiel, phrase par phrase. Écoute, puis redis-le avec tes mots." k="autrement:cours" />
                {cours.slice(0, 4).map((t, i) => (
                  <div key={i} className="autrement-bloc">
                    <Md text={t} />
                    <SpeakBtn segs={[{ who: "zero", text: t }]} k={`autrement:cours:${i}`} small label="Écouter lentement" />
                  </div>
                ))}
                {found && (
                  <button className="btn btn-soft" onClick={() => go(`/lecon/${found.world.id}/${found.lesson.id}`)}>
                    📖 Revoir toute la leçon
                  </button>
                )}
              </div>
            )}
            {facon === "ia" && (
              <div className="autrement-corps">
                <Bubble who="neo" text="Je prépare ta question pour l'assistant. Tu pourras la modifier avant de l'envoyer." k="autrement:ia" />
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const q = `Je n'ai pas compris « ${lesson?.titre ?? "cette question"} ». ${inst ? `La question était : ${inst.enonce.replace(/\$/g, "").slice(0, 220)}. La réponse est ${inst.expectedText}.` : ""} Explique-le-moi autrement, avec un exemple de la vie de tous les jours, pour un enfant de ${age} ans.`;
                    try {
                      sessionStorage.setItem("demander:q", q);
                    } catch {
                      /* stockage indisponible : la page s'ouvrira vide */
                    }
                    go("/demander");
                  }}
                >
                  🤖 Ouvrir l'assistant
                </button>
              </div>
            )}
            {facon === "adulte" && (
              <div className="autrement-corps">
                <Bubble who="mia" text="Montre cet écran à un adulte : il y a des idées pour t'expliquer avec des objets de la maison." k="autrement:adulte" />
                <div className="autrement-bloc adulte">
                  <p>
                    <strong>Pour l'adulte.</strong> Objectif de la leçon : {lesson?.objectif ?? "—"}
                  </p>
                  <ul>
                    <li>Partez du concret : des objets à toucher (pâtes, jetons, pièces, ficelle), puis un dessin, et seulement ensuite l'écriture.</li>
                    <li>Demandez à l'enfant d'expliquer ce qu'il a compris avec ses mots avant de corriger : l'erreur montre où est le malentendu.</li>
                    <li>Faites un exemple ensemble, puis laissez-le en faire un seul, avec des nombres plus petits.</li>
                    <li>Arrêtez-vous sur une réussite. Mieux vaut 10 minutes demain que 30 minutes de blocage aujourd'hui.</li>
                  </ul>
                  {of("vraie_vie")[0] && (
                    <p>
                      <strong>Activité suggérée :</strong> {of("vraie_vie")[0].texte}
                    </p>
                  )}
                </div>
              </div>
            )}
            {facon !== "ia" && facon !== "adulte" && (
              <div className="autrement-avis">
                {facon in aide ? (
                  <p className="small center">{aide[facon] ? "Super ! Tu peux fermer et réessayer." : "D'accord, essayons une autre façon."}</p>
                ) : (
                  <>
                    <span className="small">Ça t'a aidé ?</span>
                    <button className="chip" onClick={() => noter(true)}>
                      👍 Oui
                    </button>
                    <button
                      className="chip"
                      onClick={() => {
                        noter(false);
                        setFacon(null);
                      }}
                    >
                      👎 Pas encore
                    </button>
                  </>
                )}
                <button className="btn btn-primary" onClick={onClose}>
                  Je réessaie ➜
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ExemplePasAPas({ ecrit, gen }: { ecrit?: Extract<Step, { kind: "exemple" }>; gen: Instance | null }) {
  // un exemple écrit par l'auteur a priorité ; sinon un exemple tiré du même modèle que la question
  const data = ecrit
    ? { enonce: ecrit.enonce, visuel: ecrit.visuel, etapes: ecrit.etapes, reponse: ecrit.reponse }
    : gen
      ? { enonce: gen.enonce, visuel: gen.visuel, etapes: gen.correction ? etapesDe(gen.correction) : [], reponse: gen.expectedText + (gen.unite && !gen.expectedText.endsWith(gen.unite) ? " " + gen.unite : "") }
      : null;
  const [shown, setShown] = useState(0);
  if (!data) return null;
  const all = shown >= data.etapes.length;
  return (
    <div className="autrement-corps st-exemple">
      <Bubble who="neo" text="Voici un exemple qui ressemble à ta question. Avant chaque étape, essaie de deviner la suite !" k="autrement:exemple" />
      <Md text={data.enonce} className="ex-enonce" />
      {data.visuel && <Visuel v={data.visuel} />}
      <ol className="ex-steps">
        {data.etapes.slice(0, shown).map((e, i) => (
          <li key={i} className="pop">
            <Md text={e} inline />
          </li>
        ))}
      </ol>
      {!all ? (
        <button className="btn btn-soft" onClick={() => setShown(shown + 1)}>
          👀 Étape {shown + 1} sur {data.etapes.length} : devine, puis regarde
        </button>
      ) : (
        data.reponse && (
          <div className="ex-answer pop">
            ✅ <Md text={data.reponse} inline />
          </div>
        )
      )}
    </div>
  );
}
