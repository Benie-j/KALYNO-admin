/**
 * Exercice « Tableau à compléter » : modèle d'édition, sérialisation Supabase et contrôles.
 * Module PUR (aucun import) : il est testé avec `npm test` sans navigateur.
 *
 * Stockage (colonnes existantes de `cards` / `free_exercises`, aucune table en plus) :
 *  - kind            = "table"
 *  - front           = JSON {type:"kalyno_table_v1", statement, rows}      -> ce que l'élève voit. AUCUNE réponse.
 *  - admin_reference = JSON {type:"kalyno_table_answers_v1", answers}      -> réponses attendues et variantes.
 *  - back / choices / correct_index inchangés (null).
 *
 * Le format est lu à l'identique par l'application Android (TableExercise.kt).
 */

export const TABLE_KIND = "table";
export const TABLE_FRONT_TYPE = "kalyno_table_v1";
export const TABLE_ANSWERS_TYPE = "kalyno_table_answers_v1";

export const MAX_ROWS = 12;
export const MAX_COLS = 8;
export const MAX_CELL = 200;

/** Une cellule dans l'éditeur. `answers[0]` est la réponse principale, les suivantes sont des variantes acceptées. */
export type TableCellSpec = { blank: boolean; text: string; answers: string[] };
export type TableDraft = { rows: TableCellSpec[][] };

export type TableFront = {
  type: typeof TABLE_FRONT_TYPE;
  statement: string;
  rows: ({ type: "text"; value: string } | { type: "blank"; key: string })[][];
};
export type TableAnswers = { type: typeof TABLE_ANSWERS_TYPE; answers: Record<string, string[]> };

/** Clé d'une cellule : `r2c3` = 2e ligne, 3e colonne (numérotation à partir de 1). */
export const cellKey = (row: number, col: number) => `r${row + 1}c${col + 1}`;

export const emptyCell = (): TableCellSpec => ({ blank: false, text: "", answers: [""] });

export function newTableDraft(rows = 2, cols = 2): TableDraft {
  const r = clamp(rows, 1, MAX_ROWS), c = clamp(cols, 1, MAX_COLS);
  return { rows: Array.from({ length: r }, () => Array.from({ length: c }, emptyCell)) };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.trunc(Number.isFinite(n) ? n : lo)));
const cols = (d: TableDraft) => d.rows[0]?.length ?? 0;
const cloneCell = (c: TableCellSpec): TableCellSpec => ({ blank: c.blank, text: c.text, answers: [...c.answers] });
const clone = (d: TableDraft): TableDraft => ({ rows: d.rows.map(r => r.map(cloneCell)) });

export const rowCount = (d: TableDraft) => d.rows.length;
export const colCount = cols;

/** Redimensionne : ajoute des cellules fixes vides ou tronque. Les cellules existantes ne bougent pas. */
export function resizeTable(d: TableDraft, rows: number, columns: number): TableDraft {
  const r = clamp(rows, 1, MAX_ROWS), c = clamp(columns, 1, MAX_COLS);
  return {
    rows: Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => (d.rows[i]?.[j] ? cloneCell(d.rows[i][j]) : emptyCell())))
  };
}

/** Nombre de cellules renseignées qui seraient perdues par un redimensionnement (pour demander confirmation). */
export function lostByResize(d: TableDraft, rows: number, columns: number): number {
  let lost = 0;
  d.rows.forEach((row, i) => row.forEach((cell, j) => {
    if ((i >= rows || j >= columns) && (cell.text.trim() || cell.answers.some(a => a.trim()))) lost++;
  }));
  return lost;
}

export function addRow(d: TableDraft, at = d.rows.length): TableDraft {
  if (d.rows.length >= MAX_ROWS) return d;
  const next = clone(d);
  next.rows.splice(clamp(at, 0, next.rows.length), 0, Array.from({ length: Math.max(1, cols(d)) }, emptyCell));
  return next;
}
export function removeRow(d: TableDraft, at: number): TableDraft {
  if (d.rows.length <= 1 || at < 0 || at >= d.rows.length) return d;
  const next = clone(d);
  next.rows.splice(at, 1);
  return next;
}
export function addColumn(d: TableDraft, at = cols(d)): TableDraft {
  if (cols(d) >= MAX_COLS) return d;
  const next = clone(d);
  next.rows.forEach(r => r.splice(clamp(at, 0, r.length), 0, emptyCell()));
  return next;
}
export function removeColumn(d: TableDraft, at: number): TableDraft {
  if (cols(d) <= 1 || at < 0 || at >= cols(d)) return d;
  const next = clone(d);
  next.rows.forEach(r => r.splice(at, 1));
  return next;
}

