import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CircleAlert, Save, X } from "lucide-react";
import MathField, { MathHtml } from "./MathField";
import MathPalette from "./MathPalette";
import { formulaIssues } from "./mathText";

/**
 * Page de saisie complète : remplace les anciennes boîtes window.prompt.
 * Chaque formulaire est décrit par un EntrySpec ; tous les champs « math » acceptent LaTeX avec raccourcis.
 */
export type Values = Record<string, string | string[]>;
type Base = { key: string; label: string; when?: (v: Values) => boolean; help?: string; preview?: "title" | "text" | "hidden" };
export type FieldDef =
  | (Base & { kind: "text"; required?: boolean; max?: number; placeholder?: string })
  | (Base & { kind: "math"; required?: boolean; single?: boolean; rows?: number; placeholder?: string })
  | (Base & { kind: "select"; options: { value: string; label: string }[] })
  | (Base & { kind: "choices"; count: number; correctKey: string });

export type EntrySpec = {
  eyebrow: string;
  title: string;
  intro?: string;
  submitLabel: string;
  fields: FieldDef[];
  initial: Values;
  /** Contrôle supplémentaire : renvoie un message d'erreur ou null. */
  validate?: (v: Values) => string | null;
  /** Renvoie un message d'erreur (la page reste ouverte avec la saisie) ou null si tout s'est bien passé. */
  onSubmit: (v: Values) => Promise<string | null>;
};

const SHORTCUTS: [string, string][] = [
  ["Alt + M", "Formule dans une phrase  $…$"],
  ["Alt + Maj + M", "Formule centrée  $$…$$"],
  ["Alt + F", "Fraction"],
  ["Alt + R", "Racine carrée"],
  ["Alt + P / Alt + 2", "Puissance / carré"],
  ["Alt + I", "Indice"],
  ["Alt + S / N / L", "Somme / intégrale / limite"],
  ["Alt + V / A", "Vecteur / valeur absolue"],
  ["Alt + K", "Clavier complet de formules"],
  ["Tab", "Champ ▢ suivant, puis sortir de la formule"],
  ["/fr  /rac  /pi + Tab", "Abréviation : fraction, racine, π… (/alpha, /delta…)"],
  ["Ctrl + Entrée", "Enregistrer"],
  ["Échap (×2)", "Fermer sans enregistrer"]
];

const letter = (i: number) => String.fromCharCode(65 + i);
const asText = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(" ") : v ?? "");

