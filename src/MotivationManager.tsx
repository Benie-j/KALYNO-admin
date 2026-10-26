import { FormEvent, useCallback, useEffect, useState } from "react";
import { Check, Edit3, Save, Trash2, X } from "lucide-react";
import { supabase } from "./lib/supabase";

type LevelRef = { id: string; label: string; position: number; is_active: boolean };
type ExamRow = { level_id: string; exam_date: string; label: string | null };
type ExamDraft = { date: string; label: string };
type Quote = { id: string; content: string; author: string | null; level_id: string | null; position: number; is_active: boolean };
type QuoteDraft = { content: string; author: string; level_id: string; position: string; is_active: boolean };

const emptyQuote: QuoteDraft = { content: "", author: "", level_id: "", position: "0", is_active: true };
const errText = (e: unknown) => e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);
const daysLeft = (iso: string) => Math.round((new Date(iso + "T00:00:00").getTime() - new Date(new Date().toDateString()).getTime()) / 86400000);

type Props = { levels: LevelRef[]; busy: boolean; onNotice: (s: string) => void };

/* ---------- Date d’examen de chaque classe (compte à rebours de l’accueil élève) ---------- */
function ExamDates({ levels, busy, onNotice }: Props) {
  const [rows, setRows] = useState<Record<string, ExamRow>>({});
  const [drafts, setDrafts] = useState<Record<string, ExamDraft>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("exam_dates").select("level_id,exam_date,label");
    if (error) { onNotice("Échec : " + errText(error)); return; }
    const map: Record<string, ExamRow> = {};
    const next: Record<string, ExamDraft> = {};
    for (const r of (data ?? []) as ExamRow[]) {
      map[r.level_id] = r;
      next[r.level_id] = { date: r.exam_date, label: r.label ?? "" };
    }
    setRows(map);
    setDrafts(next);
  }, [onNotice]);

  useEffect(() => { void load(); }, [load]);

  const draftOf = (id: string): ExamDraft => drafts[id] ?? { date: "", label: "" };
  const setDraft = (id: string, patch: Partial<ExamDraft>) => setDrafts(d => ({ ...d, [id]: { ...draftOf(id), ...patch } }));

  async function save(levelId: string) {
    const d = draftOf(levelId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) { onNotice("Échec : choisis une date d’examen valide."); return; }
    setSaving(levelId); onNotice("");
    try {
      const values = { exam_date: d.date, label: d.label.trim() || null, updated_at: new Date().toISOString() };
      const result = rows[levelId]
        ? await supabase.from("exam_dates").update(values).eq("level_id", levelId)
        : await supabase.from("exam_dates").insert({ level_id: levelId, ...values });
      if (result.error) throw result.error;
      await load();
      onNotice("Date d’examen enregistrée. Elle apparaît dans l’app au prochain chargement de l’accueil.");
    } catch (e) { onNotice("Échec : " + errText(e)); } finally { setSaving(null); }
  }

  async function clear(levelId: string) {
    if (!window.confirm("Retirer la date d’examen de cette classe ? Le compte à rebours disparaîtra de l’accueil élève.")) return;
    setSaving(levelId); onNotice("");
    try {
      const { error } = await supabase.from("exam_dates").delete().eq("level_id", levelId);
      if (error) throw error;
      await load();
      onNotice("Date d’examen retirée.");
    } catch (e) { onNotice("Échec : " + errText(e)); } finally { setSaving(null); }
  }

  const sorted = [...levels].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  return <div className="panel">
    <div className="panel-heading"><div><h3>Dates d’examen</h3><p>Une date par classe. L’élève voit « J-N avant les épreuves » suivi de l’intitulé que tu écris ici.</p></div></div>
    {sorted.length === 0 ? <div className="empty-state"><p>Aucune classe configurée.</p></div> : <div className="levels-items">{sorted.map(level => {
      const d = draftOf(level.id);
      const row = rows[level.id];
      const left = row ? daysLeft(row.exam_date) : null;
      return <article className={`level-card ${level.is_active ? "" : "level-card-off"}`} key={level.id}>
        <div className="level-main">
          <div className="level-title"><strong>{level.label}</strong>{left !== null && <span className={`level-status ${left >= 0 ? "on" : "off"}`}>{left > 0 ? `J-${left}` : left === 0 ? "Jour J" : "Date passée"}</span>}</div>
          <div className="levels-two">
            <label>Date de l’examen<input type="date" value={d.date} onChange={e => setDraft(level.id, { date: e.target.value })} /></label>
            <label>Intitulé affiché<input value={d.label} onChange={e => setDraft(level.id, { label: e.target.value })} placeholder="Nom de l’examen" /></label>
          </div>
        </div>
        <div className="level-actions">
          <button className="icon-button" type="button" title="Enregistrer" disabled={saving !== null || busy} onClick={() => void save(level.id)}><Save size={15} /></button>
          {row && <button className="icon-button danger" type="button" title="Retirer la date" disabled={saving !== null || busy} onClick={() => void clear(level.id)}><Trash2 size={15} /></button>}
        </div>
      </article>;
    })}</div>}
  </div>;
}

