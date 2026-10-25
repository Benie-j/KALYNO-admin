import { useEffect, useState } from "react";
import { Calculator, Palette, X } from "lucide-react";

type Mode = "deg" | "rad";
type Entry = { expr: string; res: string };

const clean = (v: number) => (Math.abs(v) < 1e-14 ? 0 : v);

function fact(n: number) {
  if (!Number.isInteger(n) || n < 0 || n > 170) return NaN;
  let r = 1;
  for (let k = 2; k <= n; k++) r *= k;
  return r;
}

function evaluate(src: string, mode: Mode, ans: number): number {
  const s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/[−–]/g, "-").replace(/π/g, "pi").replace(/\s+/g, "").toLowerCase();
  let i = 0;
  const rad = (x: number) => (mode === "deg" ? (x * Math.PI) / 180 : x);
  const deg = (x: number) => (mode === "deg" ? (x * 180) / Math.PI : x);
  const fns: Record<string, (x: number) => number> = {
    sin: x => clean(Math.sin(rad(x))), cos: x => clean(Math.cos(rad(x))), tan: x => Math.tan(rad(x)),
    asin: x => deg(Math.asin(x)), acos: x => deg(Math.acos(x)), atan: x => deg(Math.atan(x)),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, ln: Math.log, log: Math.log10,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp
  };
  const fail = (): never => { throw new Error("syntax"); };
  const startsOperand = () => /[a-z(]/.test(s[i] ?? "");

  const expr = (): number => {
    let v = term();
    while (s[i] === "+" || s[i] === "-") { const op = s[i++]; const r = term(); v = op === "+" ? v + r : v - r; }
    return v;
  };
  const term = (): number => {
    let v = unary();
    while (s[i] === "*" || s[i] === "/" || startsOperand()) {
      if (s[i] === "*") { i++; v *= unary(); }
      else if (s[i] === "/") { i++; v /= unary(); }
      else v *= unary();
    }
    return v;
  };
  const unary = (): number => {
    if (s[i] === "-") { i++; return -unary(); }
    if (s[i] === "+") { i++; return unary(); }
    return power();
  };
  const power = (): number => {
    const b = postfix();
    if (s[i] === "^") { i++; return Math.pow(b, unary()); }
    return b;
  };
  const postfix = (): number => {
    let v = primary();
    while (s[i] === "!" || s[i] === "%") { v = s[i++] === "!" ? fact(v) : v / 100; }
    return v;
  };
  const primary = (): number => {
    const num = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (num) { i += num[0].length; return parseFloat(num[0]); }
    if (s[i] === "(") { i++; const v = expr(); if (s[i] === ")") i++; return v; }
    const id = /^[a-z]+/.exec(s.slice(i));
    if (!id) return fail();
    const name = id[0];
    i += name.length;
    if (name === "pi") return Math.PI;
    if (name === "e") return Math.E;
    if (name === "ans") return ans;
    const fn = fns[name];
    if (!fn || s[i] !== "(") return fail();
    i++;
    const v = expr();
    if (s[i] === ")") i++;
    return fn(v);
  };

  const result = expr();
  if (i < s.length) fail();
  return result;
}

function fmt(v: number): string {
  if (!Number.isFinite(v)) return "Erreur";
  if (v !== 0 && (Math.abs(v) >= 1e15 || Math.abs(v) < 1e-9)) return v.toExponential(8).replace(/\.?0+e/, "e");
  return String(Number(v.toPrecision(12)));
}

const SCI: [string, string][] = [
  ["sin", "sin("], ["cos", "cos("], ["tan", "tan("], ["ln", "ln("], ["log", "log("],
  ["sin⁻¹", "asin("], ["cos⁻¹", "acos("], ["tan⁻¹", "atan("], ["eˣ", "exp("], ["10ˣ", "10^"],
  ["√", "sqrt("], ["∛", "cbrt("], ["x²", "^2"], ["xʸ", "^"], ["n!", "!"],
  ["π", "π"], ["e", "e"], ["(", "("], [")", ")"], ["|x|", "abs("],
  ["sinh", "sinh("], ["cosh", "cosh("], ["tanh", "tanh("], ["1/x", "1/("], [",", "."]
];
const PAD: [string, string, string?][] = [
  ["7", "7"], ["8", "8"], ["9", "9"], ["÷", "÷", "op"],
  ["4", "4"], ["5", "5"], ["6", "6"], ["×", "×", "op"],
  ["1", "1"], ["2", "2"], ["3", "3"], ["−", "−", "op"],
  ["0", "0"], [".", "."], ["%", "%"], ["+", "+", "op"]
];

