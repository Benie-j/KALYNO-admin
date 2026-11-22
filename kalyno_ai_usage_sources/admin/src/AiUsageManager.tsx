import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, RefreshCw } from "lucide-react";
import { supabase } from "./lib/supabase";
import "./ai-usage.css";

type UsageRow = {
  id: string; request_id: string; user_id: string | null; provider: string; model: string;
  action: "grade" | "assist"; input_tokens: number | null; output_tokens: number | null;
  thoughts_tokens: number | null; cached_tokens: number | null; tool_input_tokens: number | null;
  total_tokens: number | null; usage_available: boolean; status: "success" | "error";
  error_code: string | null; duration_ms: number | null; created_at: string;
};
type Period = "7" | "30" | "90" | "all";
type ActionFilter = "all" | "grade" | "assist";
const fmt = (n: number | null | undefined) => n == null ? "—" : n.toLocaleString("fr-FR");
const fmtDate = (s: string) => new Date(s).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

export default function AiUsageManager() {
  const [rows, setRows] = useState<UsageRow[]>([]);
  const [period, setPeriod] = useState<Period>("30");
  const [action, setAction] = useState<ActionFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      let query = supabase.from("ai_usage_logs")
        .select("id,request_id,user_id,provider,model,action,input_tokens,output_tokens,thoughts_tokens,cached_tokens,tool_input_tokens,total_tokens,usage_available,status,error_code,duration_ms,created_at")
        .order("created_at", { ascending: false }).limit(1000);
      if (period !== "all") query = query.gte("created_at", new Date(Date.now() - Number(period) * 86400000).toISOString());
      if (action !== "all") query = query.eq("action", action);
      const { data, error: queryError } = await query;
      if (queryError) throw queryError;
      setRows((data ?? []) as UsageRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e)); setRows([]);
    } finally { setLoading(false); }
  }, [period, action]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => rows.reduce((a, r) => {
    a.requests++; a.input += r.input_tokens ?? 0; a.output += r.output_tokens ?? 0;
    a.thoughts += r.thoughts_tokens ?? 0; a.total += r.total_tokens ?? 0;
    if (r.action === "grade") a.corrections++;
    if (r.status === "error") a.errors++;
    if (!r.usage_available) a.unmeasured++;
    return a;
  }, { requests: 0, corrections: 0, input: 0, output: 0, thoughts: 0, total: 0, errors: 0, unmeasured: 0 }), [rows]);

  return <section className="page aiu-page">
    <div className="page-intro">
      <div><div className="eyebrow">PILOTAGE DES MODÈLES</div><h2>Consommation IA</h2>
        <p>Tokens réellement déclarés par Gemini, requête par requête. Corrections et assistant sont séparés.</p></div>
      <button className="secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={16}/> Actualiser</button>
    </div>

    <div className="aiu-toolbar">
      <div className="aiu-filters">
        {([{value:"7",label:"7 jours"},{value:"30",label:"30 jours"},{value:"90",label:"90 jours"},{value:"all",label:"Tout"}] as const).map(x =>
          <button key={x.value} className={period === x.value ? "active" : ""} onClick={() => setPeriod(x.value)}>{x.label}</button>)}
      </div>
      <label className="aiu-select-label">Type de requête
        <select value={action} onChange={e => setAction(e.target.value as ActionFilter)}>
          <option value="all">Toutes</option><option value="grade">Corrections uniquement</option><option value="assist">Assistant uniquement</option>
        </select>
      </label>
    </div>

    {error && <div className="aiu-error"><AlertCircle size={17}/>{error}</div>}

    <div className="aiu-stats">
      <article className="aiu-stat"><span>Requêtes enregistrées</span><strong>{fmt(totals.requests)}</strong><small>{fmt(totals.corrections)} corrections</small></article>
      <article className="aiu-stat"><span>Tokens entrants</span><strong>{fmt(totals.input)}</strong><small>Moyenne : {fmt(totals.requests ? Math.round(totals.input / totals.requests) : 0)} / requête</small></article>
      <article className="aiu-stat"><span>Tokens sortants</span><strong>{fmt(totals.output)}</strong><small>Moyenne : {fmt(totals.requests ? Math.round(totals.output / totals.requests) : 0)} / requête</small></article>
      <article className="aiu-stat"><span>Total déclaré</span><strong>{fmt(totals.total)}</strong><small>{fmt(totals.thoughts)} tokens de réflexion, séparés</small></article>
    </div>

    <div className="aiu-notes"><Activity size={17}/><p>Les tokens entrants, sortants, de réflexion et de cache sont détaillés séparément. Le total provient de <code>totalTokenCount</code>. Aucun coût FCFA n'est calculé sans grille tarifaire vérifiée.</p></div>

    <div className="panel aiu-table-panel">
      <div className="aiu-table-heading"><div><h3>Détail par requête</h3><p>Maximum : 1 000 dernières requêtes pour la période choisie.</p></div><span>{loading ? "Chargement…" : `${fmt(rows.length)} ligne(s)`}</span></div>
      {loading ? <div className="aiu-empty">Chargement…</div> : rows.length === 0
        ? <div className="aiu-empty">Aucune consommation enregistrée. Les requêtes apparaîtront après le déploiement de la fonction Edge et de la migration SQL.</div>
        : <div className="table-wrap"><table className="aiu-table"><thead><tr>
          <th>Date</th><th>Opération</th><th>Modèle</th><th>Entrants</th><th>Sortants</th><th>Réflexion</th><th>Cache</th><th>Total</th><th>Durée</th><th>État</th>
        </tr></thead><tbody>{rows.map(r => <tr key={r.id}>
          <td className="aiu-date" title={r.request_id}>{fmtDate(r.created_at)}</td>
          <td><span className={`aiu-kind ${r.action}`}>{r.action === "grade" ? "Correction" : "Assistant"}</span></td>
          <td><span className="aiu-model">{r.provider} · {r.model}</span></td>
          <td className="aiu-number"><ArrowDownToLine size={13}/>{fmt(r.input_tokens)}</td>
          <td className="aiu-number"><ArrowUpFromLine size={13}/>{fmt(r.output_tokens)}</td>
          <td className="aiu-number">{fmt(r.thoughts_tokens)}</td><td className="aiu-number">{fmt(r.cached_tokens)}</td>
          <td className="aiu-number aiu-total">{fmt(r.total_tokens)}</td>
          <td>{r.duration_ms == null ? "—" : `${(r.duration_ms / 1000).toFixed(1)} s`}</td>
          <td>{r.status === "success" ? <span className="aiu-status ok"><CheckCircle2 size={13}/> OK</span> : <span className="aiu-status fail" title={r.error_code ?? ""}><AlertCircle size={13}/> Échec</span>}
            {!r.usage_available && <small className="aiu-unmeasured">Tokens non fournis</small>}</td>
        </tr>)}</tbody></table></div>}
    </div>
  </section>;
}
