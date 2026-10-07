import { getState } from "./store";

// Configuration de l'assistant (chargée tout de suite) ; le SDK lui-même
// (src/lib/ai.ts) n'est téléchargé que lorsqu'on pose vraiment une question.
export const MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 — le plus rigoureux (recommandé)", inPrice: 4, outPrice: 20 },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 — plus rapide, 2 fois moins cher", inPrice: 2, outPrice: 10 },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 — économique", inPrice: 1, outPrice: 5 },
];

export const aiConfigured = () => !!getState().settings.apiKey.trim();
