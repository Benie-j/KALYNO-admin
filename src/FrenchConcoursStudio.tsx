import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpen, Check, ChevronDown, ClipboardList, FilePlus2, RefreshCw, Save, Search, ShieldCheck } from "lucide-react";
import { listExamDrafts, createExamDraft, updateExamDraft } from "./lib/platformApi";
import "./FrenchConcoursStudio.css";

type Track = "cafop" | "police" | "fonction_publique" | "ena" | "injs";
type ContentType = "course" | "exercise" | "dictation" | "mock_exam";
type Status = "draft" | "review" | "approved" | "archived";
type Draft = {
  id: string; exam_track: Track; content_type: ContentType; title: string; objective: string | null;
  difficulty: "foundation" | "intermediate" | "advanced"; estimated_minutes: number | null;
  content: Record<string, unknown>; source_note: string | null; status: Status; origin: "chatgpt" | "admin";
  created_at: string; updated_at: string;
};

const TRACKS: { value: Track; label: string }[] = [
  { value: "cafop", label: "CAFOP" }, { value: "police", label: "Police nationale" },
  { value: "fonction_publique", label: "Fonction publique" }, { value: "ena", label: "ENA" }, { value: "injs", label: "INJS" }
];
const TYPES: { value: ContentType; label: string }[] = [
  { value: "course", label: "Cours" }, { value: "exercise", label: "Exercices" },
  { value: "dictation", label: "Dictée" }, { value: "mock_exam", label: "Sujet blanc" }
];
const STATUS: { value: Status; label: string }[] = [
  { value: "draft", label: "Brouillon" }, { value: "review", label: "À vérifier" },
  { value: "approved", label: "Validé" }, { value: "archived", label: "Archivé" }
];
const blankContent = (type: ContentType): Record<string, unknown> => type === "course"
  ? { sections: [{ heading: "Notion", body: "", examples: [], key_points: [], pitfalls: [] }], sources: [] }
  : { instructions: "", questions: [{ prompt: "", kind: "open", choices: [], expected_answer: "", explanation: "", points: 1, rubric: [] }], sources: [] };
const errorMessage = (e: unknown) => e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);

