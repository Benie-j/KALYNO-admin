import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, Cloud, FilePlus2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import {
  createExamDraft, getPlatformCapabilities, getPlatformHealth, getPlatformTracks,
  listExamDrafts, updateExamDraft, type ExamDraft, type PlatformCapabilities, type PlatformHealth, type PlatformTrack
} from "./lib/platformApi";
import "./PlatformApiManager.css";

type Status = ExamDraft["status"];
const STATUS: { value: Status; label: string }[] = [
  { value: "draft", label: "Brouillon" }, { value: "review", label: "À vérifier" },
  { value: "approved", label: "Validé" }, { value: "archived", label: "Archivé" }
];
const TYPES = [
  { value: "course", label: "Cours" }, { value: "exercise", label: "Exercice" },
  { value: "dictation", label: "Dictée" }, { value: "mock_exam", label: "Sujet blanc" }
] as const;
const blankContent = (type: string): Record<string, unknown> => type === "course"
  ? { sections: [{ heading: "Notion", body: "", examples: [], key_points: [], pitfalls: [] }], sources: [] }
  : { instructions: "", questions: [{ prompt: "", kind: "open", choices: [], expected_answer: "", explanation: "", points: 1, rubric: [] }], sources: [] };
const messageOf = (error: unknown) => error instanceof Error ? error.message : String(error);

