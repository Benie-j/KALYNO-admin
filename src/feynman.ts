/**
 * Technique de Feynman : une explication = l'idée en mots simples + une analogie + l'essentiel en une phrase.
 * Stockée dans la colonne `explanation` (aucun changement de base) avec des repères que l'app Android lit :
 *   En clair : ...   Analogie : ...   Retiens : ...
 */
export type FeynmanDraft = { clear: string; analogy: string; takeaway: string };

const TAGS: Record<string, keyof FeynmanDraft> = {
  "en clair": "clear", "en simple": "clear",
  "analogie": "analogy", "image": "analogy", "imagine": "analogy",
  "retiens": "takeaway", "retenir": "takeaway", "a retenir": "takeaway"
};
const LINE = /^([\p{L}' ]{2,20})\s*:\s*(.+)$/u;
const norm = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/\p{M}+/gu, "").replace(/\u2019/g, "'");
const oneLine = (s: string) => s.split("\n").map(x => x.trim()).filter(Boolean).join(" ");

/** Texte enregistré -> trois champs. Un ancien texte sans repère va entièrement dans « En clair ». */
export function splitExplanation(raw: string | null | undefined): FeynmanDraft {
  const clear: string[] = [];
  let analogy = "";
  let takeaway = "";
  for (const line of (raw ?? "").split("\n")) {
    const text = line.trim();
    if (!text) continue;
    const m = LINE.exec(text.replace(/^[-•*]\s*/, ""));
    const tag = m ? TAGS[norm(m[1])] : undefined;
    if (tag === "analogy") analogy = m![2].trim();
    else if (tag === "takeaway") takeaway = m![2].trim();
    else if (tag === "clear") clear.push(m![2].trim());
    else clear.push(text);
  }
  return { clear: clear.join("\n"), analogy, takeaway };
}

/** Trois champs -> texte enregistré. Sans analogie ni « À retenir », le texte reste identique à l'ancien format. */
export function composeExplanation(d: FeynmanDraft): string {
  const clear = d.clear.split("\n").map(x => x.trim()).filter(Boolean);
  const analogy = oneLine(d.analogy);
  const takeaway = oneLine(d.takeaway);
  if (!analogy && !takeaway) return clear.join("\n");
  return [
    ...clear.map(x => `En clair : ${x}`),
    ...(analogy ? [`Analogie : ${analogy}`] : []),
    ...(takeaway ? [`Retiens : ${takeaway}`] : [])
  ].join("\n");
}
