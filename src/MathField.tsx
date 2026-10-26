import { useEffect, useLayoutEffect, useRef } from "react";
import { renderMathText } from "./mathText";
import { ALT_SHORTCUTS, expandTrigger, formulaEdit, mathContext, nextPlaceholder, wrapEdit, type Edit } from "./mathInput";
import { clearActiveField, setActiveField, type FieldHandle } from "./mathBus";

/** Texte enrichi non éditable (liste, aperçu) : formules rendues par KaTeX, le reste échappé. */
export function MathHtml({ text, className }: { text: string; className?: string }) {
  return <span className={className ?? "mt"} dangerouslySetInnerHTML={{ __html: renderMathText(text) }} />;
}

// execCommand garde l'historique Ctrl+Z ; setRangeText sert de repli.
function apply(el: HTMLTextAreaElement, edit: Edit) {
  el.focus();
  el.setSelectionRange(edit.from, edit.to);
  const done = document.execCommand("insertText", false, edit.text);
  if (!done) {
    el.setRangeText(edit.text, edit.from, edit.to, "end");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  el.setSelectionRange(edit.selStart, edit.selEnd);
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  single?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  autoFocus?: boolean;
  maxLength?: number;
  rendered?: boolean;
  disabled?: boolean;
  invalid?: boolean;
};

/**
 * Champ de saisie avec LaTeX : Alt+M formule, Alt+F fraction, Tab = champ ▢ suivant, /fr + Tab = fraction…
 * La palette (MathPalette) insère dans le dernier champ actif.
 */
export default function MathField({
  value, onChange, rows = 3, single = false, placeholder, ariaLabel, autoFocus, maxLength = 2000,
  rendered = true, disabled, invalid
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const handle = useRef<FieldHandle>({
    insert: tex => {
      const el = ref.current; if (!el) return;
      apply(el, formulaEdit(el.value, el.selectionStart, el.selectionEnd, tex));
    },
    wrap: delim => {
      const el = ref.current; if (!el) return;
      apply(el, wrapEdit(el.value, el.selectionStart, el.selectionEnd, delim));
    }
  });

  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);

  useEffect(() => {
    const current = handle.current;
    if (autoFocus) { ref.current?.focus(); setActiveField(current); }
    return () => clearActiveField(current);
  }, [autoFocus]);

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = event.currentTarget;
    const { value: text, selectionStart: start, selectionEnd: end } = el;

    if (single && event.key === "Enter" && !event.ctrlKey && !event.metaKey) { event.preventDefault(); return; }

    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      if (event.code === "KeyM") { event.preventDefault(); apply(el, wrapEdit(text, start, end, event.shiftKey ? "$$" : "$")); return; }
      if (event.code === "KeyK") { event.preventDefault(); window.dispatchEvent(new CustomEvent("kalyno:keyboard")); return; }
      const tex = ALT_SHORTCUTS[event.code];
      if (tex && !event.shiftKey) { event.preventDefault(); apply(el, formulaEdit(text, start, end, tex)); return; }
    }

    if (event.key === "Tab" && !event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey) {
      if (start === end) {
        const exp = expandTrigger(text, start);
        if (exp) { event.preventDefault(); apply(el, formulaEdit(text, exp.from, start, exp.tex, false)); return; }
      }
      const next = nextPlaceholder(text, end);
      if (next) { event.preventDefault(); el.setSelectionRange(next.start, next.end); return; }
      const ctx = mathContext(text, end);
      if (ctx.inside && ctx.closeAt >= 0) { event.preventDefault(); el.setSelectionRange(ctx.closeAt, ctx.closeAt); }
    }
  }

  return (
    <div className="mf">
      <textarea
        ref={ref}
        className={`mf-input ${invalid ? "invalid" : ""}`}
        value={value}
        rows={single ? 1 : rows}
        maxLength={maxLength}
        disabled={disabled}
        spellCheck
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={e => onChange(single ? e.target.value.replace(/\n/g, " ") : e.target.value)}
        onFocus={() => setActiveField(handle.current)}
        onKeyDown={onKeyDown}
      />
      {rendered && value.includes("$") && <div className="mf-rendered"><MathHtml text={value} /></div>}
    </div>
  );
}
