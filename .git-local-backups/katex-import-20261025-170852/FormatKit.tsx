import { useState } from "react";
import { renderToString } from "katex";
import "katex/dist/katex.min.css";

export const PH = "▢";

type Item = { tex: string; tip: string };
type Category = { id: string; label: string; level: string; items: Item[] };

const R = String.raw;

const parse = (block: string): Item[] =>
  block.trim().split("\n").map(line => {
    const at = line.lastIndexOf(" // ");
    return at < 0
      ? { tex: line.trim(), tip: "" }
      : { tex: line.slice(0, at).trim(), tip: line.slice(at + 4).trim() };
  });

const greek = (names: string): Item[] =>
  names.split(" ").map(n => ({ tex: "\\" + n, tip: n }));

const CATS: Category[] = [
  { id: "base", label: "Essentiels", level: "Tous niveaux", items: parse(R`
$▢$ // Formule dans une phrase
$$▢$$ // Formule centrée sur sa ligne
\frac{▢}{▢} // Fraction
\dfrac{▢}{▢} // Grande fraction
▢^{▢} // Puissance
▢_{▢} // Indice
▢^{2} // Carré
\sqrt{▢} // Racine carrée
\sqrt[3]{▢} // Racine cubique
\sqrt[▢]{▢} // Racine n-ième
\left|▢\right| // Valeur absolue
\left(▢\right) // Parenthèses adaptées
\left[▢\right] // Crochets adaptés
\left\{▢\right\} // Accolades adaptées
\times // Multiplication
\div // Division
\pm // Plus ou moins
\cdot // Point de multiplication
\neq // Différent
\approx // Environ égal
\leq // Inférieur ou égal
\geq // Supérieur ou égal
< // Inférieur
> // Supérieur
\infty // Infini
\pi // Pi
^{\circ} // Degré
\% // Pourcentage
`) },
  { id: "equations", label: "Équations", level: "3ᵉ → Terminale", items: parse(R`
x = 3x + 2 // Équation simple (modèle)
ax + b = 0 // Équation du 1er degré
y = ax + b // Droite
\Leftrightarrow // Équivaut à
\Rightarrow // Implique
\boxed{▢} // Encadrer le résultat
\begin{array}{rl} ▢ &= ▢ \\ &= ▢ \end{array} // Calcul en plusieurs lignes
\begin{array}{rl} ▢x + ▢ &= ▢ \\ ▢x &= ▢ \\ x &= \dfrac{▢}{▢} \end{array} // Résolution pas à pas
\begin{cases} ▢ \\ ▢ \end{cases} // Système de 2 équations
\begin{cases} ▢x + ▢y = ▢ \\ ▢x + ▢y = ▢ \end{cases} // Système linéaire
S = \{▢\} // Ensemble solution
S = \emptyset // Aucune solution
▢ \leq x \leq ▢ // Encadrement
▢ < x < ▢ // Inégalité stricte
ax^2 + bx + c = 0 // Équation du 2nd degré
\Delta = b^2 - 4ac // Discriminant
x = \dfrac{-b \pm \sqrt{\Delta}}{2a} // Solutions
x_1 + x_2 = -\dfrac{b}{a} // Somme des racines
x_1 \times x_2 = \dfrac{c}{a} // Produit des racines
f(x) = ▢ // Fonction
f : x \mapsto ▢ // Fonction (notation)
f(▢) = ▢ // Image
`) },
  { id: "calcul", label: "Calcul", level: "3ᵉ", items: parse(R`
\dfrac{a}{b} + \dfrac{c}{d} = \dfrac{ad + bc}{bd} // Somme de fractions
\dfrac{a}{b} \times \dfrac{c}{d} = \dfrac{ac}{bd} // Produit de fractions
\dfrac{a}{b} \div \dfrac{c}{d} = \dfrac{a}{b} \times \dfrac{d}{c} // Quotient de fractions
a^m \times a^n = a^{m+n} // Produit de puissances
\dfrac{a^m}{a^n} = a^{m-n} // Quotient de puissances
(a^m)^n = a^{mn} // Puissance de puissance
a^{-n} = \dfrac{1}{a^n} // Puissance négative
a^0 = 1 // Puissance zéro
▢ \times 10^{▢} // Écriture scientifique
10^{-▢} // Puissance de 10 négative
\sqrt{a \times b} = \sqrt{a} \times \sqrt{b} // Racine d'un produit
\sqrt{\dfrac{a}{b}} = \dfrac{\sqrt{a}}{\sqrt{b}} // Racine d'un quotient
\dfrac{▢}{100} \times ▢ // Pourcentage d'une quantité
(a + b)^2 = a^2 + 2ab + b^2 // Identité remarquable
(a - b)^2 = a^2 - 2ab + b^2 // Identité remarquable
(a + b)(a - b) = a^2 - b^2 // Identité remarquable
`) },
  { id: "geo", label: "Géométrie", level: "3ᵉ → Terminale", items: parse(R`
AB^2 = AC^2 + BC^2 // Pythagore
\dfrac{AM}{AB} = \dfrac{AN}{AC} = \dfrac{MN}{BC} // Thalès
\cos \widehat{▢} = \dfrac{\text{côté adjacent}}{\text{hypoténuse}} // Cosinus
\sin \widehat{▢} = \dfrac{\text{côté opposé}}{\text{hypoténuse}} // Sinus
\tan \widehat{▢} = \dfrac{\text{côté opposé}}{\text{côté adjacent}} // Tangente
\cos^2 x + \sin^2 x = 1 // Relation fondamentale
\widehat{ABC} // Angle
\overrightarrow{AB} // Vecteur AB
\vec{u} // Vecteur u
\overline{AB} // Barre au-dessus
\begin{pmatrix} ▢ \\ ▢ \end{pmatrix} // Coordonnées d'un vecteur
\begin{pmatrix} ▢ \\ ▢ \\ ▢ \end{pmatrix} // Vecteur en 3D
\left\| \vec{u} \right\| = \sqrt{x^2 + y^2} // Norme
\vec{u} \cdot \vec{v} = xx' + yy' // Produit scalaire
(AB) \perp (CD) // Droites perpendiculaires
(AB) \parallel (CD) // Droites parallèles
\triangle ABC // Triangle
\perp // Perpendiculaire
\parallel // Parallèle
\pi r^2 // Aire du disque
2 \pi r // Périmètre du cercle
\dfrac{1}{3} \pi r^2 h // Volume du cône
\dfrac{4}{3} \pi r^3 // Volume de la sphère
\text{cm}^2 // cm carré
\text{cm}^3 // cm cube
`) },
  { id: "analyse", label: "Analyse", level: "Terminale", items: parse(R`
\lim_{x \to ▢} ▢ // Limite
\lim_{x \to +\infty} ▢ // Limite en plus l'infini
\lim_{x \to -\infty} ▢ // Limite en moins l'infini
\lim_{x \to ▢^{+}} ▢ // Limite à droite
\lim_{x \to ▢^{-}} ▢ // Limite à gauche
f'(x) // Dérivée
f''(x) // Dérivée seconde
\dfrac{df}{dx} // Dérivée (Leibniz)
(u + v)' = u' + v' // Dérivée d'une somme
(uv)' = u'v + uv' // Dérivée d'un produit
\left( \dfrac{u}{v} \right)' = \dfrac{u'v - uv'}{v^2} // Dérivée d'un quotient
(u^n)' = n u' u^{n-1} // Dérivée d'une puissance
\left( \sqrt{u} \right)' = \dfrac{u'}{2\sqrt{u}} // Dérivée d'une racine
(e^{u})' = u' e^{u} // Dérivée de l'exponentielle
(\ln u)' = \dfrac{u'}{u} // Dérivée du logarithme
\int_{▢}^{▢} ▢ \, dx // Intégrale définie
\int ▢ \, dx // Primitive
\left[ F(x) \right]_{▢}^{▢} // Crochet d'évaluation
\int_{a}^{b} f(x) \, dx = F(b) - F(a) // Calcul d'une intégrale
\ln(▢) // Logarithme népérien
e^{▢} // Exponentielle
\exp(▢) // Exponentielle (notation)
\log(▢) // Logarithme décimal
\ln(ab) = \ln a + \ln b // Propriété de ln
\ln \left( \dfrac{a}{b} \right) = \ln a - \ln b // Propriété de ln
\ln(a^n) = n \ln a // Propriété de ln
\sin(▢) // Sinus
\cos(▢) // Cosinus
\tan(▢) // Tangente
\arctan(▢) // Arc tangente
\sum_{k=▢}^{▢} ▢ // Somme
`) },
  { id: "suites", label: "Suites", level: "Terminale", items: parse(R`
u_n // Terme général
u_{n+1} // Terme suivant
(u_n)_{n \in \mathbb{N}} // Suite
u_{n+1} = u_n + r // Récurrence arithmétique
u_n = u_0 + n r // Terme arithmétique
u_{n+1} = q \times u_n // Récurrence géométrique
u_n = u_0 \times q^n // Terme géométrique
\sum_{k=0}^{n} u_k = \dfrac{(n+1)(u_0 + u_n)}{2} // Somme arithmétique
\sum_{k=0}^{n} q^k = \dfrac{1 - q^{n+1}}{1 - q} // Somme géométrique
\lim_{n \to +\infty} u_n = ▢ // Limite d'une suite
\forall n \in \mathbb{N} // Pour tout entier n
\mathcal{P}(n) // Propriété de récurrence
\mathcal{P}(0) \text{ est vraie} // Initialisation
\mathcal{P}(n) \Rightarrow \mathcal{P}(n+1) // Hérédité
`) },
  { id: "proba", label: "Probabilités", level: "Terminale", items: parse(R`
n! // Factorielle
A_n^p = \dfrac{n!}{(n-p)!} // Arrangements
\binom{n}{p} // Combinaison
\binom{n}{p} = \dfrac{n!}{p!\,(n-p)!} // Formule des combinaisons
P(A) // Probabilité
P(A \cap B) // Intersection
P(A \cup B) = P(A) + P(B) - P(A \cap B) // Réunion
P_B(A) = \dfrac{P(A \cap B)}{P(B)} // Probabilité conditionnelle
\overline{A} // Événement contraire
P(\overline{A}) = 1 - P(A) // Probabilité du contraire
E(X) = \sum x_i \, P(X = x_i) // Espérance
V(X) = E(X^2) - E(X)^2 // Variance
\sigma(X) = \sqrt{V(X)} // Écart type
X \sim \mathcal{B}(n \,;\, p) // Loi binomiale
P(X = k) = \binom{n}{k} p^k (1-p)^{n-k} // Formule binomiale
\bar{x} = \dfrac{\sum n_i x_i}{N} // Moyenne
`) },
  { id: "complexes", label: "Complexes", level: "Terminale C, D", items: parse(R`
i^2 = -1 // Unité imaginaire
z = a + ib // Forme algébrique
\bar{z} // Conjugué
|z| = \sqrt{a^2 + b^2} // Module
\arg(z) // Argument
\mathrm{Re}(z) // Partie réelle
\mathrm{Im}(z) // Partie imaginaire
e^{i\theta} // Exponentielle complexe
z = r(\cos\theta + i\sin\theta) // Forme trigonométrique
z = r e^{i\theta} // Forme exponentielle
z = \dfrac{-b \pm i\sqrt{-\Delta}}{2a} // Racines complexes
\overline{z_1 z_2} = \overline{z_1} \, \overline{z_2} // Conjugué d'un produit
|z_1 z_2| = |z_1| \, |z_2| // Module d'un produit
z^n = r^n e^{in\theta} // Formule de Moivre
`) },
  { id: "ensembles", label: "Ensembles", level: "3ᵉ → Terminale", items: parse(R`
\in // Appartient
\notin // N'appartient pas
\subset // Inclus
\subseteq // Inclus ou égal
\cup // Réunion
\cap // Intersection
\emptyset // Ensemble vide
\setminus // Privé de
\mathbb{N} // Entiers naturels
\mathbb{Z} // Entiers relatifs
\mathbb{Q} // Rationnels
\mathbb{R} // Réels
\mathbb{C} // Complexes
\mathbb{R}^{*} // Réels non nuls
\mathbb{R}_{+} // Réels positifs
\mathbb{R}_{-} // Réels négatifs
\mathbb{N}^{*} // Entiers non nuls
\forall // Pour tout
\exists // Il existe
\nexists // Il n'existe pas
\neg // Négation
\land // Et
\lor // Ou
\to // Flèche
\mapsto // Associe
\longrightarrow // Longue flèche
[▢ \,;\, ▢] // Intervalle fermé
]▢ \,;\, ▢[ // Intervalle ouvert
[▢ \,;\, ▢[ // Intervalle semi-ouvert
]▢ \,;\, ▢] // Intervalle semi-ouvert
[▢ \,;\, +\infty[ // Intervalle non borné
]-\infty \,;\, ▢] // Intervalle non borné
`) },
  { id: "grec", label: "Grec", level: "Tous niveaux", items: [
    ...greek("alpha beta gamma delta epsilon varepsilon zeta eta theta lambda mu nu xi pi rho sigma tau phi varphi chi psi omega"),
    ...greek("Gamma Delta Theta Lambda Xi Pi Sigma Phi Psi Omega")
  ] },
  { id: "matrices", label: "Matrices", level: "Terminale", items: parse(R`
\begin{pmatrix} ▢ & ▢ \\ ▢ & ▢ \end{pmatrix} // Matrice 2×2
\begin{pmatrix} ▢ & ▢ & ▢ \\ ▢ & ▢ & ▢ \\ ▢ & ▢ & ▢ \end{pmatrix} // Matrice 3×3
\begin{vmatrix} ▢ & ▢ \\ ▢ & ▢ \end{vmatrix} // Déterminant 2×2
\begin{array}{|c|c|c|} \hline x & ▢ & ▢ \\ \hline f(x) & ▢ & ▢ \\ \hline \end{array} // Tableau de valeurs
\begin{array}{c|ccccc} x & -\infty & & ▢ & & +\infty \\ \hline f'(x) & & + & 0 & - & \\ \hline f(x) & & \nearrow & & \searrow & \end{array} // Tableau de variations
`) },
  { id: "chimie", label: "Physique-Chimie", level: "Lycée", items: [
    ...parse(R`
\mathrm{H_2O} // Eau
\mathrm{CO_2} // Dioxyde de carbone
\mathrm{O_2} // Dioxygène
\mathrm{Fe^{3+}} // Ion fer III
\mathrm{SO_4^{2-}} // Ion sulfate
\rightleftharpoons // Réaction réversible
\longrightarrow // Réaction
\Delta H // Variation d'enthalpie
v = \dfrac{d}{t} // Vitesse
F = m \times a // Force
U = R \times I // Loi d'Ohm
P = U \times I // Puissance électrique
E = m c^2 // Énergie
n = \dfrac{m}{M} // Quantité de matière
C = \dfrac{n}{V} // Concentration
\text{mol} \cdot \text{L}^{-1} // Mole par litre
^{\circ}\text{C} // Degré Celsius
`),
    { tex: "\\uparrow", tip: "Gaz dégagé" },
    { tex: "\\downarrow", tip: "Précipité" }
  ] },
  { id: "forme", label: "Mise en forme", level: "LaTeX", items: [
    ...parse(R`
\text{▢} // Texte dans une formule
\, // Petit espace
\quad // Espace moyen
\\ // Nouvelle ligne
\overbrace{▢}^{▢} // Accolade dessus
\mathbf{▢} // Gras
\hat{▢} // Chapeau
\tilde{▢} // Tilde
\dots // Points de suspension
\cdots // Points centrés
\vdots // Points verticaux
`),
    { tex: "\\underbrace{▢}_{▢}", tip: "Accolade dessous" },
    { tex: "\\underline{▢}", tip: "Souligné" }
  ] }
];

