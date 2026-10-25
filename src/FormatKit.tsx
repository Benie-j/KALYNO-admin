import { useState } from "react";

export const PH = "▢";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const frac = (n: string, d: string) =>
  `<span class="frac"><span class="fn">${n}</span><span class="fd">${d}</span></span>`;

type Key = { l: string; h: string; tip?: string };
const key = (l: string, h: string, tip?: string): Key => ({ l, h, tip });
const txt = (s: string, tip?: string): Key => ({ l: esc(s), h: esc(s), tip });
const sym = (s: string): Key[] => Array.from(s).map(c => txt(c));

const TABS: { id: string; label: string; level: string; keys: Key[] }[] = [
  { id: "calcul", label: "Calcul", level: "3ᵉ · Lycée", keys: [
    key(frac("a", "b"), frac(PH, PH), "Fraction"),
    key("x<sup>n</sup>", `${PH}<sup>${PH}</sup>`, "Puissance"),
    txt("x²".replace("x", ""), "Carré"), txt("³", "Cube"), txt("⁻¹", "Inverse"),
    key("√x", `√(${PH})`, "Racine carrée"), key("∛x", `∛(${PH})`, "Racine cubique"),
    key("<sup>n</sup>√x", `<sup>${PH}</sup>√(${PH})`, "Racine n-ième"),
    key("10<sup>n</sup>", `10<sup>${PH}</sup>`, "Puissance de 10"),
    key("a×10<sup>n</sup>", `${PH} × 10<sup>${PH}</sup>`, "Écriture scientifique"),
    key("|x|", `|${PH}|`, "Valeur absolue"),
    ...sym("+−×÷±·=≠≈≤≥<>%‰π∞°"), ...sym("()[]{}"),
    key("[a ; b]", `[${PH} ; ${PH}]`, "Intervalle fermé"),
    key("]a ; b[", `]${PH} ; ${PH}[`, "Intervalle ouvert"),
    key("[a ; b[", `[${PH} ; ${PH}[`, "Intervalle semi-ouvert"),
    key("]a ; +∞[", `]${PH} ; +∞[`), key("]−∞ ; a]", `]−∞ ; ${PH}]`),
    key("(a+b)²", "(a + b)² = a² + 2ab + b²", "Identité remarquable"),
    key("(a−b)²", "(a − b)² = a² − 2ab + b²", "Identité remarquable"),
    key("a²−b²", "a² − b² = (a − b)(a + b)", "Identité remarquable")
  ] },
  { id: "geo", label: "Géométrie", level: "3ᵉ · Lycée", keys: [
    key("a²=b²+c²", `${PH}² = ${PH}² + ${PH}²`, "Pythagore"),
    key(frac("AM", "AB") + "=" + frac("AN", "AC"), `${frac(PH, PH)} = ${frac(PH, PH)} = ${frac(PH, PH)}`, "Thalès"),
    key("cos", `cos(${PH}) = ${frac("côté adjacent", "hypoténuse")}`, "Cosinus"),
    key("sin", `sin(${PH}) = ${frac("côté opposé", "hypoténuse")}`, "Sinus"),
    key("tan", `tan(${PH}) = ${frac("côté opposé", "côté adjacent")}`, "Tangente"),
    txt("x̂".slice(1), "Chapeau sur la lettre précédente (angle)"),
    txt("\u20D7", "Flèche sur la lettre précédente (vecteur)"),
    txt("\u0304", "Barre sur la lettre précédente"),
    txt("AB\u20D7", "Vecteur AB"), txt("u\u20D7"), txt("v\u20D7"), txt("i\u20D7"), txt("j\u20D7"),
    key("∠ABC", `∠${PH}${PH}${PH}`, "Angle"),
    key("(AB)", `(${PH}${PH})`, "Droite"), key("[AB]", `[${PH}${PH}]`, "Segment"), key("[AB)", `[${PH}${PH})`, "Demi-droite"),
    ...sym("⊥∥△≅∠°′″"),
    txt("πr²", "Aire du disque"), txt("2πr", "Périmètre du cercle"), txt("cm²"), txt("cm³"), txt("m²"), txt("m³")
  ] },
  { id: "algebre", label: "Algèbre", level: "3ᵉ · Lycée", keys: [
    txt("ax + b = 0"), txt("ax² + bx + c = 0"), txt("Δ = b² − 4ac", "Discriminant"),
    key(frac("−b ± √Δ", "2a"), `x = ${frac("−b ± √Δ", "2a")}`, "Solutions de l'équation du second degré"),
    key("x₁+x₂", `x₁ + x₂ = ${frac("−b", "a")}`, "Somme des racines"),
    key("x₁×x₂", `x₁ × x₂ = ${frac("c", "a")}`, "Produit des racines"),
    key("{ ⋯", `{&nbsp;${PH}<br>&nbsp;&nbsp;${PH}`, "Système de deux équations"),
    key("S = { }", `S = {${PH}}`, "Ensemble solution"), txt("S = ∅"),
    txt("f(x)"), key("f : x ↦", `f : x ↦ ${PH}`, "Définition d'une fonction"),
    txt("f′(x)"), txt("(f ∘ g)(x)"), txt("f⁻¹"),
    key("a ≤ x ≤ b", `${PH} ≤ x ≤ ${PH}`, "Encadrement"),
    ...sym("∈∉⊂⊄⊆∪∩∅∖ℕℤℚℝℂ∀∃∄¬∧∨⇒⇔∴∵"),
    txt("ℝ*"), txt("ℝ⁺"), txt("ℝ⁻"), txt("ℕ*")
  ] },
  { id: "analyse", label: "Analyse", level: "Terminale", keys: [
    key("lim", `lim<sub>x→${PH}</sub> `, "Limite"),
    key("lim<sub>+∞</sub>", "lim<sub>x→+∞</sub> ", "Limite en +∞"),
    key("lim<sub>−∞</sub>", "lim<sub>x→−∞</sub> ", "Limite en −∞"),
    key("lim<sub>a⁺</sub>", `lim<sub>x→${PH}⁺</sub> `, "Limite à droite"),
    key("lim<sub>a⁻</sub>", `lim<sub>x→${PH}⁻</sub> `, "Limite à gauche"),
    txt("+∞"), txt("−∞"), txt("→"),
    txt("f′(x)"), txt("f″(x)"), key(frac("df", "dx"), frac("df", "dx"), "Dérivée"),
    txt("u′"), key("(u+v)′", "(u + v)′ = u′ + v′"), key("(uv)′", "(uv)′ = u′v + uv′"),
    key(frac("u", "v") + "′", `(${frac("u", "v")})′ = ${frac("u′v − uv′", "v²")}`, "Dérivée d'un quotient"),
    key("(eᵘ)′", "(eᵘ)′ = u′eᵘ"), key("(ln u)′", `(ln u)′ = ${frac("u′", "u")}`),
    key("∫<sub>a</sub><sup>b</sup>", `∫<sub>${PH}</sub><sup>${PH}</sup> ${PH} dx`, "Intégrale définie"),
    key("∫ f dx", `∫ ${PH} dx`, "Primitive"),
    key("[F]<sub>a</sub><sup>b</sup>", `[${PH}]<sub>${PH}</sub><sup>${PH}</sup>`, "Crochet d'évaluation"),
    key("∑", `∑<sub>i=${PH}</sub><sup>${PH}</sup>`, "Somme"),
    key("e<sup>x</sup>", `e<sup>${PH}</sup>`, "Exponentielle"),
    key("ln", `ln(${PH})`), key("log", `log(${PH})`), key("exp", `exp(${PH})`),
    key("sin", `sin(${PH})`), key("cos", `cos(${PH})`), key("tan", `tan(${PH})`), key("arctan", `arctan(${PH})`),
    key("uₙ", "u<sub>n</sub>"), key("uₙ₊₁", "u<sub>n+1</sub>"), key("u₀", "u<sub>0</sub>"),
    key("arith.", "u<sub>n</sub> = u<sub>0</sub> + nr", "Suite arithmétique"),
    key("géom.", "u<sub>n</sub> = u<sub>0</sub> × q<sup>n</sup>", "Suite géométrique"),
    ...sym("∂∇Δ")
  ] },
  { id: "complexes", label: "Complexes", level: "Terminale", keys: [
    txt("i"), txt("i² = −1"), txt("z = a + ib"), txt("z\u0304", "Conjugué"),
    key("|z|", `|${PH}|`, "Module"), key("arg", `arg(${PH})`, "Argument"), txt("Re(z)"), txt("Im(z)"),
    key("e<sup>iθ</sup>", "e<sup>iθ</sup>", "Forme exponentielle"),
    key("r(cosθ+i sinθ)", `${PH}(cos θ + i sin θ)`, "Forme trigonométrique"),
    key("[r ; θ]", `[${PH} ; ${PH}]`, "Forme polaire"),
    key(frac("−b ± i√(−Δ)", "2a"), `z = ${frac("−b ± i√(−Δ)", "2a")}`, "Racines complexes"),
    txt("z₁"), txt("z₂"), txt("z′"), txt("θ"), txt("ρ")
  ] },
  { id: "proba", label: "Proba & stats", level: "Terminale", keys: [
    key("n!", `${PH}!`, "Factorielle"),
    key("A<sub>n</sub><sup>p</sup>", `A<sub>${PH}</sub><sup>${PH}</sup>`, "Arrangements"),
    key("C<sub>n</sub><sup>p</sup>", `C<sub>${PH}</sub><sup>${PH}</sup>`, "Combinaisons"),
    key("C<sub>n</sub><sup>p</sup>=", `C<sub>n</sub><sup>p</sup> = ${frac("n!", "p!(n − p)!")}`, "Formule des combinaisons"),
    key("P(A)", `P(${PH})`), txt("P(A ∩ B)"), key("P(A∪B)", "P(A ∪ B) = P(A) + P(B) − P(A ∩ B)"),
    key("P<sub>B</sub>(A)", `P<sub>${PH}</sub>(${PH})`, "Probabilité conditionnelle"),
    key("P<sub>B</sub>(A)=", `P<sub>B</sub>(A) = ${frac("P(A ∩ B)", "P(B)")}`),
    txt("P(Ā)"), txt("E(X)"), txt("V(X)"), txt("σ(X)"),
    key("ℬ(n ; p)", `ℬ(${PH} ; ${PH})`, "Loi binomiale"),
    key("P(X=k)", "P(X = k) = C<sub>n</sub><sup>k</sup> p<sup>k</sup>(1 − p)<sup>n−k</sup>", "Loi binomiale"),
    txt("x\u0304", "Moyenne"), key("x̄=", `x\u0304 = ${frac("∑ n<sub>i</sub>x<sub>i</sub>", "N")}`, "Moyenne pondérée"),
    key("Q₁", "Q<sub>1</sub>"), key("Q₃", "Q<sub>3</sub>"), ...sym("σμ∩∪")
  ] },
  { id: "grec", label: "Grec", level: "Tous niveaux", keys: [...sym("αβγδεζηθικλμνξπρστυφχψω"), ...sym("ΓΔΘΛΞΠΣΦΨΩ")] },
  { id: "symboles", label: "Symboles", level: "Tous niveaux", keys: [
    ...sym("→←↔↦⇒⇔⇌↑↓≡≪≫∝∣∥⊥‰′″"),
    ...sym("⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼ⁿ⁽⁾"), ...sym("₀₁₂₃₄₅₆₇₈₉₊₋₌ₙₓₐₑᵢ₍₎")
  ] },
  { id: "sciences", label: "Sciences", level: "Physique-Chimie · SVT", keys: [
    txt("H₂O"), txt("CO₂"), txt("O₂"), txt("NaCl"), txt("°C"), txt("m/s²"), txt("mol/L"), txt("kg·m⁻³"),
    key("ion", `${PH}<sup>${PH}</sup>`, "Ion (ex. Fe³⁺)"), key("X<sub>n</sub>", `${PH}<sub>${PH}</sub>`, "Indice"),
    txt("⇌", "Réaction réversible"), txt("→"), txt("↑", "Gaz dégagé"), txt("↓", "Précipité"),
    txt("ΔH"), txt("Ω"), txt("µ"), txt("Å"), txt("ħ"), txt("ℓ"), txt("∘")
  ] }
];

export function MathKeyboard({ onInsert }: { onInsert: (html: string) => void }) {
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
      <div className="kit-title">{current.level} · Tab = champ suivant ou sortir de la formule</div>
      <div className="kit-keys">
        {current.keys.map((k, i) => (
          <button type="button" key={i} title={k.tip ?? k.h.replace(/<[^>]*>/g, "")}
            onMouseDown={e => e.preventDefault()} onClick={() => onInsert(k.h)}
            dangerouslySetInnerHTML={{ __html: k.l }} />
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
