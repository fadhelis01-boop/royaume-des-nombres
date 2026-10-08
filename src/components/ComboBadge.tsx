import { useEffect, useState } from "react";
import { getCombo, onCombo } from "../lib/juice";

/** La série en cours, toujours visible : la flamme grandit avec le combo. */
export function ComboBadge() {
  const [n, setN] = useState(getCombo());
  useEffect(() => {
    const off = onCombo(setN);
    return () => {
      off();
    };
  }, []);
  if (n < 2) return null;
  return (
    <div className={`combo-badge c${Math.min(n, 10)}`} role="status" aria-label={`Série de ${n} bonnes réponses`} key={n}>
      🔥 <strong>×{n}</strong>
    </div>
  );
}