export default function PlatformApiManager() {
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(null);
  const [tracks, setTracks] = useState<PlatformTrack[]>([]);
  const [rows, setRows] = useState<ExamDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    exam_track: "cafop", content_type: "course", title: "", objective: "",
    difficulty: "foundation" as ExamDraft["difficulty"], estimated_minutes: "20",
    source_note: "", contentText: JSON.stringify(blankContent("course"), null, 2)
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setNotice("");
    const [h, c, t, d] = await Promise.allSettled([
      getPlatformHealth(), getPlatformCapabilities(), getPlatformTracks(), listExamDrafts(100)
    ]);
    const errors: string[] = [];
    if (h.status === "fulfilled") setHealth(h.value); else { setHealth(null); errors.push(`Santé : ${messageOf(h.reason)}`); }
    if (c.status === "fulfilled") setCapabilities(c.value); else { setCapabilities(null); errors.push(`Capacités : ${messageOf(c.reason)}`); }
    if (t.status === "fulfilled") setTracks(t.value); else { setTracks([]); errors.push(`Concours : ${messageOf(t.reason)}`); }
    if (d.status === "fulfilled") {
      setRows(d.value);
      setSelected(current => d.value.some(x => x.id === current) ? current : (d.value[0]?.id ?? ""));
    } else errors.push(`Brouillons : ${messageOf(d.reason)}`);
    if (errors.length) setNotice(errors.join(" · "));
    setLoading(false);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const filtered = useMemo(() => rows.filter(row =>
    (trackFilter === "all" || row.exam_track === trackFilter) &&
    (statusFilter === "all" || row.status === statusFilter) &&
    `${row.title} ${row.objective ?? ""}`.toLowerCase().includes(query.toLowerCase())
  ), [rows, trackFilter, statusFilter, query]);
  const current = rows.find(row => row.id === selected) ?? null;

  function beginCreate() {
    setSelected(""); setCreating(true); setEditing(true);
    setForm({ exam_track: tracks[0]?.code ?? "cafop", content_type: "course", title: "", objective: "",
      difficulty: "foundation", estimated_minutes: "20", source_note: "",
      contentText: JSON.stringify(blankContent("course"), null, 2) });
  }
  function beginEdit(row: ExamDraft) {
    setSelected(row.id); setCreating(false); setEditing(true);
    setForm({ exam_track: row.exam_track, content_type: row.content_type, title: row.title,
      objective: row.objective ?? "", difficulty: row.difficulty,
      estimated_minutes: String(row.estimated_minutes ?? 20), source_note: row.source_note ?? "",
      contentText: JSON.stringify(row.content, null, 2) });
  }
  async function save() {
    if (form.title.trim().length < 3) { setNotice("Le titre doit contenir au moins 3 caractères."); return; }
    const minutes = Number(form.estimated_minutes);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) { setNotice("La durée doit être comprise entre 1 et 600 minutes."); return; }
    let content: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(form.contentText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Le contenu doit être un objet JSON.");
      content = parsed as Record<string, unknown>;
    } catch (error) { setNotice(`JSON invalide : ${messageOf(error)}`); return; }
    setSaving(true); setNotice("");
    const payload = { exam_track: form.exam_track, content_type: form.content_type, title: form.title.trim(),
      objective: form.objective.trim() || null, difficulty: form.difficulty, estimated_minutes: minutes,
      source_note: form.source_note.trim() || null, content };
    try {
      const saved = creating ? await createExamDraft(payload) : await updateExamDraft(selected, payload);
      setNotice(creating ? "Brouillon créé." : "Brouillon enregistré.");
      setCreating(false); setEditing(false); await refresh();
      if (saved?.id) setSelected(saved.id);
    } catch (error) { setNotice(`Enregistrement impossible : ${messageOf(error)}`); }
    finally { setSaving(false); }
  }
  async function setStatus(row: ExamDraft, status: Status) {
    if (status === "approved" && !window.confirm("Valider pédagogiquement ce contenu ? Cela ne le publie pas aux élèves.")) return;
    setSaving(true); setNotice("");
    try { await updateExamDraft(row.id, { status }); setNotice("Statut mis à jour."); await refresh(); }
    catch (error) { setNotice(`Mise à jour impossible : ${messageOf(error)}`); }
    finally { setSaving(false); }
  }

  return <section className="page pam-page">
    <div className="page-intro pam-intro">
      <div><div className="eyebrow">INFRASTRUCTURE · API V1</div><h2>Platform API</h2>
        <p>Supervision de l’API, découverte des capacités et gestion des brouillons pédagogiques via les routes REST authentifiées.</p></div>
      <button className="secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={16}/> Actualiser</button>
    </div>
    <div className="pam-safety"><ShieldCheck size={18}/><span>Accès administrateur uniquement. Le navigateur utilise la session Supabase et la clé publique ; aucune clé service_role n’est exposée. La validation d’un contenu ne le publie pas aux élèves.</span></div>
    {notice && <div className="pam-notice"><AlertCircle size={16}/><span>{notice}</span></div>}
    <div className="pam-health-grid">
      <article className="panel pam-health"><span className="pam-icon"><Activity size={18}/></span><div><small>État du service</small><strong>{health?.status ?? (loading ? "Vérification…" : "Indisponible")}</strong><span>{health ? `Version ${health.version}` : "Route /v1/health"}</span></div><b className={health?.status === "ready" ? "pam-ok" : "pam-muted"}>{health?.status === "ready" ? "Opérationnel" : "À vérifier"}</b></article>
      <article className="panel pam-health"><span className="pam-icon"><Cloud size={18}/></span><div><small>Modules déclarés</small><strong>{capabilities?.modules?.length ?? "—"}</strong><span>{capabilities?.api_version ?? "Route /v1/capabilities"}</span></div><b>{capabilities ? "Connecté" : "À vérifier"}</b></article>
      <article className="panel pam-health"><span className="pam-icon"><CheckCircle2 size={18}/></span><div><small>Concours disponibles</small><strong>{tracks.length || "—"}</strong><span>Route /v1/exam-tracks</span></div><b>{tracks.length ? "Chargé" : "À vérifier"}</b></article>
    </div>
    <div className="pam-section-head"><div><div className="eyebrow">RESSOURCES REST</div><h3>Brouillons pédagogiques</h3><p>{rows.length} élément(s) chargé(s), limite API : 100 par requête.</p></div><button className="primary" onClick={beginCreate}><FilePlus2 size={16}/> Nouveau brouillon</button></div>
    <div className="pam-filters">
      <label>Concours<select value={trackFilter} onChange={e => setTrackFilter(e.target.value)}><option value="all">Tous</option>{tracks.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}</select></label>
      <label>Statut<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">Tous</option>{STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
      <label className="pam-search"><span>Recherche</span><div><Search size={15}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Titre ou objectif…"/></div></label>
    </div>
    <div className="pam-layout">
      <div className="panel pam-list">
        {loading ? <div className="pam-empty">Chargement des données…</div> : filtered.length === 0 ? <div className="pam-empty">Aucun brouillon ne correspond aux filtres.</div> : filtered.map(row =>
          <button key={row.id} className={`pam-row ${selected === row.id && !creating ? "active" : ""}`} onClick={() => { setSelected(row.id); setCreating(false); setEditing(false); }}>
            <span className="pam-row-main"><strong>{row.title}</strong><small>{tracks.find(t => t.code === row.exam_track)?.label ?? row.exam_track} · {row.content_type}</small><small>Modifié le {new Date(row.updated_at).toLocaleString("fr-FR")}</small></span>
            <span className={`pam-status pam-${row.status}`}>{STATUS.find(s => s.value === row.status)?.label ?? row.status}</span>
          </button>)}
      </div>
      <div className="panel pam-detail">
        {editing ? <>
          <div className="pam-detail-head"><div><span className="eyebrow">{creating ? "CRÉATION" : "MODIFICATION"}</span><h3>{creating ? "Nouveau brouillon" : "Modifier le contenu"}</h3></div><button className="secondary" onClick={() => { setEditing(false); setCreating(false); }}>Annuler</button></div>
          <div className="pam-form">
            <label>Concours<select value={form.exam_track} onChange={e => setForm(f => ({ ...f, exam_track: e.target.value }))}>{tracks.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}</select></label>
            <label>Type<select value={form.content_type} onChange={e => { const content_type = e.target.value; setForm(f => ({ ...f, content_type, contentText: JSON.stringify(blankContent(content_type), null, 2) })); }}>{TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
            <label className="pam-wide">Titre<input maxLength={180} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}/></label>
            <label className="pam-wide">Objectif<textarea rows={2} value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}/></label>
            <label>Difficulté<select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as ExamDraft["difficulty"] }))}><option value="foundation">Fondamentale</option><option value="intermediate">Intermédiaire</option><option value="advanced">Avancée</option></select></label>
            <label>Durée (minutes)<input type="number" min="1" max="600" value={form.estimated_minutes} onChange={e => setForm(f => ({ ...f, estimated_minutes: e.target.value }))}/></label>
            <label className="pam-wide">Source / référence<input value={form.source_note} onChange={e => setForm(f => ({ ...f, source_note: e.target.value }))}/></label>
            <label className="pam-wide">Contenu JSON<textarea className="pam-json" spellCheck={false} rows={16} value={form.contentText} onChange={e => setForm(f => ({ ...f, contentText: e.target.value }))}/></label>
          </div>
          <div className="pam-form-actions"><button className="primary" disabled={saving} onClick={() => void save()}><ShieldCheck size={15}/>{saving ? "Enregistrement…" : "Enregistrer en brouillon"}</button></div>
        </> : current ? <>
          <div className="pam-detail-head"><div><span className="eyebrow">FICHE CONTENU</span><h3>{current.title}</h3></div><button className="secondary" onClick={() => beginEdit(current)}>Modifier</button></div>
          <div className="pam-meta">{tracks.find(t => t.code === current.exam_track)?.label ?? current.exam_track} · {current.content_type} · {current.difficulty} · {current.estimated_minutes ?? "—"} min</div>
          {current.objective && <div className="pam-objective"><strong>Objectif</strong><p>{current.objective}</p></div>}
          <pre className="pam-preview">{JSON.stringify(current.content, null, 2)}</pre>
          <div className="pam-status-actions"><label>Statut<select disabled={saving} value={current.status} onChange={e => void setStatus(current, e.target.value as Status)}>{STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label><small>La validation reste interne et ne déclenche aucune publication.</small></div>
        </> : <div className="pam-empty pam-empty-detail"><Cloud size={26}/><strong>Sélectionne un brouillon</strong><span>ou crée un nouveau contenu pour tester les opérations de l’API.</span></div>}
      </div>
    </div>
    <details className="pam-docs"><summary>Documentation rapide des routes</summary><div><code>GET /v1/health</code><code>GET /v1/capabilities</code><code>GET /v1/exam-tracks</code><code>GET /v1/studio/drafts?limit=100</code><code>POST /v1/studio/drafts</code><code>GET /v1/studio/drafts/:id</code><code>PATCH /v1/studio/drafts/:id</code></div><p>Chaque requête nécessite un jeton Bearer d’une session administrateur KALYNO. La suppression n’est volontairement pas proposée dans cette interface.</p></details>
  </section>;
}
