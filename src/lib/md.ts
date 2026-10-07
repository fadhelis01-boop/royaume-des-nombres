import { marked } from "marked";
import DOMPurify from "dompurify";
import katex from "katex";

// Texte de cours : Markdown (gras, listes, tableaux) + formules LaTeX ($…$ et $$…$$).
// Les formules sont mises de côté, le Markdown est nettoyé (DOMPurify), puis les
// formules rendues par KaTeX sont réinsérées.

marked.setOptions({ gfm: true, breaks: true });
const cache = new Map<string, string>();

function renderMath(tex: string, display: boolean) {
  try {
    return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore", output: "htmlAndMathml" });
  } catch {
    return tex;
  }
}

export function mdToHtml(src: string, inline = false): string {
  const key = (inline ? "i:" : "b:") + src;
  const hit = cache.get(key);
  if (hit) return hit;
  const maths: string[] = [];
  const protectedSrc = src
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, t) => {
      maths.push(renderMath(t, true));
      return `@@M${maths.length - 1}@@`;
    })
    .replace(/\$([^$\n]+?)\$/g, (_, t) => {
      maths.push(renderMath(t, false));
      return `@@M${maths.length - 1}@@`;
    });
  const html = inline ? (marked.parseInline(protectedSrc) as string) : (marked.parse(protectedSrc) as string);
  const clean = DOMPurify.sanitize(html, { ADD_ATTR: ["target"] }).replace(/@@M(\d+)@@/g, (_, i) => maths[Number(i)]);
  if (cache.size > 800) cache.clear();
  cache.set(key, clean);
  return clean;
}
