import { mdToHtml } from "../lib/md";

/** Texte riche : Markdown + formules ($…$). */
export function Md({ text, inline = false, className }: { text: string; inline?: boolean; className?: string }) {
  const html = mdToHtml(text ?? "", inline);
  return inline ? <span className={className} dangerouslySetInnerHTML={{ __html: html }} /> : <div className={`md ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