export function setCell(d: TableDraft, row: number, col: number, patch: Partial<TableCellSpec>): TableDraft {
  if (!d.rows[row]?.[col]) return d;
  const next = clone(d);
  next.rows[row][col] = { ...next.rows[row][col], ...patch };
  return next;
}

/**
 * Bascule fixe <-> à compléter sans rien perdre : le texte d'une cellule devenue « à compléter »
 * sert de réponse principale proposée, et la réponse principale redevient le texte si on repasse en fixe.
 */
export function toggleBlank(d: TableDraft, row: number, col: number): TableDraft {
  const cell = d.rows[row]?.[col];
  if (!cell) return d;
  if (cell.blank) return setCell(d, row, col, { blank: false, text: cell.text || cell.answers[0] || "" });
  const answers = cell.answers.some(a => a.trim()) ? cell.answers : [cell.text];
  return setCell(d, row, col, { blank: true, answers: answers.length ? answers : [""] });
}

export const blankCount = (d: TableDraft) => d.rows.reduce((n, r) => n + r.filter(c => c.blank).length, 0);

// ---------------------------------------------------------------- Normalisation (miroir de l'app Android)

/**
 * Même règle que TableGrader.normalize côté Android : espaces de bord retirés, espaces multiples réduits à un,
 * minuscules, apostrophes et tirets typographiques unifiés, virgule décimale = point, point final ignoré.
 * Les accents restent significatifs (« ou » et « où » sont deux réponses différentes) et aucune tolérance
 * « approximative » n'est appliquée.
 */
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\u2019\u2018\u02bc]/g, "'")
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/(?<=\d),(?=\d)/g, ".")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?;:]+$/, "")
    .trim();
}

