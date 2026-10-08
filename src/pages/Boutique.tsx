import { useState } from "react";
import { buyItem, equip, placeInCabane, toast, useChild } from "../lib/store";
import { CAT_LABEL, ITEMS, itemById, type Cat, type Slot } from "../lib/shop";
import { sfx } from "../lib/sound";
import { burst, centerOf } from "../lib/juice";
import { say } from "../lib/tts";
import { Avatar } from "../components/Avatar";
import { Bubble } from "../components/Mascot";
import { Icone } from "../components/Icone";

// Boutique, personnage et cabane : la « boucle longue » du jeu.
// On dépense ce qu'on a gagné en apprenant ; rien n'est payant, rien n'est caché.

type Tab = "perso" | "boutique" | "cabane";
const SLOTS: Slot[] = ["chapeau", "lunettes", "cou", "compagnon", "cadre"];

export function Boutique({ tab: initial }: { tab?: string }) {
  const child = useChild()!;
  const [tab, setTab] = useState<Tab>(initial === "cabane" ? "cabane" : initial === "perso" ? "perso" : "boutique");
  const [cat, setCat] = useState<Cat>("chapeau");
  const [slot, setSlot] = useState<number | null>(null);
  const owned = child.owned ?? [];

  const buy = (id: string, prix: number, el: Element) => {
    if (buyItem(id, prix)) {
      sfx.star();
      const [x, y] = centerOf(el);
      burst(x, y, 3);
      const it = itemById(id)!;
      if (it.cat !== "cabane") equip(it.cat as Slot, id);
      toast(`${it.nom} : à toi !`, it.emoji);
      say("zero", it.prix >= 100 ? `${it.nom.toUpperCase()} ! 😳` : `Oh ! ${it.nom} ! Ça te va super bien.`);
    } else {
      sfx.oops();
      toast(`Il te manque ${prix - (child.gems ?? 0)} gemmes. Chaque bonne réponse en rapporte !`, "💎");
    }
  };

  return (
    <div className="page">
      <h1>🛍️ Mon coin</h1>
      <div className="shop-head card">
        <Avatar child={child} size={110} humeur="fier" />
        <div>
          <div className="gems-big">💎 {child.gems ?? 0}</div>
          <p className="small muted">Les gemmes se gagnent en répondant juste : 1 par bonne réponse du premier coup, plus en série, 3 par étoile, 25 par monde sauvé (Défi du Gardien réussi).</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === "perso"} className={`tab ${tab === "perso" ? "active" : ""}`} onClick={() => setTab("perso")}>
          🧸 Mon personnage
        </button>
        <button role="tab" aria-selected={tab === "boutique"} className={`tab ${tab === "boutique" ? "active" : ""}`} onClick={() => setTab("boutique")}>
          🛍️ Boutique
        </button>
        <button role="tab" aria-selected={tab === "cabane"} className={`tab ${tab === "cabane" ? "active" : ""}`} onClick={() => setTab("cabane")}>
          🏡 Ma cabane
        </button>
      </div>

      {tab === "perso" && (
        <div className="stack">
          {SLOTS.map((s) => {
            const mine = ITEMS.filter((i) => i.cat === s && owned.includes(i.id));
            return (
              <div key={s} className="card">
                <h3>{CAT_LABEL[s]}</h3>
                {mine.length ? (
                  <div className="shop-grid">
                    <button className={`shop-item ${!child.equipped?.[s] ? "on" : ""}`} onClick={() => equip(s, undefined)}>
                      <span className="shop-emoji">🚫</span>
                      <span>Rien</span>
                    </button>
                    {mine.map((it) => (
                      <button key={it.id} className={`shop-item ${child.equipped?.[s] === it.id ? "on" : ""}`} onClick={() => equip(s, it.id)}>
                        <span className="shop-emoji"><Icone cat="boutique" id={it.id} emoji={it.emoji} size={52} /></span>
                        <span>{it.nom}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="small muted">Rien encore. Va voir la boutique !</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "boutique" && (
        <>
          <div className="chips-row">
            {(Object.keys(CAT_LABEL) as Cat[]).map((c) => (
              <button key={c} className={`chip ${cat === c ? "sel" : ""}`} onClick={() => setCat(c)}>
                {CAT_LABEL[c]}
              </button>
            ))}
          </div>
          <div className="shop-grid">
            {ITEMS.filter((i) => i.cat === cat).map((it) => {
              const has = owned.includes(it.id);
              const can = (child.gems ?? 0) >= it.prix;
              return (
                <button key={it.id} className={`shop-item ${has ? "owned" : can ? "can" : "cant"}`} disabled={has} onClick={(e) => buy(it.id, it.prix, e.currentTarget)} aria-label={`${it.nom}, ${it.prix} gemmes${has ? ", déjà à toi" : ""}`}>
                  <span className="shop-emoji" style={it.couleur ? { color: it.couleur } : undefined}>
                    <Icone cat="boutique" id={it.id} emoji={it.emoji} size={52} />
                  </span>
                  <span>{it.nom}</span>
                  <span className="shop-price">{has ? "✔ à toi" : `💎 ${it.prix}`}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === "cabane" && (
        <>
          <Bubble who="zero" text="Ta cabane secrète ! Touche une case pour y installer un objet de la boutique." size={60} />
          <div className="cabane" role="grid" aria-label="ta cabane, 9 emplacements">
            {(child.cabane ?? Array(9).fill(null)).map((id, i) => {
              const it = itemById(id ?? undefined);
              return (
                <button key={i} className={`cabane-slot ${slot === i ? "sel" : ""}`} onClick={() => setSlot(slot === i ? null : i)} aria-label={it ? it.nom : "emplacement vide"}>
                  {it ? <Icone cat="boutique" id={it.id} emoji={it.emoji} size={56} /> : "＋"}
                </button>
              );
            })}
            <div className="cabane-avatar">
              <Avatar child={child} size={86} />
            </div>
          </div>
          {slot !== null && (
            <div className="card">
              <h3>Que mettre ici ?</h3>
              <div className="shop-grid">
                <button className="shop-item" onClick={() => (placeInCabane(slot, null), setSlot(null))}>
                  <span className="shop-emoji">🧹</span>
                  <span>Vider</span>
                </button>
                {ITEMS.filter((i) => i.cat === "cabane" && owned.includes(i.id)).map((it) => (
                  <button
                    key={it.id}
                    className="shop-item"
                    onClick={() => {
                      placeInCabane(slot, it.id);
                      sfx.tap();
                      setSlot(null);
                    }}
                  >
                    <span className="shop-emoji"><Icone cat="boutique" id={it.id} emoji={it.emoji} size={52} /></span>
                    <span>{it.nom}</span>
                  </button>
                ))}
              </div>
              {!ITEMS.some((i) => i.cat === "cabane" && owned.includes(i.id)) && <p className="small muted">Achète d'abord des objets « Pour ma cabane » à la boutique.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
