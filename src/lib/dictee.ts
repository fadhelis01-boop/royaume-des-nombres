// Dictée vocale (reconnaissance de la parole du navigateur) : un enfant de
// 7 ans peut poser sa question à voix haute. Chrome, Edge, Safari (iPhone/iPad).

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
  onend: () => void;
  onerror: (e: { error: string }) => void;
  start: () => void;
  stop: () => void;
};

const Ctor = (): (new () => Rec) | null => {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const dicteeSupported = () => typeof window !== "undefined" && !!Ctor();

export function startDictee(onText: (t: string, final: boolean) => void, onEnd: (err?: string) => void): () => void {
  const C = Ctor();
  if (!C) {
    onEnd("La dictée n'est pas disponible sur cet appareil.");
    return () => undefined;
  }
  const r = new C();
  r.lang = "fr-FR";
  r.interimResults = true;
  r.continuous = false;
  r.onresult = (e) => {
    let t = "";
    let final = false;
    for (let i = 0; i < e.results.length; i++) {
      t += e.results[i][0].transcript;
      final = final || e.results[i].isFinal;
    }
    onText(t, final);
  };
  r.onerror = (e) => onEnd(e.error === "not-allowed" ? "Le micro n'est pas autorisé." : undefined);
  r.onend = () => onEnd();
  r.start();
  return () => r.stop();
}