export default function EntryPage({ spec, onClose }: { spec: EntrySpec; onClose: () => void }) {
  const [values, setValues] = useState<Values>(spec.initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [closing, setClosing] = useState(false);
  const submitRef = useRef<() => void>(() => {});
  const closeRef = useRef<() => void>(() => {});

  const text = (key: string) => asText(values[key]);
  const list = (key: string) => (Array.isArray(values[key]) ? (values[key] as string[]) : []);
  const visible = spec.fields.filter(f => !f.when || f.when(values));
  const firstEditable = visible.findIndex(f => f.kind !== "select");

  function set(key: string, value: string | string[]) {
    setValues(v => ({ ...v, [key]: value }));
    setDirty(true);
    setErrors([]);
  }
  function setChoice(key: string, index: number, value: string) {
    const next = [...list(key)];
    next[index] = value.replace(/\n/g, " ");
    set(key, next);
  }

  function collectProblems(): string[] {
    const out: string[] = [];
    for (const f of visible) {
      if (f.kind === "text" || f.kind === "math") {
        const s = text(f.key).trim();
        if (f.required && !s) out.push(`${f.label} : ce champ est obligatoire.`);
        if (f.kind === "math") formulaIssues(s).forEach(p => out.push(`${f.label} : ${p}.`));
      }
      if (f.kind === "choices") {
        const items = list(f.key).map(x => x.trim());
        items.forEach((c, i) => {
          if (!c) out.push(`${f.label} : le choix ${letter(i)} est vide.`);
          else formulaIssues(c).forEach(p => out.push(`${f.label} ${letter(i)} : ${p}.`));
        });
        const lower = items.filter(Boolean).map(x => x.toLowerCase());
        if (new Set(lower).size !== lower.length) out.push(`${f.label} : deux choix sont identiques.`);
        const correct = Number(text(f.correctKey));
        if (!Number.isInteger(correct) || correct < 0 || correct >= items.length) out.push(`${f.label} : désigne la bonne réponse.`);
      }
    }
    const extra = spec.validate?.(values);
    if (extra) out.push(extra);
    return out;
  }

  async function submit() {
    if (saving) return;
    const problems = collectProblems();
    if (problems.length) { setErrors(problems); return; }
    const clean: Values = {};
    for (const [k, v] of Object.entries(values)) clean[k] = Array.isArray(v) ? v.map(x => x.trim()) : v.trim();
    setSaving(true);
    const message = await spec.onSubmit(clean);
    setSaving(false);
    if (message) setErrors([message]); else onClose();
  }

  function requestClose() {
    if (!dirty || closing) { onClose(); return; }
    setClosing(true);
    window.setTimeout(() => setClosing(false), 3000);
  }

  submitRef.current = () => { void submit(); };
  closeRef.current = requestClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); submitRef.current(); }
      else if (e.key === "Escape") { e.preventDefault(); closeRef.current(); }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, []);

  const preview: ReactNode[] = [];
  visible.forEach((f, i) => {
    const mode = f.preview ?? (f.kind === "select" ? "hidden" : "text");
    if (mode === "hidden") return;
    if (f.kind === "choices") {
      const correct = Number(text(f.correctKey));
      preview.push(
        <div className="ep-pv-choices" key={`${f.key}-${i}`}>
          {list(f.key).map((c, j) => (
            <div key={j} className={`ep-pv-choice ${j === correct ? "right" : ""}`}>
              <b>{j === correct ? "✓" : letter(j)}</b><MathHtml text={c || `Choix ${letter(j)}`} />
            </div>
          ))}
        </div>
      );
      return;
    }
    if (f.kind === "select") return;
    const s = text(f.key);
    if (!s.trim()) return;
    preview.push(
      <div className={`ep-pv ep-pv-${mode}`} key={`${f.key}-${i}`}>
        {mode !== "title" && <small>{f.label}</small>}
        <MathHtml text={s} />
      </div>
    );
  });

  return (
    <div className="entry-page" role="dialog" aria-modal="true" aria-labelledby="entry-title">
      <form className="ep-shell" onSubmit={e => { e.preventDefault(); void submit(); }}>
        <header className="ep-header">
          <div>
            <span className="eyebrow">{spec.eyebrow}</span>
            <h2 id="entry-title">{spec.title}</h2>
            {spec.intro && <p>{spec.intro}</p>}
          </div>
          <button type="button" className="icon-button" onClick={requestClose} aria-label="Fermer"><X size={18} /></button>
        </header>

        <div className="ep-body">
          <div className="ep-form">
            {visible.map((f, i) => {
              const id = `ep-${f.key}-${i}`;
              const star = (f.kind === "text" || f.kind === "math") && f.required ? <em aria-hidden="true"> *</em> : null;
              return (
                <div className="ep-field" key={id}>
                  <label htmlFor={id}>{f.label}{star}</label>
                  {f.kind === "text" && (
                    <input id={id} className="ep-input" value={text(f.key)} maxLength={f.max ?? 200} placeholder={f.placeholder}
                      autoFocus={i === firstEditable} onChange={e => set(f.key, e.target.value)} />
                  )}
                  {f.kind === "math" && (
                    <MathField value={text(f.key)} onChange={v => set(f.key, v)} single={f.single} rows={f.rows ?? 3}
                      placeholder={f.placeholder ?? "Écris le texte. Une formule : Alt+M, ou $x^2$"} ariaLabel={f.label}
                      autoFocus={i === firstEditable} />
                  )}
                  {f.kind === "select" && (
                    <select id={id} className="ep-input" value={text(f.key)} onChange={e => set(f.key, e.target.value)}>
                      {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  )}
                  {f.kind === "choices" && (
                    <div className="ep-choices" role="radiogroup" aria-label={f.label}>
                      {list(f.key).slice(0, f.count).map((c, j) => (
                        <div key={j} className={`ep-choice ${Number(text(f.correctKey)) === j ? "good" : ""}`}>
                          <input type="radio" name={`${f.key}-correct`} checked={Number(text(f.correctKey)) === j}
                            onChange={() => set(f.correctKey, String(j))} aria-label={`Choix ${letter(j)} : bonne réponse`} />
                          <b>{letter(j)}</b>
                          <MathField value={c} onChange={v => setChoice(f.key, j, v)} single placeholder={`Choix ${letter(j)}`}
                            ariaLabel={`Choix ${letter(j)}`} />
                        </div>
                      ))}
                      <small>Sélectionne le rond de la bonne réponse.</small>
                    </div>
                  )}
                  {f.help && <small className="ep-help">{f.help}</small>}
                </div>
              );
            })}

            {errors.length > 0 && (
              <ul className="ep-errors" role="alert">
                {errors.slice(0, 6).map(e => <li key={e}><CircleAlert size={14} /> {e}</li>)}
              </ul>
            )}
          </div>

          <aside className="ep-side">
            <MathPalette defaultOpen />
            <div className="ep-preview">
              <div className="ep-side-title"><strong>Aperçu élève</strong><span>Formules rendues en direct</span></div>
              <div className="ep-pv-box">
                {preview.length ? preview : <span className="muted">L'aperçu apparaît ici dès que tu écris.</span>}
              </div>
            </div>
            <details className="ep-shortcuts">
              <summary>Raccourcis clavier</summary>
              <dl>{SHORTCUTS.map(([k, d]) => <div key={k}><dt>{k}</dt><dd>{d}</dd></div>)}</dl>
              <p>Sur Mac, Alt = Option. Garde chaque formule sur une seule ligne.</p>
            </details>
          </aside>
        </div>

        <footer className="ep-actions">
          <span className="ep-hint">{closing ? "Appuie encore sur Échap pour fermer sans enregistrer." : "Ctrl + Entrée pour enregistrer"}</span>
          <button type="button" className="secondary" onClick={requestClose} disabled={saving}>Annuler</button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? <><Check size={16} /> Enregistrement…</> : <><Save size={16} /> {spec.submitLabel}</>}
          </button>
        </footer>
      </form>
    </div>
  );
}