/** Réponses nettoyées : vides retirées, doublons (après normalisation) retirés, la principale reste en tête. */
export function cleanAnswers(answers: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of answers) {
    const value = raw.replace(/\s+/g, " ").trim();
    const key = normalizeAnswer(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

// ---------------------------------------------------------------- Sérialisation

export type Serialized = { front: string; adminReference: string };

/** Produit `front` (visible par l'élève, sans réponse) et `admin_reference` (réponses). */
export function serializeTable(statement: string, d: TableDraft): Serialized {
  const answers: Record<string, string[]> = {};
  const rows: TableFront["rows"] = d.rows.map((row, i) => row.map((cell, j) => {
    if (!cell.blank) return { type: "text" as const, value: cell.text.trim() };
    const key = cellKey(i, j);
    answers[key] = cleanAnswers(cell.answers);
    return { type: "blank" as const, key };
  }));
  const front: TableFront = { type: TABLE_FRONT_TYPE, statement: statement.trim(), rows };
  const reference: TableAnswers = { type: TABLE_ANSWERS_TYPE, answers };
  return { front: JSON.stringify(front), adminReference: JSON.stringify(reference) };
}

/** Relit un exercice enregistré (modification). Renvoie null si le contenu n'est pas un tableau valide. */
export function parseTable(front: string | null | undefined, adminReference: unknown): { statement: string; draft: TableDraft } | null {
  const f = parseJson(front) as Partial<TableFront> | null;
  if (!f || f.type !== TABLE_FRONT_TYPE || !Array.isArray(f.rows) || f.rows.length === 0) return null;
  const ref = parseJson(adminReference) as Partial<TableAnswers> | null;
  const answers = ref && ref.type === TABLE_ANSWERS_TYPE && ref.answers && typeof ref.answers === "object" ? ref.answers : {};
  const width = Math.max(1, ...f.rows.map(r => (Array.isArray(r) ? r.length : 0)));
  const rows = f.rows.map(r => Array.from({ length: width }, (_, j): TableCellSpec => {
    const cell = Array.isArray(r) ? r[j] : undefined;
    if (cell && cell.type === "blank") {
      const list = (answers as Record<string, unknown>)[cell.key];
      const values = Array.isArray(list) ? list.map(x => String(x)) : [];
      return { blank: true, text: "", answers: values.length ? values : [""] };
    }
    return { blank: false, text: cell && cell.type === "text" ? String(cell.value ?? "") : "", answers: [""] };
  }));
  return { statement: typeof f.statement === "string" ? f.statement : "", draft: { rows } };
}

function parseJson(value: unknown): unknown {
  if (value && typeof value === "object") return value;
  if (typeof value !== "string" || !value.trim().startsWith("{")) return null;
  try { return JSON.parse(value); } catch { return null; }
}

/** Vrai si `front` contient un tableau (sert à l'affichage des listes sans afficher le JSON brut). */
export const isTableFront = (front: string | null | undefined) => parseTable(front, null) !== null;

/** Texte lisible pour les listes de l'administration : l'énoncé et la taille du tableau. */
export function tableSummary(front: string | null | undefined, adminReference?: unknown): { statement: string; detail: string } {
  const t = parseTable(front, adminReference ?? null);
  if (!t) return { statement: "Tableau illisible", detail: "Le contenu n'est pas au format tableau : ouvre la carte pour le reconstruire." };
  return { statement: t.statement, detail: `Tableau ${rowCount(t.draft)} × ${colCount(t.draft)} · ${blankCount(t.draft)} cellule${blankCount(t.draft) > 1 ? "s" : ""} à compléter` };
}

// ---------------------------------------------------------------- Contrôles avant enregistrement

/** Liste des problèmes qui empêchent d'enregistrer (vide = OK). Les formules sont contrôlées par l'appelant. */
export function tableProblems(statement: string, d: TableDraft): string[] {
  const out: string[] = [];
  if (!statement.trim()) out.push("Énoncé : ce champ est obligatoire.");
  if (d.rows.length < 1 || colCount(d) < 1) out.push("Tableau : il faut au moins une ligne et une colonne.");
  if (d.rows.length > MAX_ROWS || colCount(d) > MAX_COLS) out.push(`Tableau : ${MAX_ROWS} lignes et ${MAX_COLS} colonnes au maximum.`);
  if (blankCount(d) === 0) out.push("Tableau : désigne au moins une cellule à compléter.");
  const fixedWithContent = d.rows.reduce((n, r) => n + r.filter(c => !c.blank && c.text.trim()).length, 0);
  if (fixedWithContent === 0) out.push("Tableau : garde au moins une cellule fixe renseignée, sinon l'élève ne voit aucun repère.");
  d.rows.forEach((row, i) => row.forEach((cell, j) => {
    const where = `ligne ${i + 1}, colonne ${j + 1}`;
    if (cell.blank) {
      if (cleanAnswers(cell.answers).length === 0) out.push(`Cellule à compléter (${where}) : saisis la réponse attendue.`);
      cell.answers.forEach(a => { if (a.length > MAX_CELL) out.push(`Cellule (${where}) : une réponse dépasse ${MAX_CELL} caractères.`); });
    } else if (cell.text.length > MAX_CELL) {
      out.push(`Cellule (${where}) : le texte dépasse ${MAX_CELL} caractères.`);
    }
  }));
  return out;
}

// ---------------------------------------------------------------- Valeur de champ (EntryPage stocke des chaînes)

export const draftToValue = (d: TableDraft) => JSON.stringify(d);

/** Relit le brouillon stocké dans le formulaire ; un contenu illisible redonne un tableau 2 × 2 neuf. */
export function valueToDraft(value: string | string[] | undefined): TableDraft {
  const raw = Array.isArray(value) ? value[0] : value;
  try {
    const parsed = JSON.parse(raw ?? "") as Partial<TableDraft>;
    if (Array.isArray(parsed.rows) && parsed.rows.length > 0 && parsed.rows.every(r => Array.isArray(r) && r.length > 0)) {
      const width = Math.max(...parsed.rows.map(r => r.length));
      return {
        rows: parsed.rows.map(r => Array.from({ length: width }, (_, j): TableCellSpec => {
          const c = r[j] as Partial<TableCellSpec> | undefined;
          return { blank: c?.blank === true, text: typeof c?.text === "string" ? c.text : "", answers: Array.isArray(c?.answers) && c.answers.length ? c.answers.map(String) : [""] };
        }))
      };
    }
  } catch { /* valeur vide ou corrompue */ }
  return newTableDraft();
}
