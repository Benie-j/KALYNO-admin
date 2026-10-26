import { PH } from "./FormatKit";

/** Opérations pures sur le texte d'un champ (valeur + sélection), sans toucher au DOM. */
export type Edit = { from: number; to: number; text: string; selStart: number; selEnd: number };

/** Le curseur est-il entre les délimiteurs d'une formule ? closeAt = position juste après le $ fermant. */
export function mathContext(value: string, pos: number): { inside: boolean; closeAt: number } {
  let i = 0;
  while (i < value.length) {
    const open = value.indexOf("$", i);
    if (open < 0 || open >= pos) return { inside: false, closeAt: -1 };
    const delim = value[open + 1] === "$" ? "$$" : "$";
    const close = value.indexOf(delim, open + delim.length);
    if (close < 0) return { inside: pos >= open + delim.length, closeAt: -1 };
    if (pos >= open + delim.length && pos <= close) return { inside: true, closeAt: close + delim.length };
    i = close + delim.length;
  }
  return { inside: false, closeAt: -1 };
}

const caretOrPlaceholder = (text: string, base: number) => {
  const i = text.indexOf(PH);
  return i >= 0
    ? { selStart: base + i, selEnd: base + i + 1 }
    : { selStart: base + text.length, selEnd: base + text.length };
};

/**
 * Insère une formule. Hors formule, elle est entourée de $…$ ; dans une formule, elle est insérée telle quelle.
 * Si du texte est sélectionné, il remplace le premier champ ▢ (sélectionner « x+1 » puis Fraction donne \dfrac{x+1}{▢}).
 */
export function formulaEdit(value: string, start: number, end: number, tex: string, useSelection = true): Edit {
  const selected = useSelection ? value.slice(start, end) : "";
  const body = selected && tex.includes(PH) ? tex.replace(PH, selected) : tex;
  const raw = tex.startsWith("$") || mathContext(value, start).inside;
  const text = raw ? body : `$${body}$`;
  return { from: start, to: end, text, ...caretOrPlaceholder(text, start) };
}

/** Alt+M / Alt+Maj+M : entoure la sélection de $ (ou $$), ou crée une formule vide. */
export function wrapEdit(value: string, start: number, end: number, delim: "$" | "$$"): Edit {
  const selected = value.slice(start, end);
  if (selected) {
    const text = delim + selected + delim;
    return { from: start, to: end, text, selStart: start + text.length, selEnd: start + text.length };
  }
  const text = `${delim}${PH}${delim}`;
  return { from: start, to: end, text, selStart: start + delim.length, selEnd: start + delim.length + 1 };
}

export function nextPlaceholder(value: string, from: number): { start: number; end: number } | null {
  const i = value.indexOf(PH, from);
  return i >= 0 ? { start: i, end: i + 1 } : null;
}

/** Abréviations : taper /fr puis Tab donne une fraction, /pi donne π, /alpha donne α, etc. */
const EXPANSIONS: Record<string, string> = {
  fr: "\\dfrac{▢}{▢}", frac: "\\dfrac{▢}{▢}", rac: "\\sqrt{▢}", sqrt: "\\sqrt{▢}", racn: "\\sqrt[▢]{▢}",
  pu: "^{▢}", pow: "^{▢}", car: "^{2}", cub: "^{3}", ind: "_{▢}", so: "\\sum_{k=▢}^{▢} ▢", sum: "\\sum_{k=▢}^{▢} ▢",
  int: "\\int_{▢}^{▢} ▢ \\, dx", lim: "\\lim_{x \\to ▢} ▢", inf: "\\infty", pi: "\\pi",
  leq: "\\leq", geq: "\\geq", neq: "\\neq", ap: "\\approx", pm: "\\pm", fois: "\\times", div: "\\div", cdot: "\\cdot",
  imp: "\\Rightarrow", eqv: "\\Leftrightarrow", vec: "\\overrightarrow{▢}", ang: "\\widehat{▢}",
  abs: "\\left|▢\\right|", par: "\\left(▢\\right)", bin: "\\binom{▢}{▢}", deg: "^{\\circ}",
  sys: "\\begin{cases} ▢ \\\\ ▢ \\end{cases}", mat: "\\begin{pmatrix} ▢ & ▢ \\\\ ▢ & ▢ \\end{pmatrix}",
  delta: "\\Delta = b^2 - 4ac", sol: "x = \\dfrac{-b \\pm \\sqrt{\\Delta}}{2a}", pyth: "AB^2 = AC^2 + BC^2",
  reels: "\\mathbb{R}", ent: "\\mathbb{N}", rel: "\\mathbb{Z}", rat: "\\mathbb{Q}", cplx: "\\mathbb{C}"
};
const GREEK = new Set((
  "alpha beta gamma epsilon varepsilon zeta eta theta lambda mu nu xi rho sigma tau phi varphi chi psi omega " +
  "Gamma Theta Lambda Xi Pi Sigma Phi Psi Omega"
).split(" "));

export function expandTrigger(value: string, caret: number): { from: number; tex: string } | null {
  const m = /\/([A-Za-z]+)$/.exec(value.slice(0, caret));
  if (!m) return null;
  const word = m[1];
  const tex = EXPANSIONS[word] ?? (GREEK.has(word) ? `\\${word}` : null);
  return tex ? { from: caret - m[0].length, tex } : null;
}

/** Raccourcis Alt+lettre (touches physiques, donc valables en AZERTY comme en QWERTY). */
export const ALT_SHORTCUTS: Record<string, string> = {
  KeyF: "\\dfrac{▢}{▢}", KeyR: "\\sqrt{▢}", KeyP: "^{▢}", KeyI: "_{▢}", Digit2: "^{2}",
  KeyS: "\\sum_{k=▢}^{▢} ▢", KeyN: "\\int_{▢}^{▢} ▢ \\, dx", KeyL: "\\lim_{x \\to ▢} ▢",
  KeyV: "\\overrightarrow{▢}", KeyA: "\\left|▢\\right|"
};
