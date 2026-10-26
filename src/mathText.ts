import katex from "katex";
import { PH } from "./FormatKit";

/**
 * Même grammaire que l'app Android (RichText.kt) : $...$ en ligne, $$...$$ centré.
 * Le texte hors formule est échappé : on peut l'injecter dans le DOM sans risque.
 */
const MATH_SRC = String.raw`\$\$([\s\S]+?)\$\$|\$([^$]+?)\$`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const plain = (s: string) => esc(s).replace(/\n/g, "<br>");
const texOf = (tex: string) => tex.split(PH).join("\\square ");

export function renderMathText(src: string): string {
  const re = new RegExp(MATH_SRC, "g");
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    out += plain(src.slice(last, m.index));
    const display = m[1] !== undefined;
    try {
      out += katex.renderToString(texOf(m[1] ?? m[2] ?? ""), {
        displayMode: display, throwOnError: false, errorColor: "#B91C1C"
      });
    } catch {
      out += esc(m[0]);
    }
    last = m.index + m[0].length;
  }
  return out + plain(src.slice(last));
}

/** Problèmes qui empêcheraient l'app d'afficher correctement le texte (liste vide = OK). */
export function formulaIssues(src: string): string[] {
  const issues = new Set<string>();
  const re = new RegExp(MATH_SRC, "g");
  let rest = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    rest += src.slice(last, m.index);
    last = m.index + m[0].length;
    const tex = m[1] ?? m[2] ?? "";
    if (tex.includes(PH)) issues.add("un champ ▢ reste à remplir dans une formule");
    try { katex.renderToString(texOf(tex), { throwOnError: true }); }
    catch { issues.add(`formule invalide : ${tex.trim().slice(0, 60)}`); }
  }
  rest += src.slice(last);
  if (rest.includes("$")) issues.add("un « $ » n'est pas fermé (une formule s'écrit $…$)");
  if (rest.includes(PH)) issues.add("un champ ▢ reste à remplir");
  return Array.from(issues);
}