function ScientificCalculator() {
  const [expr, setExpr] = useState("");
  const [mode, setMode] = useState<Mode>("deg");
  const [ans, setAns] = useState(0);
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState<Entry[]>([]);

  const current = (): number | null => {
    if (!expr.trim()) return null;
    try { const v = evaluate(expr, mode, ans); return Number.isFinite(v) ? v : null; } catch { return null; }
  };
  const value = current();
  const hasError = expr.trim() !== "" && value === null;
  const press = (t: string) => setExpr(e => e + t);

  const equals = () => {
    if (value === null) return;
    const r = fmt(value);
    setHistory(h => [{ expr, res: r }, ...h].slice(0, 30));
    setAns(value);
    setExpr(/e/.test(r) ? "ans" : r);
  };
  const memAdd = (sign: 1 | -1) => { if (value !== null) setMemory(m => m + sign * value); };

  return (
    <div className="calc">
      <div className="calc-screen">
        <div className="calc-meta"><span>{mode === "deg" ? "DEG" : "RAD"}</span>{memory !== 0 && <span>M = {fmt(memory)}</span>}</div>
        <input
          value={expr}
          inputMode="none"
          spellCheck={false}
          placeholder="0"
          aria-label="Expression"
          onChange={e => setExpr(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") equals(); }}
        />
        <div className={`calc-result ${hasError ? "bad" : ""}`}>{hasError ? "Expression invalide" : value === null ? "\u00a0" : "= " + fmt(value)}</div>
      </div>

      <div className="calc-sci">
        {SCI.map(([label, ins]) => <button key={label} onClick={() => press(ins)}>{label}</button>)}
        <button className="accent" onClick={() => setMode(m => (m === "deg" ? "rad" : "deg"))}>{mode === "deg" ? "Deg" : "Rad"}</button>
        <button onClick={() => memAdd(1)}>M+</button>
        <button onClick={() => memAdd(-1)}>M−</button>
        <button onClick={() => press(fmt(memory))}>MR</button>
        <button onClick={() => setMemory(0)}>MC</button>
      </div>

      <div className="calc-pad">
        <button className="warn" onClick={() => setExpr("")}>AC</button>
        <button className="warn" onClick={() => setExpr(e => e.slice(0, -1))}>⌫</button>
        <button onClick={() => press("ans")}>Ans</button>
        <button className="equals" onClick={equals}>=</button>
        {PAD.map(([label, ins, kind]) => <button key={label} className={kind ?? ""} onClick={() => press(ins)}>{label}</button>)}
      </div>

      {history.length > 0 && (
        <div className="calc-history">
          <div className="calc-history-head"><strong>Historique</strong><button onClick={() => setHistory([])}>Effacer</button></div>
          {history.map((h, k) => (
            <button key={k} onClick={() => setExpr(h.expr)}><span>{h.expr}</span><b>= {h.res}</b></button>
          ))}
        </div>
      )}
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

function ColorPalette() {
  const [copied, setCopied] = useState("");
  const [custom, setCustom] = useState("#2457C5");

  const copy = async (hex: string) => {
    try { await navigator.clipboard.writeText(hex); setCopied(hex); }
    catch { setCopied(hex + " (copie impossible)"); }
    window.setTimeout(() => setCopied(""), 1800);
  };

  return (
    <div className="palette">
      {FAMILIES.map(f => (
        <div key={f.name} className="palette-family">
          <span>{f.name}</span>
          <div>{f.shades.map(h => <button key={h} style={{ background: h }} title={h} aria-label={h} onClick={() => void copy(h)} />)}</div>
        </div>
      ))}
      <div className="palette-custom">
        <input type="color" value={custom} onChange={e => setCustom(e.target.value.toUpperCase())} aria-label="Couleur personnalisée" />
        <code>{custom}</code>
        <button onClick={() => void copy(custom)}>Copier</button>
      </div>
      <div className={`palette-toast ${copied ? "on" : ""}`}>{copied ? `Copié : ${copied}` : "Touchez une couleur pour copier son code"}</div>
    </div>
  );
}

export default function ToolsDock() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"calc" | "palette">("calc");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {!open && <button className="tools-fab" onClick={() => setOpen(true)} aria-label="Ouvrir les outils"><Calculator size={20} /><span>Outils</span></button>}
      {open && (
        <aside className="tools-panel" role="dialog" aria-label="Boîte à outils">
          <header>
            <div className="tools-tabs">
              <button className={tab === "calc" ? "on" : ""} onClick={() => setTab("calc")}><Calculator size={15} /> Calculatrice</button>
              <button className={tab === "palette" ? "on" : ""} onClick={() => setTab("palette")}><Palette size={15} /> Palette</button>
            </div>
            <button className="tools-close" onClick={() => setOpen(false)} aria-label="Fermer"><X size={18} /></button>
          </header>
          <div className="tools-body">{tab === "calc" ? <ScientificCalculator /> : <ColorPalette />}</div>
        </aside>
      )}
    </>
  );
}