const ALL: Item[] = CATS.flatMap(c => c.items);
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const cache = new Map<string, string>();
function label(tex: string): string {
  const hit = cache.get(tex);
  if (hit) return hit;
  let html: string;
  if (tex.startsWith("$")) {
    html = `<span class="kit-raw">${tex.split(PH).join("…").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</span>`;
  } else {
    try {
      html = renderToString(tex.split(PH).join("\\square "), { throwOnError: false, output: "html" });
    } catch {
      html = tex.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    }
  }
  cache.set(tex, html);
  return html;
}

export function MathKeyboard({ onInsert }: { onInsert: (tex: string) => void }) {
  const [tab, setTab] = useState(CATS[0].id);
  const [query, setQuery] = useState("");
  const q = norm(query.trim());
  const current = CATS.find(c => c.id === tab) ?? CATS[0];
  const items = q ? ALL.filter(i => norm(i.tip + " " + i.tex).includes(q)) : current.items;

  return (
    <div className="kit-panel">
      <input className="kit-search" value={query} onChange={e => setQuery(e.target.value)}
        placeholder="Rechercher un raccourci : fraction, racine, intégrale, Pythagore…" />
      <div className="kit-tabs">
        {CATS.map(c => (
          <button type="button" key={c.id} className={!q && c.id === tab ? "on" : ""}
            onMouseDown={e => e.preventDefault()} onClick={() => { setQuery(""); setTab(c.id); }}>{c.label}</button>
        ))}
      </div>
      <div className="kit-title">
        {q ? `${items.length} résultat(s)` : current.level} · Tab = champ suivant, puis sortir de la formule
      </div>
      <div className="kit-keys kit-tex">
        {items.map((it, i) => (
          <button type="button" key={i} title={`${it.tip}\n${it.tex}`}
            className={it.tex.length > 46 ? "xwide" : it.tex.length > 22 ? "wide" : ""}
            onMouseDown={e => e.preventDefault()} onClick={() => onInsert(it.tex)}
            dangerouslySetInnerHTML={{ __html: label(it.tex) }} />
        ))}
        {items.length === 0 && <p className="kit-empty">Aucun raccourci trouvé.</p>}
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
