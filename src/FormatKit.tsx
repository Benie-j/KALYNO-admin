import { useState } from "react";

type Key = { l: string; t: string; back: number; tip?: string };
const k = (l: string, t = l, back = 0, tip?: string): Key => ({ l, t, back, tip });
const chars = (s: string) => Array.from(s).map(c => k(c));

const TABS: { id: string; label: string; keys: Key[] }[] = [
  { id: "base", label: "Opérations", keys: [
    k("a/b", "()/()", 4, "Fraction"), ...chars("½⅓⅔¼¾⅕⅛"),
    ...chars("+−×÷±∓·=≠≈≡<>≤≥≪≫∝∞%‰°′″∣∥⊥∠△")
  ] },
  { id: "analyse", label: "Analyse", keys: [
    k("√( )", "√()", 1, "Racine carrée"), k("∛( )", "∛()", 1, "Racine cubique"), k("ⁿ√( )", "ⁿ√()", 1, "Racine n-ième"),
    k("|x|", "||", 1, "Valeur absolue"), k("lim", "lim(x→)", 1, "Limite"), k("d/dx", "d/dx"),
    k("sin", "sin()", 1), k("cos", "cos()", 1), k("tan", "tan()", 1), k("ln", "ln()", 1), k("log", "log()", 1), k("exp", "exp()", 1),
    k("f(x)", "f(x)"), k("eˣ"), k("∑ᵢ₌₁ⁿ", "∑ᵢ₌₁ⁿ", 0, "Somme"), k("∫ₐᵇ", "∫ₐᵇ", 0, "Intégrale définie"),
    ...chars("∑∏∫∬∮∂∇ΔΣ")
  ] },
  { id: "grec", label: "Grec", keys: [...chars("αβγδεζηθλμνξπρστφχψω"), ...chars("ΓΔΘΛΞΠΣΦΨΩ")] },
  { id: "logique", label: "Ensembles", keys: chars("∈∉⊂⊃⊆⊇∪∩∅∖ℕℤℚℝℂ∀∃∄¬∧∨⇒⇔⟹∴∵→←↔↦⇌↑↓") },
  { id: "indices", label: "Exposants", keys: [...chars("⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼ⁿ⁽⁾"), ...chars("₀₁₂₃₄₅₆₇₈₉₊₋₌ₙₓₐₑ₍₎")] },
  { id: "sciences", label: "Sciences", keys: [
    k("vecteur", "\u20D7", 0, "Flèche sur la lettre précédente"), k("barre", "\u0305", 0, "Trait sur la lettre précédente"),
    k("H₂O"), k("CO₂"), k("O₂"), k("°C"), k("m/s²"), k("N·m"), k("mol/L"), k("kg·m⁻³"),
    ...chars("⇌→↑↓°ΩµÅħℓ∘")
  ] }
];

export function MathKeyboard({ onInsert }: { onInsert: (text: string, back: number) => void }) {
  const [tab, setTab] = useState(TABS[0].id);
  const current = TABS.find(t => t.id === tab) ?? TABS[0];
  return (
    <div className="kit-panel">
      <div className="kit-tabs">
        {TABS.map(t => (
          <button type="button" key={t.id} className={t.id === tab ? "on" : ""}
            onMouseDown={e => e.preventDefault()} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      <div className="kit-keys">
        {current.keys.map((key, i) => (
          <button type="button" key={i} title={key.tip ?? key.t}
            onMouseDown={e => e.preventDefault()} onClick={() => onInsert(key.t, key.back)}>{key.l}</button>
        ))}
      </div>
    </div>
  );
}

const FAMILIES: { name: string; shades: string[] }[] = [
  { name: "Bleu KALYNO", shades: ["#EAF0FF", "#C7D8FF", "#8DB0FF", "#4778D8", "#2457C5", "#1C48A8", "#142344"] },
  { name: "Émeraude", shades: ["#E5F7EE", "#BDEBD6", "#7FD6B0", "#2FB985", "#15966A", "#0B6B4A", "#064430"] },
  { name: "Violet", shades: ["#F1EAFF", "#DCCBFF", "#B999F2", "#9B72E6", "#8457D9", "#6538B8", "#43267F"] },
  { name: "Ambre", shades: ["#FFF5DC", "#FFE7A8", "#FFD066", "#F5B63A", "#D99A1E", "#B7791F", "#7A4F12"] },
  { name: "Rose", shades: ["#FFEBEE", "#FFCDD4", "#F59BA8", "#E5677B", "#D9485F", "#B2304A", "#7D1E33"] },
  { name: "Turquoise", shades: ["#E0F7F5", "#B3EBE6", "#6FD6CE", "#2DB8AE", "#168C85", "#0E6762", "#08403D"] },
  { name: "Ardoise", shades: ["#F5F7FC", "#E7EBF3", "#C4CCDA", "#8B96AA", "#596780", "#202B45", "#0D1B36"] }
];
const HIGHLIGHTS = ["#FFF0B3", "#FFE08A", "#FFD6A5", "#FFCDD4", "#F7C6E3", "#E4D3FF", "#CFE0FF", "#C9F0F0", "#D3F2DD", "#E6F5B5", "#E7EBF3", "#FFFFFF"];

export function ColorPanel({ onText, onBack }: { onText: (c: string) => void; onBack: (c: string) => void }) {
  const [custom, setCustom] = useState("#2457C5");
  const swatch = (h: string, action: (c: string) => void, tip: string) => (
    <button type="button" key={h} title={tip} aria-label={tip} style={{ background: h }}
      onMouseDown={e => e.preventDefault()} onClick={() => action(h)} />
  );
  return (
    <div className="kit-panel">
      <div className="kit-title">Couleur du texte</div>
      {FAMILIES.map(f => (
        <div className="kit-family" key={f.name}>
          <span>{f.name}</span>
          <div className="kit-swatches">{f.shades.map(h => swatch(h, onText, `Texte ${h}`))}</div>
        </div>
      ))}
      <div className="kit-title">Surlignage (le blanc retire le surlignage)</div>
      <div className="kit-swatches">{HIGHLIGHTS.map(h => swatch(h, onBack, `Fond ${h}`))}</div>
      <div className="kit-title">Couleur libre</div>
      <div className="kit-custom">
        <input type="color" value={custom} onChange={e => setCustom(e.target.value.toUpperCase())} aria-label="Couleur libre" />
        <code>{custom}</code>
        <button type="button" className="secondary" onMouseDown={e => e.preventDefault()} onClick={() => onText(custom)}>Appliquer au texte</button>
        <button type="button" className="secondary" onMouseDown={e => e.preventDefault()} onClick={() => onBack(custom)}>Appliquer au fond</button>
      </div>
    </div>
  );
}