/* ---------- Citation du jour (tourne chaque jour parmi les citations actives) ---------- */
function Quotes({ levels, busy, onNotice }: Props) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [draft, setDraft] = useState<QuoteDraft>(emptyQuote);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("daily_quotes").select("id,content,author,level_id,position,is_active").order("position", { ascending: true }).order("id", { ascending: true });
    if (error) { onNotice("Échec : " + errText(error)); return; }
    setQuotes((data ?? []) as Quote[]);
  }, [onNotice]);

  useEffect(() => { void load(); }, [load]);

  const levelLabel = (id: string | null) => id === null ? "Toutes les classes" : levels.find(x => x.id === id)?.label ?? id;
  function reset() { setEditingId(null); setDraft({ ...emptyQuote, position: String(quotes.length) }); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const content = draft.content.trim();
    const position = Number(draft.position);
    if (!content || !Number.isInteger(position) || position < 0) { onNotice("Échec : la citation et une position entière sont obligatoires."); return; }
    setSaving(true); onNotice("");
    try {
      const values = { content, author: draft.author.trim() || null, level_id: draft.level_id || null, position, is_active: draft.is_active };
      const result = editingId
        ? await supabase.from("daily_quotes").update(values).eq("id", editingId)
        : await supabase.from("daily_quotes").insert(values);
      if (result.error) throw result.error;
      await load(); reset();
      onNotice(editingId ? "Citation mise à jour." : "Citation ajoutée.");
    } catch (e) { onNotice("Échec : " + errText(e)); } finally { setSaving(false); }
  }

  async function toggle(q: Quote) {
    setSaving(true); onNotice("");
    try {
      const { error } = await supabase.from("daily_quotes").update({ is_active: !q.is_active }).eq("id", q.id);
      if (error) throw error;
      await load();
      onNotice(q.is_active ? "Citation désactivée." : "Citation activée.");
    } catch (e) { onNotice("Échec : " + errText(e)); } finally { setSaving(false); }
  }

  async function remove(q: Quote) {
    if (!window.confirm("Supprimer définitivement cette citation ?")) return;
    setSaving(true); onNotice("");
    try {
      const { error } = await supabase.from("daily_quotes").delete().eq("id", q.id);
      if (error) throw error;
      if (editingId === q.id) reset();
      await load();
      onNotice("Citation supprimée.");
    } catch (e) { onNotice("Échec : " + errText(e)); } finally { setSaving(false); }
  }

  const active = quotes.filter(q => q.is_active).length;
  return <div className="levels-layout">
    <form className="panel levels-form" onSubmit={submit}>
      <div className="panel-heading"><div><h3>{editingId ? "Modifier une citation" : "Ajouter une citation"}</h3><p>L’app affiche une citation par jour, dans l’ordre des positions, puis recommence.</p></div></div>
      <div className="levels-fields">
        <label>Citation<textarea rows={4} value={draft.content} onChange={e => setDraft(d => ({ ...d, content: e.target.value }))} placeholder="Texte de la citation ou du conseil" required /></label>
        <div className="levels-two">
          <label>Auteur<input value={draft.author} onChange={e => setDraft(d => ({ ...d, author: e.target.value }))} placeholder="Facultatif" /></label>
          <label>Position<input type="number" min="0" step="1" value={draft.position} onChange={e => setDraft(d => ({ ...d, position: e.target.value }))} required /></label>
        </div>
        <label>Visible pour<select value={draft.level_id} onChange={e => setDraft(d => ({ ...d, level_id: e.target.value }))}>
          <option value="">Toutes les classes</option>
          {levels.map(x => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select></label>
        <label className="levels-active"><input type="checkbox" checked={draft.is_active} onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))} /><span><strong>Active</strong><small>Une citation désactivée n’est plus proposée aux élèves.</small></span></label>
      </div>
      <div className="levels-form-actions"><button className="primary" type="submit" disabled={saving || busy}><Save size={15} />{saving ? "Enregistrement…" : editingId ? "Enregistrer" : "Ajouter la citation"}</button>{editingId && <button className="secondary" type="button" onClick={reset} disabled={saving}><X size={15} /> Annuler</button>}</div>
    </form>
    <div className="panel levels-list">
      <div className="panel-heading"><div><h3>Citations</h3><p>{quotes.length} citation(s) enregistrée(s)</p></div><span className="levels-count">{active} active(s)</span></div>
      {quotes.length === 0 ? <div className="empty-state"><p>Aucune citation pour l’instant : le bloc n’apparaît pas dans l’app.</p></div> : <div className="levels-items">{quotes.map(q => <article className={`level-card ${q.is_active ? "" : "level-card-off"}`} key={q.id}>
        <div className="level-order">{q.position}</div>
        <div className="level-main"><div className="level-title"><strong>{q.content.length > 90 ? q.content.slice(0, 90) + "…" : q.content}</strong><span className={`level-status ${q.is_active ? "on" : "off"}`}>{q.is_active ? "Active" : "Désactivée"}</span></div><small>{q.author ?? "Auteur non précisé"} · {levelLabel(q.level_id)}</small></div>
        <div className="level-actions">
          <button className="icon-button" type="button" title="Modifier" disabled={saving || busy} onClick={() => { setEditingId(q.id); setDraft({ content: q.content, author: q.author ?? "", level_id: q.level_id ?? "", position: String(q.position), is_active: q.is_active }); onNotice(""); }}><Edit3 size={15} /></button>
          <button className="icon-button" type="button" title={q.is_active ? "Désactiver" : "Activer"} disabled={saving || busy} onClick={() => void toggle(q)}>{q.is_active ? <X size={15} /> : <Check size={15} />}</button>
          <button className="icon-button danger" type="button" title="Supprimer" disabled={saving || busy} onClick={() => void remove(q)}><Trash2 size={15} /></button>
        </div>
      </article>)}</div>}
    </div>
  </div>;
}

export default function MotivationManager(props: Props) {
  return <div style={{ display: "grid", gap: 18 }}><ExamDates {...props} /><Quotes {...props} /></div>;
}
