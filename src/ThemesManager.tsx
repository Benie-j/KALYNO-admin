import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Edit3, Save, Trash2, X } from "lucide-react";
import { supabase } from "./lib/supabase";

type Status = "draft" | "published";
type Theme = { id: string; subject_id: string; title: string; position: number; status: Status };
type ChapterRef = { id: string; title: string; position: number; status: Status; theme_id: string | null };
type Draft = { title: string; position: string };

const errText = (e: unknown) => e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);

type Props = { subjectId: string; busy: boolean; onNotice: (s: string) => void };

/* Thèmes d’une discipline + rattachement des leçons (chapters.theme_id).
   L’app n’affiche que les thèmes publiés ; une leçon sans thème (ou dans un thème en brouillon)
   apparaît simplement hors thème. */
export default function ThemesManager({ subjectId, busy, onNotice }: Props) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [chapters, setChapters] = useState<ChapterRef[]>([]);
  const [draft, setDraft] = useState<Draft>({ title: "", position: "0" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!subjectId) { setThemes([]); setChapters([]); return; }
    const [t, c] = await Promise.all([
      supabase.from("themes").select("id,subject_id,title,position,status").eq("subject_id", subjectId).order("position", { ascending: true }).order("id", { ascending: true }),
      supabase.from("chapters").select("id,title,position,status,theme_id").eq("subject_id", subjectId).order("position", { ascending: true })
    ]);
    if (t.error) { onNotice("Échec : " + errText(t.error)); return; }
    if (c.error) { onNotice("Échec : " + errText(c.error)); return; }
    setThemes((t.data ?? []) as Theme[]);
    setChapters((c.data ?? []) as ChapterRef[]);
  }, [subjectId, onNotice]);

  useEffect(() => { setEditingId(null); void load(); }, [load]);
  useEffect(() => { if (!editingId) setDraft(d => ({ ...d, position: String(themes.length) })); }, [themes.length, editingId]);

  function reset() { setEditingId(null); setDraft({ title: "", position: String(themes.length) }); }

  async function run(action: () => Promise<void>, done: string) {
    setSaving(true); onNotice("");
    try { await action(); await load(); onNotice(done); }
    catch (e) { onNotice("Échec : " + errText(e)); }
    finally { setSaving(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const title = draft.title.trim();
    const position = Number(draft.position);
    if (!title || !Number.isInteger(position) || position < 0) { onNotice("Échec : le titre et une position entière sont obligatoires."); return; }
    const wasEditing = editingId;
    await run(async () => {
      const result = wasEditing
        ? await supabase.from("themes").update({ title, position }).eq("id", wasEditing)
        : await supabase.from("themes").insert({ subject_id: subjectId, title, position, status: "draft" });
      if (result.error) throw result.error;
      setEditingId(null); setDraft({ title: "", position: String(themes.length + (wasEditing ? 0 : 1)) });
    }, wasEditing ? "Thème mis à jour." : "Thème créé en brouillon. Publie-le pour que les élèves le voient.");
  }

  async function toggle(theme: Theme) {
    const status: Status = theme.status === "published" ? "draft" : "published";
    if (status === "published" && !window.confirm("Publier ce thème ? Il apparaîtra dans l’Explorer des élèves.")) return;
    await run(async () => {
      const { error } = await supabase.from("themes").update({ status }).eq("id", theme.id);
      if (error) throw error;
    }, status === "published" ? "Thème publié." : "Thème remis en brouillon : ses leçons apparaissent hors thème.");
  }

  async function remove(theme: Theme) {
    if (!window.confirm(`Supprimer le thème « ${theme.title} » ? Les leçons rattachées ne sont pas supprimées : elles reviennent sans thème.`)) return;
    await run(async () => {
      const { error } = await supabase.from("themes").delete().eq("id", theme.id);
      if (error) throw error;
      if (editingId === theme.id) reset();
    }, "Thème supprimé.");
  }

  async function assign(chapter: ChapterRef, themeId: string) {
    await run(async () => {
      const { error } = await supabase.from("chapters").update({ theme_id: themeId || null }).eq("id", chapter.id);
      if (error) throw error;
    }, themeId ? "Leçon rattachée au thème." : "Leçon retirée de son thème.");
  }

  if (!subjectId) return <div className="panel"><div className="empty-state"><p>Choisis une discipline pour gérer ses thèmes.</p></div></div>;

  const countOf = (id: string) => chapters.filter(c => c.theme_id === id).length;
  const published = themes.filter(t => t.status === "published").length;
  return <div style={{ display: "grid", gap: 18 }}>
    <div className="levels-layout">
      <form className="panel levels-form" onSubmit={submit}>
        <div className="panel-heading"><div><h3>{editingId ? "Modifier un thème" : "Ajouter un thème"}</h3><p>Un thème regroupe plusieurs leçons d’une même discipline.</p></div></div>
        <div className="levels-fields">
          <label>Titre du thème<input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Titre affiché aux élèves" required /></label>
          <label>Position<input type="number" min="0" step="1" value={draft.position} onChange={e => setDraft(d => ({ ...d, position: e.target.value }))} required /><small>Les thèmes s’affichent du plus petit au plus grand numéro.</small></label>
        </div>
        <div className="levels-form-actions"><button className="primary" type="submit" disabled={saving || busy}><Save size={15} />{saving ? "Enregistrement…" : editingId ? "Enregistrer" : "Créer le thème"}</button>{editingId && <button className="secondary" type="button" onClick={reset} disabled={saving}><X size={15} /> Annuler</button>}</div>
      </form>
      <div className="panel levels-list">
        <div className="panel-heading"><div><h3>Thèmes de la discipline</h3><p>{themes.length} thème(s), {published} publié(s). Un thème en brouillon reste invisible pour les élèves.</p></div><span className="levels-count">{published} publiés</span></div>
        {themes.length === 0 ? <div className="empty-state"><p>Aucun thème : les leçons s’affichent sans regroupement.</p></div> : <div className="levels-items">{themes.map(theme => <article className={`level-card ${theme.status === "published" ? "" : "level-card-off"}`} key={theme.id}>
          <div className="level-order">{theme.position}</div>
          <div className="level-main"><div className="level-title"><strong>{theme.title}</strong><span className={`level-status ${theme.status === "published" ? "on" : "off"}`}>{theme.status === "published" ? "Publié" : "Brouillon"}</span></div><small>{countOf(theme.id)} leçon(s) rattachée(s)</small></div>
          <div className="level-actions">
            <button className="icon-button" type="button" title="Modifier" disabled={saving || busy} onClick={() => { setEditingId(theme.id); setDraft({ title: theme.title, position: String(theme.position) }); onNotice(""); }}><Edit3 size={15} /></button>
            <button className="icon-button" type="button" title={theme.status === "published" ? "Remettre en brouillon" : "Publier"} disabled={saving || busy} onClick={() => void toggle(theme)}>{theme.status === "published" ? <X size={15} /> : <Check size={15} />}</button>
            <button className="icon-button danger" type="button" title="Supprimer" disabled={saving || busy} onClick={() => void remove(theme)}><Trash2 size={15} /></button>
          </div>
        </article>)}</div>}
      </div>
    </div>

    <div className="panel">
      <div className="panel-heading"><div><h3>Rattacher les leçons</h3><p>Choisis le thème de chaque leçon. « Sans thème » la fait apparaître hors regroupement.</p></div><span className="levels-count">{chapters.filter(c => c.theme_id).length}/{chapters.length} rattachées</span></div>
      {chapters.length === 0 ? <div className="empty-state"><p>Cette discipline n’a pas encore de leçon.</p></div> : <div className="levels-items">{chapters.map(chapter => <article className="level-card" key={chapter.id}>
        <div className="level-order">{chapter.position}</div>
        <div className="level-main"><div className="level-title"><strong>{chapter.title}</strong><span className={`level-status ${chapter.status === "published" ? "on" : "off"}`}>{chapter.status === "published" ? "Publiée" : "Brouillon"}</span></div>
          <label>Thème<select value={chapter.theme_id ?? ""} disabled={saving || busy} onChange={e => void assign(chapter, e.target.value)}>
            <option value="">Sans thème</option>
            {themes.map(t => <option key={t.id} value={t.id}>{t.title}{t.status === "draft" ? " (brouillon)" : ""}</option>)}
          </select></label>
        </div>
      </article>)}</div>}
    </div>
  </div>;
}
