// Espace parents › Sauvegarde : garder la progression, la retrouver, changer d'appareil.
import { useEffect, useState, useSyncExternalStore } from "react";
import { dayKey, exportBackup, importBackup, updateSettings } from "../lib/store";
import {
  arreterSynchro, choisirFichierSynchro, codeTransfert, estInstallee, estIOS, etatSynchro, instantanes, lireCodeTransfert,
  protegerStockage, reautoriserSynchro, restaurerInstantane, surSynchro, syncFichierPossible,
} from "../lib/sauvegarde";
import { HorsConnexion, RappelAgenda } from "./ParentsPlus";

const marquer = () => updateSettings({ lastBackup: Date.now() });

export function SauvegardePage() {
  const [msg, setMsg] = useState("");
  const [protege, setProtege] = useState<string>("");
  const [code, setCode] = useState("");
  const [colle, setColle] = useState("");
  const [snaps, setSnaps] = useState<{ jour: string; at: number; children: { name: string }[] }[]>([]);
  const sync = useSyncExternalStore(surSynchro, etatSynchro);
  useEffect(() => {
    void protegerStockage().then(setProtege);
    void instantanes().then(setSnaps);
  }, []);

  const nomFichier = `galaxie-des-savoirs-sauvegarde-${dayKey()}.json`;
  const telecharger = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([exportBackup()], { type: "application/json" }));
    a.download = nomFichier;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    marquer();
  };
  const fichier = () => new File([exportBackup()], nomFichier, { type: "application/json" });
  const peutPartager = !!navigator.canShare && (() => { try { return navigator.canShare({ files: [fichier()] }); } catch { return false; } })();
  const partagerFichier = async () => {
    try {
      await navigator.share({ files: [fichier()], title: "Sauvegarde de la Galaxie des Savoirs" });
      marquer();
    } catch { /* annulé */ }
  };
  const genererCode = async () => {
    const c = await codeTransfert();
    setCode(c);
    marquer();
  };
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setMsg("✅ Code copié. Collez-le dans un message à vous-même, puis ouvrez-le sur l'autre appareil.");
    } catch {
      setMsg("Sélectionnez le code et copiez-le à la main.");
    }
  };
  const partagerCode = async () => {
    try {
      await navigator.share({ title: "Code de transfert Galaxie des Savoirs", text: code });
    } catch { /* annulé */ }
  };
  const importerCode = async () => {
    try {
      const r = await lireCodeTransfert(colle);
      setMsg(`✅ Progression récupérée : ${r.fusionnes} profil(s) fusionné(s), ${r.ajoutes} ajouté(s). Rien n'a été perdu.`);
      setColle("");
    } catch (e) {
      setMsg("❌ " + (e as Error).message);
    }
  };

  return (
    <div className="stack">
      <section className="card stack">
        <h3>🛡️ La progression de cet appareil</h3>
        <ul className="small">
          <li>Tout est enregistré automatiquement, à chaque réponse. Chaque leçon reprend à l'étape où l'enfant s'était arrêté (bouton « Reprendre »).</li>
          <li>Une copie de secours est faite chaque jour sur l'appareil (les 7 derniers jours, voir plus bas).</li>
          <li>
            Stockage protégé contre l'effacement automatique :{" "}
            <strong>{protege === "protege" ? "oui ✅" : protege === "non" ? "non, le navigateur l'a refusé" : "inconnu"}</strong>
          </li>
        </ul>
        {estIOS() && !estInstallee() && (
          <p className="rappel small">
            ⚠️ Sur iPhone et iPad, Safari peut effacer les données d'un site non visité pendant 7 jours. <strong>Installez l'application</strong> : bouton Partager ⬆️ puis « Sur l'écran d'accueil ». Une fois installée, elle n'est plus concernée.
          </p>
        )}
      </section>

      <section className="card stack">
        <h3>📲 Changer d'appareil (ou jouer sur deux appareils)</h3>
        <p className="small">Sur l'ancien appareil, créez un <strong>code de transfert</strong> ; sur le nouveau, collez-le. Si l'enfant a déjà avancé des deux côtés, les progressions sont <strong>fusionnées</strong> : les leçons réussies, les étoiles, les gemmes, les badges et les révisions de chaque appareil sont conservés.</p>
        <button className="btn btn-primary" onClick={genererCode}>🔑 Créer un code de transfert</button>
        {code && (
          <div className="stack">
            <textarea className="code-transfert" readOnly value={code} rows={4} onFocus={(e) => e.currentTarget.select()} aria-label="Code de transfert" />
            <div className="row">
              <button className="btn btn-soft" onClick={copier}>📋 Copier</button>
              {!!navigator.share && <button className="btn btn-soft" onClick={partagerCode}>📤 Envoyer (message, e-mail…)</button>}
            </div>
            <p className="small muted">{Math.round(code.length / 1000)} k caractères. Le code contient la progression des enfants, jamais la clé de l'assistant.</p>
          </div>
        )}
        <label className="stack">
          <span className="small"><strong>Sur le nouvel appareil :</strong> collez ici le code reçu</span>
          <textarea className="code-transfert" value={colle} onChange={(e) => setColle(e.target.value)} rows={3} placeholder="GDS2:…" />
        </label>
        <button className="btn btn-primary" disabled={!colle.trim()} onClick={importerCode}>📥 Récupérer la progression</button>
      </section>

      {syncFichierPossible() && (
        <section className="card stack">
          <h3>🔄 Synchronisation automatique par fichier (ordinateur)</h3>
          <p className="small">Choisissez un fichier dans un dossier synchronisé (OneDrive, Google Drive, Dropbox…). L'application y écrit la progression toute seule et la relit à chaque ouverture : deux ordinateurs qui utilisent le même fichier partagent la même progression.</p>
          {sync.nom ? (
            <>
              <p className="small">
                Fichier : <strong>{sync.nom}</strong> ·{" "}
                {sync.autorise ? (sync.derniere ? `dernière écriture à ${new Date(sync.derniere).toLocaleTimeString("fr-FR")}` : "actif") : "en pause : le navigateur demande à nouveau l'autorisation"}
                {sync.erreur && <span className="ko-text"> · {sync.erreur}</span>}
              </p>
              <div className="row">
                {!sync.autorise && <button className="btn btn-primary" onClick={() => void reautoriserSynchro()}>▶ Reprendre la synchronisation</button>}
                <button className="btn btn-ghost" onClick={() => void arreterSynchro()}>Arrêter</button>
              </div>
            </>
          ) : (
            <button className="btn btn-soft" onClick={() => choisirFichierSynchro().catch(() => undefined)}>📁 Choisir le fichier de synchronisation</button>
          )}
        </section>
      )}

      <section className="card stack">
        <h3>💾 Fichier de sauvegarde</h3>
        <p className="small">À garder en lieu sûr (clé USB, e-mail, cloud). Il peut aussi servir à changer d'appareil.</p>
        <div className="row">
          <button className="btn btn-soft" onClick={telecharger}>⬇ Télécharger</button>
          {peutPartager && <button className="btn btn-soft" onClick={partagerFichier}>📤 Envoyer</button>}
          <label className="btn btn-soft file-btn">
            📂 Restaurer un fichier
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  setMsg("✅ " + (await importBackup(await f.text())));
                } catch (err) {
                  setMsg("❌ " + (err as Error).message);
                }
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </section>

      {snaps.length > 0 && (
        <section className="card stack">
          <h3>⏪ Copies de secours automatiques</h3>
          <p className="small">Une copie par jour d'utilisation. Revenir à une copie remplace la progression actuelle de cet appareil (à utiliser en cas de problème).</p>
          <ul className="small">
            {snaps.map((s) => (
              <li key={s.jour}>
                {new Date(s.at).toLocaleString("fr-FR")} · {s.children.map((c) => c.name).join(", ")}{" "}
                <button
                  className="btn btn-ghost btn-small"
                  onClick={async () => {
                    if (!confirm(`Revenir à la copie du ${new Date(s.at).toLocaleString("fr-FR")} ? La progression faite depuis sera perdue sur cet appareil.`)) return;
                    await restaurerInstantane(s.jour);
                    setMsg("✅ Copie restaurée.");
                  }}
                >
                  Revenir à cette copie
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {msg && <p className="card" role="status">{msg}</p>}
      <HorsConnexion />
      <RappelAgenda />
    </div>
  );
}
