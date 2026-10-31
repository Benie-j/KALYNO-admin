import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, Check, Copy, Eye, Flag, RefreshCw, RotateCcw, Search, Settings, X } from "lucide-react";
import { supabase } from "./lib/supabase";

type SourceType = "LESSON" | "EXERCISE" | "SETTINGS";
type Status = "PENDING" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
type Report = {
  id: string;
  user_id: string;
  source_type: SourceType;
  source_id: string | null;
  category: string;
  description: string;
  context_label: string | null;
  status: Status;
  created_at: string;
};

const PAGE_LIMIT = 500;
const errText = (e: unknown) => e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);

const STATUS_LABEL: Record<Status, string> = { PENDING: "À traiter", IN_REVIEW: "En cours", RESOLVED: "Résolu", REJECTED: "Rejeté" };
const SOURCE_LABEL: Record<SourceType, string> = { LESSON: "Leçon", EXERCISE: "Exercice", SETTINGS: "Paramètres" };
// Mêmes codes que l’enum ReportCategory de l’application Android.
const CATEGORY_LABEL: Record<string, string> = {
  TYPO: "Erreur de frappe / orthographe",
  UNCLEAR_EXPLANATION: "Explication peu claire",
  OTHER: "Autre",
  WRONG_OFFICIAL_ANSWER: "Réponse officielle fausse",
  SEMANTIC_GRADING: "Problème de correction sémantique (E5)",
  AMBIGUOUS_STATEMENT: "Énoncé ambigu",
  APP_BUG: "Bug de l’application",
  SYNC_PROBLEM: "Problème de synchronisation"
};

type Props = { busy: boolean; onNotice: (s: string) => void; onChanged?: () => void };

