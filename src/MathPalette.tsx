import { useEffect, useState } from "react";
import { Keyboard } from "lucide-react";
import { MathKeyboard } from "./FormatKit";
import { getActiveField, type FieldHandle } from "./mathBus";

type Quick = { label: string; tip: string; run: (h: FieldHandle) => void };
const tex = (label: string, tip: string, code: string): Quick => ({ label, tip, run: h => h.insert(code) });

const QUICK: Quick[] = [
  { label: "$…$", tip: "Formule dans une phrase (Alt+M)", run: h => h.wrap("$") },
  { label: "$$…$$", tip: "Formule centrée (Alt+Maj+M)", run: h => h.wrap("$$") },
  tex("a/b", "Fraction (Alt+F)", "\\dfrac{▢}{▢}"),
  tex("√", "Racine carrée (Alt+R)", "\\sqrt{▢}"),
  tex("xⁿ", "Puissance (Alt+P)", "^{▢}"),
  tex("x²", "Carré (Alt+2)", "^{2}"),
  tex("xₙ", "Indice (Alt+I)", "_{▢}"),
  tex("×", "Multiplication", "\\times"),
  tex("÷", "Division", "\\div"),
  tex("≤", "Inférieur ou égal", "\\leq"),
  tex("≥", "Supérieur ou égal", "\\geq"),
  tex("≠", "Différent", "\\neq"),
  tex("π", "Pi", "\\pi"),
  tex("∞", "Infini", "\\infty"),
  tex("Σ", "Somme (Alt+S)", "\\sum_{k=▢}^{▢} ▢"),
  tex("∫", "Intégrale (Alt+N)", "\\int_{▢}^{▢} ▢ \\, dx"),
  tex("lim", "Limite (Alt+L)", "\\lim_{x \\to ▢} ▢"),
  tex("→u", "Vecteur (Alt+V)", "\\overrightarrow{▢}"),
  tex("|x|", "Valeur absolue (Alt+A)", "\\left|▢\\right|")
];

/** Barre de formules + clavier complet : agit sur le dernier champ de saisie utilisé. */
export default function MathPalette({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const toggle = () => setOpen(o => !o);
    window.addEventListener("kalyno:keyboard", toggle);
    return () => window.removeEventListener("kalyno:keyboard", toggle);
  }, []);

  const act = (run: (h: FieldHandle) => void) => { const h = getActiveField(); if (h) run(h); };

  return (
    <div className="mp">
      <div className="mp-head">
        <strong>Formules LaTeX</strong>
        <span>Clique dans un champ, puis un raccourci</span>
      </div>
      <div className="mp-quick" role="group" aria-label="Raccourcis de formules">
        {QUICK.map(q => (
          <button type="button" key={q.tip} title={q.tip} onMouseDown={e => e.preventDefault()} onClick={() => act(q.run)}>{q.label}</button>
        ))}
        <button type="button" className={`mp-more ${open ? "on" : ""}`} title="Clavier complet (Alt+K)"
          onMouseDown={e => e.preventDefault()} onClick={() => setOpen(o => !o)}>
          <Keyboard size={15} /> Clavier complet
        </button>
      </div>
      {open && <MathKeyboard onInsert={t => act(h => h.insert(t))} />}
    </div>
  );
}
