import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import MathField, { MathHtml } from "./MathField";
import {
  MAX_COLS, MAX_ROWS, addColumn, addRow, blankCount, colCount, draftToValue, lostByResize, removeColumn, removeRow,
  resizeTable, rowCount, setCell, toggleBlank, valueToDraft, type TableDraft
} from "./tableExercise";

/**
 * Éditeur du « Tableau à compléter » : grille compacte (lisible sur téléphone), panneau d'édition de la cellule
 * sélectionnée, et aperçu élève. La valeur échangée avec le formulaire est le brouillon sérialisé en JSON.
 */
export default function TableEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const draft = valueToDraft(value);
  const rows = rowCount(draft), columns = colCount(draft);
  const [sel, setSel] = useState({ r: 0, c: 0 });
  const r = Math.min(sel.r, rows - 1), c = Math.min(sel.c, columns - 1);
  const cell = draft.rows[r][c];

  const commit = (next: TableDraft) => onChange(draftToValue(next));

  function resize(nextRows: number, nextCols: number) {
    const lost = lostByResize(draft, nextRows, nextCols);
    if (lost > 0 && !window.confirm(`${lost} cellule${lost > 1 ? "s" : ""} renseignée${lost > 1 ? "s" : ""} sera${lost > 1 ? "ont" : ""} supprimée${lost > 1 ? "s" : ""}. Continuer ?`)) return;
    commit(resizeTable(draft, nextRows, nextCols));
  }
  function deleteRow() {
    if (rows <= 1) return;
    if (draft.rows[r].some(x => x.text.trim() || x.answers.some(a => a.trim())) && !window.confirm(`Supprimer la ligne ${r + 1} et son contenu ?`)) return;
    commit(removeRow(draft, r)); setSel({ r: Math.max(0, r - 1), c });
  }
  function deleteColumn() {
    if (columns <= 1) return;
    if (draft.rows.some(row => row[c].text.trim() || row[c].answers.some(a => a.trim())) && !window.confirm(`Supprimer la colonne ${c + 1} et son contenu ?`)) return;
    commit(removeColumn(draft, c)); setSel({ r, c: Math.max(0, c - 1) });
  }
  const setAnswer = (index: number, text: string) =>
    commit(setCell(draft, r, c, { answers: cell.answers.map((a, i) => (i === index ? text : a)) }));

  return (
    <div className="te">
      <div className="te-size">
        <label>Lignes
          <input type="number" min={1} max={MAX_ROWS} value={rows} onChange={e => resize(Number(e.target.value) || 1, columns)} aria-label="Nombre de lignes" />
        </label>
        <label>Colonnes
          <input type="number" min={1} max={MAX_COLS} value={columns} onChange={e => resize(rows, Number(e.target.value) || 1)} aria-label="Nombre de colonnes" />
        </label>
        <span className="te-count">{blankCount(draft)} cellule{blankCount(draft) > 1 ? "s" : ""} à compléter</span>
      </div>

      <div className="te-tools" role="group" aria-label="Lignes et colonnes">
        <button type="button" className="secondary" disabled={rows >= MAX_ROWS} onClick={() => { commit(addRow(draft, r + 1)); setSel({ r: r + 1, c }); }}><Plus size={13} /> Ligne sous la sélection</button>
        <button type="button" className="secondary" disabled={columns >= MAX_COLS} onClick={() => { commit(addColumn(draft, c + 1)); setSel({ r, c: c + 1 }); }}><Plus size={13} /> Colonne à droite</button>
        <button type="button" className="secondary danger" disabled={rows <= 1} onClick={deleteRow}><Trash2 size={13} /> Ligne {r + 1}</button>
        <button type="button" className="secondary danger" disabled={columns <= 1} onClick={deleteColumn}><Trash2 size={13} /> Colonne {c + 1}</button>
      </div>

      <div className="te-scroll">
        <table className="te-grid" aria-label="Grille du tableau">
          <thead>
            <tr><th />{Array.from({ length: columns }, (_, j) => <th key={j} className={j === c ? "on" : ""}>{j + 1}</th>)}</tr>
          </thead>
          <tbody>
            {draft.rows.map((row, i) => (
              <tr key={i}>
                <th className={i === r ? "on" : ""}>{i + 1}</th>
                {row.map((x, j) => (
                  <td key={j}>
                    <button type="button" className={`te-cell ${x.blank ? "blank" : "fixed"} ${i === r && j === c ? "sel" : ""}`}
                      aria-pressed={i === r && j === c} aria-label={`Ligne ${i + 1}, colonne ${j + 1} : ${x.blank ? "à compléter" : "fixe"}`}
                      onClick={() => setSel({ r: i, c: j })}>
                      {x.blank ? <><b>▢</b><span>{x.answers.find(a => a.trim()) || "réponse ?"}</span></> : (x.text.trim() ? <MathHtml text={x.text} /> : <i>vide</i>)}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="te-panel">
        <div className="te-panel-head">
          <strong>Cellule : ligne {r + 1}, colonne {c + 1}</strong>
          <div className="te-seg" role="radiogroup" aria-label="Type de cellule">
            <button type="button" role="radio" aria-checked={!cell.blank} className={!cell.blank ? "on" : ""} onClick={() => cell.blank && commit(toggleBlank(draft, r, c))}>Fixe</button>
            <button type="button" role="radio" aria-checked={cell.blank} className={cell.blank ? "on" : ""} onClick={() => !cell.blank && commit(toggleBlank(draft, r, c))}>À compléter</button>
          </div>
        </div>

        {!cell.blank ? (
          <div className="te-field">
            <label>Contenu visible par l'élève</label>
            <MathField value={cell.text} single rows={1} maxLength={200} placeholder="Ex. : Solide, 7, $x^2$ (laisse vide pour une case vide)"
              ariaLabel={`Contenu de la cellule ligne ${r + 1} colonne ${c + 1}`} onChange={v => commit(setCell(draft, r, c, { text: v }))} />
          </div>
        ) : (
          <div className="te-field">
            <label>Réponse attendue (principale)</label>
            <input className="ep-input" value={cell.answers[0] ?? ""} maxLength={200} placeholder="Ex. : évaporation" onChange={e => setAnswer(0, e.target.value)} aria-label="Réponse principale" />
            {cell.answers.slice(1).map((a, k) => (
              <div className="te-variant" key={k}>
                <input className="ep-input" value={a} maxLength={200} placeholder="Autre réponse acceptée" onChange={e => setAnswer(k + 1, e.target.value)} aria-label={`Autre réponse acceptée ${k + 1}`} />
                <button type="button" className="icon-button" aria-label="Retirer cette variante" onClick={() => commit(setCell(draft, r, c, { answers: cell.answers.filter((_, i) => i !== k + 1) }))}><X size={14} /></button>
              </div>
            ))}
            <button type="button" className="secondary te-add" disabled={cell.answers.length >= 8} onClick={() => commit(setCell(draft, r, c, { answers: [...cell.answers, ""] }))}><Plus size={13} /> Autre réponse acceptée</button>
            <small className="ep-help">Majuscules, espaces en trop et espaces multiples sont ignorés. Les accents comptent : « ou » et « où » sont deux réponses différentes, ajoute une variante si besoin.</small>
          </div>
        )}
      </div>
    </div>
  );
}

/** Vue élève : cellules fixes en lecture, cellules à compléter en champs. `showAnswers` aide l'administrateur à vérifier. */
export function TablePreview({ draft, statement }: { draft: TableDraft; statement?: string }) {
  const [showAnswers, setShowAnswers] = useState(false);
  return (
    <div className="te-preview">
      {statement?.trim() && <div className="te-pv-statement"><MathHtml text={statement} /></div>}
      <div className="te-scroll">
        <table className="te-pv">
          <tbody>
            {draft.rows.map((row, i) => (
              <tr key={i}>
                {row.map((x, j) => (
                  <td key={j} className={x.blank ? "blank" : "fixed"}>
                    {x.blank
                      ? <input disabled value={showAnswers ? (x.answers.find(a => a.trim()) ?? "") : ""} placeholder="…" aria-label={`Cellule à compléter ligne ${i + 1}, colonne ${j + 1}`} />
                      : <MathHtml text={x.text} />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {blankCount(draft) > 0 && (
        <label className="te-toggle"><input type="checkbox" checked={showAnswers} onChange={e => setShowAnswers(e.target.checked)} /> Afficher les réponses attendues (réservé à l'administration)</label>
      )}
    </div>
  );
}
