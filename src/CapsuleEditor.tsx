import { useEffect, useRef, useState } from "react";
import {
  Bold, Italic, Underline, List, ListOrdered, Heading2,
  Highlighter, Palette, X, Save
} from "lucide-react";

export type CapsuleEditorDraft = {
  title: string;
  body: string;
  kind: string;
  minutes: number;
  is_high_yield: boolean;
};

type Props = {
  initial: CapsuleEditorDraft;
  editing: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: (draft: CapsuleEditorDraft) => void;
};

const COLORS = [
  "#202B45", "#2457C5", "#4778D8", "#15966A",
  "#8457D9", "#D9485F", "#B7791F", "#FFFFFF"
];

function cleanHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const allowed = new Set([
    "P", "BR", "STRONG", "B", "EM", "I", "U",
    "UL", "OL", "LI", "H2", "H3", "BLOCKQUOTE",
    "SPAN", "MARK", "SUB", "SUP"
  ]);

  doc.querySelectorAll("script,style,iframe,object,embed,form,svg,math")
    .forEach(node => node.remove());

  doc.body.querySelectorAll("*").forEach(node => {
    for (const attr of Array.from(node.attributes)) {
      if (attr.name.toLowerCase().startsWith("on")) {
        node.removeAttribute(attr.name);
      } else if (attr.name === "style") {
        const safe = attr.value.split(";").map(part => part.trim())
          .filter(part => /^(color|background-color)\s*:\s*#[0-9a-f]{3,8}$/i.test(part))
          .join("; ");
        if (safe) node.setAttribute("style", safe);
        else node.removeAttribute("style");
      } else {
        node.removeAttribute(attr.name);
      }
    }

    if (!allowed.has(node.tagName)) {
      node.replaceWith(...Array.from(node.childNodes));
    }
  });

  return doc.body.innerHTML;
}

export default function CapsuleEditor({
  initial, editing, saving, onCancel, onSave
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(initial.title);
  const [kind, setKind] = useState(initial.kind);
  const [minutes, setMinutes] = useState(initial.minutes);
  const [priority, setPriority] = useState(initial.is_high_yield);

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initial.body;
  }, [initial.body]);

  function format(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const body = cleanHtml(editorRef.current?.innerHTML ?? "");
    if (!cleanTitle) {
      window.alert("Le titre du bloc est obligatoire.");
      return;
    }
    if (!body.replace(/<[^>]*>/g, "").trim()) {
      window.alert("Le contenu pédagogique est obligatoire.");
      return;
    }
    onSave({
      title: cleanTitle,
      body,
      kind,
      minutes,
      is_high_yield: priority
    });
  }

  return (
    <div className="editor-overlay" role="presentation">
      <form className="capsule-editor" onSubmit={submit} role="dialog"
        aria-modal="true" aria-labelledby="capsule-editor-title">
        <header className="editor-header">
          <div>
            <span className="eyebrow">CONTENU PÉDAGOGIQUE</span>
            <h2 id="capsule-editor-title">
              {editing ? "Modifier le bloc" : "Créer un bloc"}
            </h2>
            <p>Rédige et mets en forme le contenu de la leçon.</p>
          </div>
          <button type="button" className="icon-button"
            onClick={onCancel} aria-label="Fermer">
            <X size={18}/>
          </button>
        </header>

        <div className="editor-fields">
          <label>
            Titre du bloc
            <input value={title} onChange={e => setTitle(e.target.value)}
              maxLength={180} required placeholder="Ex. : Règle à retenir"/>
          </label>
          <div className="editor-field-grid">
            <label>
              Type de contenu
              <select value={kind} onChange={e => setKind(e.target.value)}>
                <option value="intro">Introduction</option>
                <option value="text">Explication</option>
                <option value="rule">Règle / formule</option>
                <option value="tip">Astuce</option>
                <option value="pitfall">Piège à éviter</option>
              </select>
            </label>
            <label>
              Durée estimée
              <select value={minutes}
                onChange={e => setMinutes(Number(e.target.value))}>
                {[1,2,3,4,5,6,7,8,9,10].map(n =>
                  <option key={n} value={n}>{n} min</option>
                )}
              </select>
            </label>
          </div>
        </div>

        <section className="rich-editor-section">
          <div className="rich-editor-label">
            <strong>Contenu de la leçon</strong>
            <span>Formatage et couleurs</span>
          </div>

          <div className="editor-toolbar">
            <button type="button" title="Gras" onClick={() => format("bold")}>
              <Bold size={17}/>
            </button>
            <button type="button" title="Italique" onClick={() => format("italic")}>
              <Italic size={17}/>
            </button>
            <button type="button" title="Souligné" onClick={() => format("underline")}>
              <Underline size={17}/>
            </button>
            <button type="button" title="Titre" onClick={() => format("formatBlock", "h2")}>
              <Heading2 size={17}/>
            </button>
            <button type="button" title="Liste à puces" onClick={() => format("insertUnorderedList")}>
              <List size={17}/>
            </button>
            <button type="button" title="Liste numérotée" onClick={() => format("insertOrderedList")}>
              <ListOrdered size={17}/>
            </button>
            <span className="editor-toolbar-divider"/>
            <span className="palette-caption"><Palette size={15}/> Texte</span>
            {COLORS.map(color => (
              <button key={color} type="button"
                className={`color-swatch ${color === "#FFFFFF" ? "swatch-white" : ""}`}
                title={`Couleur ${color}`}
                style={{ backgroundColor: color }}
                onMouseDown={e => e.preventDefault()}
                onClick={() => format("foreColor", color)}/>
            ))}
            <span className="palette-caption"><Highlighter size={15}/> Fond</span>
            {["#FFF0B3", "#DDF7E8", "#E4ECFF", "#F0E5FF"].map(color => (
              <button key={color} type="button"
                className="color-swatch"
                title={`Surlignage ${color}`}
                style={{ backgroundColor: color }}
                onMouseDown={e => e.preventDefault()}
                onClick={() => format("hiliteColor", color)}/>
            ))}
          </div>

          <div
            ref={editorRef}
            className="rich-editor"
            contentEditable={!saving}
            suppressContentEditableWarning
            role="textbox"
            aria-label="Contenu de la leçon"
            aria-multiline="true"
            data-placeholder="Écris ici l'explication, la règle, les exemples ou les formules…"
          />
          <p className="editor-help">
            Sélectionne un passage avant d'appliquer une couleur ou un format.
          </p>
        </section>

        <label className="editor-priority">
          <input type="checkbox" checked={priority}
            onChange={e => setPriority(e.target.checked)}/>
          <span>
            <strong>Bloc prioritaire</strong>
            <small>Signaler ce contenu comme important.</small>
          </span>
        </label>

        <footer className="editor-actions">
          <button type="button" className="secondary" onClick={onCancel}
            disabled={saving}>Annuler</button>
          <button type="submit" className="primary" disabled={saving}>
            <Save size={16}/>{saving ? "Enregistrement…" : "Enregistrer le bloc"}
          </button>
        </footer>
      </form>
    </div>
  );
}