export default function ReportsManager({ busy, onNotice, onChanged }: Props) {
  const [rows, setRows] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "ALL" | Status>("OPEN");
  const [sourceFilter, setSourceFilter] = useState<"ALL" | SourceType>("ALL");
  const [text, setText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reports")
      .select("id,user_id,source_type,source_id,category,description,context_label,status,created_at")
      .order("created_at", { ascending: false })
      .limit(PAGE_LIMIT);
    setLoading(false);
    if (error) { onNotice("Échec : " + errText(error) + " — le script 20261031_signalements.sql est-il passé dans Supabase ?"); return; }
    setRows((data ?? []) as Report[]);
  }, [onNotice]);

  useEffect(() => { void load(); }, [load]);

  async function setStatus(report: Report, status: Status) {
    setSavingId(report.id); onNotice("");
    try {
      // Aucun signalement n’est supprimé : on le clôture (RESOLVED / REJECTED) ou on le rouvre.
      const { error } = await supabase.from("reports").update({ status }).eq("id", report.id);
      if (error) throw error;
      setRows(list => list.map(r => r.id === report.id ? { ...r, status } : r));
      onChanged?.();
    } catch (e) { onNotice("Échec : " + errText(e)); } finally { setSavingId(null); }
  }

  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); onNotice("Identifiant copié."); }
    catch { onNotice("Échec : copie impossible, sélectionne l’identifiant à la main."); }
  }

  const counts = useMemo(() => {
    const c: Record<Status, number> = { PENDING: 0, IN_REVIEW: 0, RESOLVED: 0, REJECTED: 0 };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = text.trim().toLowerCase();
    return rows.filter(r => {
      if (statusFilter === "OPEN" && r.status !== "PENDING" && r.status !== "IN_REVIEW") return false;
      if (statusFilter !== "OPEN" && statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (sourceFilter !== "ALL" && r.source_type !== sourceFilter) return false;
      if (!q) return true;
      return [r.description, r.context_label ?? "", r.source_id ?? "", CATEGORY_LABEL[r.category] ?? r.category]
        .some(v => v.toLowerCase().includes(q));
    });
  }, [rows, statusFilter, sourceFilter, text]);

  const SourceIcon = ({ type }: { type: SourceType }) =>
    type === "LESSON" ? <BookOpen size={13} /> : type === "SETTINGS" ? <Settings size={13} /> : <Flag size={13} />;

  return <div className="panel">
    <div className="panel-heading">
      <div><h3>Signalements des élèves</h3><p>Erreurs signalées depuis les leçons, les exercices et les paramètres. Rien n’est supprimé : un signalement se clôture.</p></div>
      <button className="secondary" type="button" onClick={() => void load()} disabled={loading || busy}><RefreshCw size={15} /> Actualiser</button>
    </div>

    <div className="rep-counts">
      {(Object.keys(STATUS_LABEL) as Status[]).map(s =>
        <button key={s} type="button" className={`rep-count ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(statusFilter === s ? "OPEN" : s)}>
          <b>{counts[s]}</b><span>{STATUS_LABEL[s]}</span>
        </button>)}
    </div>

    <div className="rep-filters">
      <div className="list-search rep-search"><Search size={16} /><input value={text} onChange={e => setText(e.target.value)} placeholder="Chercher dans le contexte, la description, l’identifiant…" /></div>
      <label>Statut
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="OPEN">À traiter + en cours</option>
          <option value="ALL">Tous</option>
          {(Object.keys(STATUS_LABEL) as Status[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </label>
      <label>Origine
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as typeof sourceFilter)}>
          <option value="ALL">Toutes</option>
          {(Object.keys(SOURCE_LABEL) as SourceType[]).map(s => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
        </select>
      </label>
    </div>

    {loading ? <div className="empty-state"><p>Chargement…</p></div>
      : visible.length === 0 ? <div className="empty-state"><p>{rows.length === 0 ? "Aucun signalement reçu pour le moment." : "Aucun signalement ne correspond à ces filtres."}</p></div>
      : <div className="rep-list">{visible.map(r => {
        const closed = r.status === "RESOLVED" || r.status === "REJECTED";
        const disabled = savingId !== null || busy;
        return <article className={`rep-card rep-${r.status.toLowerCase()}`} key={r.id}>
          <div className="rep-top">
            <span className="kind-pill rep-source"><SourceIcon type={r.source_type} /> {SOURCE_LABEL[r.source_type] ?? r.source_type}</span>
            <strong className="rep-category">{CATEGORY_LABEL[r.category] ?? r.category}</strong>
            <span className={`rep-status rep-status-${r.status.toLowerCase()}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
          </div>
          <div className="rep-context">{r.context_label ?? "Contexte non renseigné"}</div>
          {r.description ? <p className="rep-description">{r.description}</p> : <p className="rep-description rep-empty">Aucune description ajoutée.</p>}
          <div className="rep-meta">
            <span>{new Date(r.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
            <span title={r.user_id}>Élève {r.user_id.slice(0, 8)}</span>
            {r.source_id && <button type="button" className="rep-copy" title="Copier l’identifiant de l’élément signalé" onClick={() => void copy(r.source_id!)}><Copy size={12} /> {r.source_id.slice(0, 8)}</button>}
          </div>
          <div className="rep-actions">
            {r.status === "PENDING" && <button className="secondary" type="button" disabled={disabled} onClick={() => void setStatus(r, "IN_REVIEW")}><Eye size={14} /> Prendre en charge</button>}
            {!closed && <button className="small-primary" type="button" disabled={disabled} onClick={() => void setStatus(r, "RESOLVED")}><Check size={14} /> Résolu</button>}
            {!closed && <button className="secondary" type="button" disabled={disabled} onClick={() => void setStatus(r, "REJECTED")}><X size={14} /> Rejeter</button>}
            {(closed || r.status === "IN_REVIEW") && <button className="secondary" type="button" disabled={disabled} onClick={() => void setStatus(r, "PENDING")}><RotateCcw size={14} /> Rouvrir</button>}
          </div>
        </article>;
      })}</div>}
    {rows.length >= PAGE_LIMIT && <div className="rep-foot">Les {PAGE_LIMIT} signalements les plus récents sont affichés.</div>}
  </div>;
}
