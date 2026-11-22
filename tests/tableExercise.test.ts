import test from "node:test";
import assert from "node:assert/strict";
import {
  TABLE_ANSWERS_TYPE, TABLE_FRONT_TYPE, addColumn, addRow, blankCount, cellKey, cleanAnswers, colCount, lostByResize,
  newTableDraft, normalizeAnswer, parseTable, removeColumn, removeRow, resizeTable, rowCount, serializeTable, setCell,
  tableProblems, tableSummary, toggleBlank, valueToDraft, draftToValue
} from "../src/tableExercise.ts";

/** Exemple du cahier des charges : états de la matière. */
function matter() {
  let d = newTableDraft(4, 3);
  const text = [["État", "Forme", "Volume"], ["Solide", "Propre", "Fixe"], ["Liquide", "Variable", "Fixe"], ["Gaz", "Variable", "Variable"]];
  text.forEach((row, i) => row.forEach((t, j) => { d = setCell(d, i, j, { text: t }); }));
  d = toggleBlank(d, 2, 1); // Liquide / Forme -> à compléter (réponse = texte saisi)
  d = toggleBlank(d, 3, 2);
  d = setCell(d, 3, 2, { answers: ["Variable", "variable"] });
  return d;
}

test("tableau 2 x 2 neuf", () => {
  const d = newTableDraft(2, 2);
  assert.equal(rowCount(d), 2); assert.equal(colCount(d), 2); assert.equal(blankCount(d), 0);
});

test("ajout et suppression de lignes et de colonnes", () => {
  let d = newTableDraft(2, 2);
  d = setCell(d, 0, 0, { text: "A" });
  d = addRow(d, 1);
  assert.equal(rowCount(d), 3);
  assert.equal(d.rows[1][0].text, "");
  d = addColumn(d, 1);
  assert.equal(colCount(d), 3);
  assert.equal(d.rows[0][0].text, "A");
  d = removeRow(d, 1); d = removeColumn(d, 1);
  assert.deepEqual([rowCount(d), colCount(d)], [2, 2]);
  assert.equal(removeRow(newTableDraft(1, 1), 0).rows.length, 1, "on ne supprime jamais la dernière ligne");
  assert.equal(colCount(removeColumn(newTableDraft(1, 1), 0)), 1, "ni la dernière colonne");
});

test("redimensionnement : agrandir garde le contenu, réduire signale ce qui est perdu", () => {
  let d = setCell(newTableDraft(2, 2), 1, 1, { text: "X" });
  assert.equal(resizeTable(d, 4, 5).rows[1][1].text, "X");
  assert.equal(lostByResize(d, 1, 2), 1);
  assert.equal(lostByResize(d, 2, 2), 0);
  assert.equal(rowCount(resizeTable(d, 99, 99)), 12);
});

test("bascule fixe <-> à compléter conserve le texte comme réponse", () => {
  let d = setCell(newTableDraft(1, 2), 0, 0, { text: "évaporation" });
  d = toggleBlank(d, 0, 0);
  assert.equal(d.rows[0][0].blank, true);
  assert.equal(d.rows[0][0].answers[0], "évaporation");
  d = toggleBlank(d, 0, 0);
  assert.equal(d.rows[0][0].blank, false);
  assert.equal(d.rows[0][0].text, "évaporation");
});

test("sérialisation : front sans aucune réponse, admin_reference avec les réponses", () => {
  const { front, adminReference } = serializeTable("Complète le tableau.", matter());
  const f = JSON.parse(front), a = JSON.parse(adminReference);
  assert.equal(f.type, TABLE_FRONT_TYPE);
  assert.equal(a.type, TABLE_ANSWERS_TYPE);
  assert.deepEqual(f.rows[2][1], { type: "blank", key: "r3c2" });
  assert.deepEqual(f.rows[0][0], { type: "text", value: "État" });
  assert.deepEqual(a.answers, { r3c2: ["Variable"], r4c3: ["Variable"] });
  // Les réponses n'apparaissent dans front que si elles sont aussi du texte fixe (ici « Variable » est affiché en r3c2? non : cellule cachée)
  assert.ok(!JSON.stringify(f.rows[2]).includes("Variable"), "la réponse d'une cellule cachée ne doit pas fuiter dans la ligne");
  assert.ok(!front.includes("answers"));
});