export default function FrenchConcoursStudio() {
  const [rows, setRows] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [track, setTrack] = useState<Track | "all">("all");
  const [kind, setKind] = useState<ContentType | "all">("all");
  const [status, setStatus] = useState<Status | "all">("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ exam_track: "cafop" as Track, content_type: "course" as ContentType, title: "", objective: "", difficulty: "foundation" as Draft["difficulty"], estimated_minutes: "20", source_note: "", contentText: JSON.stringify(blankContent("course"), null, 2) });

  const load = useCallback(async () => {
    setLoading(true); setNotice("");
    try {
      const list = await listExamDrafts(250);
      setRows(list);
      setSelected(current => list.some(x => x.id === current) ? current : (list[0]?.id ?? ""));
    } catch (error) {
      setNotice(`Chargement impossible : ${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => rows.filter(x =>
    (track === "all" || x.exam_track === track) && (kind === "all" || x.content_type === kind) &&
    (status === "all" || x.status === status) && `${x.title} ${x.objective ?? ""}`.toLowerCase().includes(query.toLowerCase())
  ), [rows, track, kind, status, query]);
  const current = rows.find(x => x.id === selected) ?? null;

  function startCreate(type: ContentType = "course") {
    setSelected(""); setCreating(true); setEdit(true);
    setForm(f => ({ ...f, content_type: type, title: "", objective: "", source_note: "", contentText: JSON.stringify(blankContent(type), null, 2) }));
  }
  function startEdit(row: Draft) {
    setCreating(false); setSelected(row.id); setEdit(true);
    setForm({ exam_track: row.exam_track, content_type: row.content_type, title: row.title, objective: row.objective ?? "", difficulty: row.difficulty, estimated_minutes: String(row.estimated_minutes ?? 20), source_note: row.source_note ?? "", contentText: JSON.stringify(row.content, null, 2) });
  }
  async function saveDraft() {
    if (!form.title.trim()) { setNotice("Le titre est obligatoire."); return; }
    let content: Record<string, unknown>;
    try { content = JSON.parse(form.contentText); if (!content || Array.isArray(content) || typeof content !== "object") throw new Error("Le contenu doit être un objet JSON."); }
    catch (e) { setNotice(`JSON invalide : ${errorMessage(e)}`); return; }
    const minutes = Number(form.estimated_minutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) { setNotice("La durée doit être un nombre entier entre 1 et 600 minutes."); return; }
    setSaving(true); setNotice("");
    const payload = { exam_track: form.exam_track, content_type: form.content_type, title: form.title.trim(), objective: form.objective.trim() || null, difficulty: form.difficulty, estimated_minutes: minutes, source_note: form.source_note.trim() || null, content, origin: "admin" };
    try {
      const saved = creating ? await createExamDraft(payload) : await updateExamDraft(selected, payload);
      setNotice(creating ? "Brouillon créé." : "Brouillon mis à jour.");
      setCreating(false); setEdit(false); await load();
      if (saved?.id) setSelected(saved.id);
    } catch (error) {
      setNotice(`Enregistrement impossible : ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }
  async function changeStatus(row: Draft, next: Status) {
    if (next === "approved" && !window.confirm("Confirmer la validation pédagogique de ce contenu ? Cela ne le publie pas aux élèves.")) return;
    setSaving(true); setNotice("");
    try {
      await updateExamDraft(row.id, { status: next });
      setNotice("Statut mis à jour. Aucune publication élève n'a été effectuée.");
      await load();
    } catch (error) {
      setNotice(`Changement de statut impossible : ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  }

  return <section className="page fcs-page">
    <div className="page-intro fcs-intro"><div><div className="eyebrow">STUDIO PÉDAGOGIQUE · FRANÇAIS</div><h2>Préparation aux concours</h2><p>Compose, relis et valide les cours et exercices de français destinés aux concours ivoiriens.</p></div><button className="secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Actualiser</button></div>
    <div className="fcs-scope"><ShieldCheck size={18}/><span>Les contenus restent des brouillons internes. « Validé » signifie validation pédagogique, pas publication aux élèves. Toute référence à une annale officielle doit être vérifiée.</span></div>
    {notice && <div className={`fcs-notice ${notice.includes("impossible") || notice.includes("invalide") || notice.includes("obligatoire") ? "is-error" : ""}`}><AlertCircle size={16}/>{notice}</div>}
    <div className="fcs-toolbar">
      <label><span>Concours</span><select value={track} onChange={e => setTrack(e.target.value as typeof track)}><option value="all">Tous les concours</option>{TRACKS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      <label><span>Contenu</span><select value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="all">Tous</option>{TYPES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      <label><span>Statut</span><select value={status} onChange={e => setStatus(e.target.value as typeof status)}><option value="all">Tous</option>{STATUS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
      <label className="fcs-search"><span>Recherche</span><div><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Titre ou objectif…"/></div></label>
    </div>
    <div className="fcs-actions"><div><strong>{filtered.length}</strong> contenu(s) correspondant(s)</div><div className="fcs-buttons"><button className="secondary" onClick={() => startCreate("course")}><BookOpen size={15}/> Nouveau cours</button><button className="primary" onClick={() => startCreate("exercise")}><FilePlus2 size={15}/> Nouvel exercice</button></div></div>
    <div className="fcs-layout">
      <div className="fcs-list panel">{loading ? <div className="fcs-empty">Chargement des contenus…</div> : filtered.length === 0 ? <div className="fcs-empty">Aucun contenu pour ces filtres. Crée un premier cours ou exercice.</div> : filtered.map(row => <button key={row.id} className={`fcs-row ${selected === row.id && !creating ? "active" : ""}`} onClick={() => { setSelected(row.id); setCreating(false); setEdit(false); }}><span className="fcs-row-icon">{row.content_type === "course" ? <BookOpen size={17}/> : <ClipboardList size={17}/>}</span><span className="fcs-row-main"><strong>{row.title}</strong><small>{TRACKS.find(x => x.value === row.exam_track)?.label} · {TYPES.find(x => x.value === row.content_type)?.label}</small><small>{new Date(row.updated_at).toLocaleString("fr-FR")}</small></span><span className={`fcs-status status-${row.status}`}>{STATUS.find(x => x.value === row.status)?.label}</span></button>)}</div>
      <div className="fcs-detail panel">
        {(creating || (edit && current)) ? <>
          <div className="fcs-detail-head"><div><span className="eyebrow">{creating ? "NOUVEAU CONTENU" : "MODIFICATION"}</span><h3>{creating ? "Composer un contenu" : "Modifier le brouillon"}</h3></div><button className="secondary" onClick={() => { setEdit(false); setCreating(false); }}>Annuler</button></div>
          <div className="fcs-form-grid">
            <label>Concours<select value={form.exam_track} onChange={e => setForm(f => ({ ...f, exam_track: e.target.value as Track }))}>{TRACKS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
            <label>Type<select value={form.content_type} onChange={e => { const t = e.target.value as ContentType; setForm(f => ({ ...f, content_type: t, contentText: JSON.stringify(blankContent(t), null, 2) })); }}>{TYPES.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
            <label className="fcs-wide">Titre<input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} maxLength={180} placeholder="Ex. : Les accords du participe passé"/></label>
            <label className="fcs-wide">Objectif pédagogique<textarea rows={2} value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} placeholder="Ce que le candidat doit maîtriser…"/></label>
            <label>Difficulté<select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as Draft["difficulty"] }))}><option value="foundation">Fondamentale</option><option value="intermediate">Intermédiaire</option><option value="advanced">Avancée</option></select></label>
            <label>Durée estimée (min)<input type="number" min="1" max="600" value={form.estimated_minutes} onChange={e => setForm(f => ({ ...f, estimated_minutes: e.target.value }))}/></label>
            <label className="fcs-wide">Source / note de vérification<input value={form.source_note} onChange={e => setForm(f => ({ ...f, source_note: e.target.value }))} placeholder="Manuel, référence, page… ou préciser : contenu original"/></label>
            <label className="fcs-wide">Contenu structuré (JSON)<textarea className="fcs-json" spellCheck={false} rows={18} value={form.contentText} onChange={e => setForm(f => ({ ...f, contentText: e.target.value }))}/><small>Le contenu doit être un objet JSON. Le modèle initial est fourni selon le type sélectionné.</small></label>
          </div>
          <div className="fcs-form-actions"><button className="primary" disabled={saving} onClick={() => void saveDraft()}><Save size={16}/>{saving ? "Enregistrement…" : "Enregistrer le brouillon"}</button></div>
        </> : current ? <>
          <div className="fcs-detail-head"><div><span className="eyebrow">{TRACKS.find(x => x.value === current.exam_track)?.label} · {TYPES.find(x => x.value === current.content_type)?.label}</span><h3>{current.title}</h3></div><button className="secondary" onClick={() => startEdit(current)}>Modifier</button></div>
          <div className="fcs-meta"><span className={`fcs-status status-${current.status}`}>{STATUS.find(x => x.value === current.status)?.label}</span><span>{current.difficulty === "foundation" ? "Fondamentale" : current.difficulty === "intermediate" ? "Intermédiaire" : "Avancée"}</span><span>{current.estimated_minutes ?? "—"} min</span><span>Origine : {current.origin === "chatgpt" ? "ChatGPT" : "Admin"}</span></div>
          {current.objective && <div className="fcs-objective"><strong>Objectif</strong><p>{current.objective}</p></div>}
          {current.source_note && <div className="fcs-objective"><strong>Source / vérification</strong><p>{current.source_note}</p></div>}
          <div className="fcs-content-head"><strong>Aperçu des données</strong><button className="secondary" onClick={() => void navigator.clipboard?.writeText(JSON.stringify(current.content, null, 2))}>Copier le JSON</button></div>
          <pre className="fcs-preview">{JSON.stringify(current.content, null, 2)}</pre>
          <div className="fcs-status-actions"><label>Changer le statut<select disabled={saving} value={current.status} onChange={e => void changeStatus(current, e.target.value as Status)}>{STATUS.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label><small>La validation n’entraîne aucune publication dans l’application élève.</small></div>
        </> : <div className="fcs-empty fcs-empty-detail"><BookOpen size={28}/><strong>Sélectionne un contenu</strong><span>ou crée un cours ou un exercice pour commencer.</span></div>}
      </div>
    </div>
  </section>;
}