test("une réponse cachée ne se retrouve pas dans front même avec variantes", () => {
  let d = newTableDraft(1, 2);
  d = setCell(d, 0, 0, { text: "Phénomène" });
  d = setCell(d, 0, 1, { blank: true, answers: ["secretXYZ", "variantQWE"] });
  const { front } = serializeTable("Énoncé", d);
  assert.ok(!front.includes("secretXYZ") && !front.includes("variantQWE"));
});

test("aller-retour enregistrement -> rechargement", () => {
  const d = matter();
  const { front, adminReference } = serializeTable("Complète.", d);
  const back = parseTable(front, adminReference)!;
  assert.equal(back.statement, "Complète.");
  assert.deepEqual(back.draft.rows.map(r => r.map(c => c.blank)), d.rows.map(r => r.map(c => c.blank)));
  assert.deepEqual(back.draft.rows[3][2].answers, ["Variable"]);
  assert.equal(back.draft.rows[1][0].text, "Solide");
  // admin_reference peut aussi revenir déjà décodé (colonne jsonb)
  assert.ok(parseTable(front, JSON.parse(adminReference)));
});

test("contenu non-tableau ou corrompu : null, pas d'exception", () => {
  assert.equal(parseTable("Une question simple", null), null);
  assert.equal(parseTable('{"type":"autre"}', null), null);
  assert.equal(parseTable("{pas du json", null), null);
  assert.equal(parseTable(null, null), null);
  assert.match(tableSummary("x").detail, /illisible|reconstruire/);
});

test("clé de cellule", () => { assert.equal(cellKey(0, 0), "r1c1"); assert.equal(cellKey(1, 2), "r2c3"); });

test("normalisation : espaces, casse, ponctuation finale, décimales ; accents et mots distincts conservés", () => {
  assert.equal(normalizeAnswer("  Éva   Poration. "), "éva poration");
  assert.equal(normalizeAnswer("ÉVAPORATION"), normalizeAnswer("évaporation"));
  assert.equal(normalizeAnswer("0,5"), normalizeAnswer("0.5"));
  assert.notEqual(normalizeAnswer("ou"), normalizeAnswer("où"));
  assert.notEqual(normalizeAnswer("évaporation"), normalizeAnswer("vaporisation"));
  assert.equal(normalizeAnswer("l’eau"), normalizeAnswer("l'eau"));
});

test("réponses acceptées : variantes nettoyées sans doublon", () => {
  assert.deepEqual(cleanAnswers(["évaporation", " Évaporation ", "", "vaporisation"]), ["évaporation", "vaporisation"]);
});

test("contrôles avant enregistrement", () => {
  const ok = matter();
  assert.deepEqual(tableProblems("Énoncé", ok), []);
  assert.ok(tableProblems("", ok).some(p => p.startsWith("Énoncé")));
  assert.ok(tableProblems("E", newTableDraft(2, 2)).some(p => /au moins une cellule à compléter/.test(p)));
  let noAnswer = setCell(newTableDraft(2, 2), 0, 0, { text: "A" });
  noAnswer = setCell(noAnswer, 1, 1, { blank: true, answers: ["  "] });
  assert.ok(tableProblems("E", noAnswer).some(p => /réponse attendue/.test(p)));
  const allBlank = setCell(setCell(newTableDraft(1, 2), 0, 0, { blank: true, answers: ["a"] }), 0, 1, { blank: true, answers: ["b"] });
  assert.ok(tableProblems("E", allBlank).some(p => /cellule fixe/.test(p)));
});

test("valeur de formulaire : aller-retour et contenu corrompu", () => {
  const d = matter();
  assert.deepEqual(valueToDraft(draftToValue(d)), d);
  assert.equal(rowCount(valueToDraft("n'importe quoi")), 2);
  assert.equal(rowCount(valueToDraft(undefined)), 2);
});

test("résumé pour les listes", () => {
  const { front, adminReference } = serializeTable("Complète.", matter());
  const s = tableSummary(front, adminReference);
  assert.equal(s.statement, "Complète.");
  assert.match(s.detail, /4 × 3 · 2 cellules à compléter/);
});
