import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, Clock3, RefreshCw } from "lucide-react";
import { supabase } from "./lib/supabase";
import "./generation-errors.css";

type EventRow = {
  id: string;
  run_id: string;
  function_name: string;
  operation: string;
  event_type: string;
  provider: string | null;
  model: string | null;
  attempt: number | null;
  error_code: string | null;
  error_message: string | null;
  http_status: number | null;
  duration_ms: number | null;
  details: Record<string, unknown>;
  created_at: string;
};

type Period = "24" | "7" | "30" | "all";
type Provider = "all" | "gemini" | "groq";

const fmt = (n: number) => n.toLocaleString("fr-FR");

const fmtDate = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    timeZone: "Africa/Abidjan",
    dateStyle: "short",
    timeStyle: "medium",
  });

const labels: Record<string, string> = {
  generation_started: "Génération démarrée",
  provider_failed: "Échec du fournisseur",
  validation_failed: "Réponse invalide",
  generation_succeeded: "Génération réussie",
  generation_skipped: "Génération ignorée",
  generation_failed: "Échec de génération",
};

const isFailure = (event: EventRow) =>
  event.event_type.includes("failed") ||
  event.event_type === "validation_failed";

export default function GenerationErrorsManager() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [period, setPeriod] = useState<Period>("7");
  const [provider, setProvider] = useState<Provider>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      let query = supabase
        .from("generation_run_events")
        .select(
          "id,run_id,function_name,operation,event_type,provider,model,attempt,error_code,error_message,http_status,duration_ms,details,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(500);

      if (period !== "all") {
        const hours = period === "24" ? 24 : Number(period) * 24;
        query = query.gte(
          "created_at",
          new Date(Date.now() - hours * 3600000).toISOString()
        );
      }

      if (provider !== "all") query = query.eq("provider", provider);

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      setRows((data ?? []) as EventRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [period, provider]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => ({
    total: rows.length,
    failures: rows.filter(isFailure).length,
    gemini: rows.filter(r => r.provider === "gemini" && isFailure(r)).length,
    groq: rows.filter(r => r.provider === "groq" && isFailure(r)).length,
    success: rows.filter(r => r.event_type === "generation_succeeded").length,
  }), [rows]);

  return (
    <section className="page ger-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">SURVEILLANCE TECHNIQUE · SUPABASE</div>
          <h2>Erreurs et journaux techniques</h2>
          <p>
            Historique des générations, erreurs des fournisseurs IA,
            tentatives de secours et résultats.
          </p>
        </div>
        <button className="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      <div className="ger-stats">
        <article><span>Événements</span><strong>{fmt(stats.total)}</strong></article>
        <article><span>Erreurs</span><strong>{fmt(stats.failures)}</strong></article>
        <article><span>Échecs Gemini</span><strong>{fmt(stats.gemini)}</strong></article>
        <article><span>Échecs Groq</span><strong>{fmt(stats.groq)}</strong></article>
        <article><span>Générations réussies</span><strong>{fmt(stats.success)}</strong></article>
      </div>

      <div className="ger-toolbar">
        <label>
          Période
          <select value={period} onChange={e => setPeriod(e.target.value as Period)}>
            <option value="24">Dernières 24 heures</option>
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="all">Tout l'historique</option>
          </select>
        </label>
        <label>
          Fournisseur
          <select value={provider} onChange={e => setProvider(e.target.value as Provider)}>
            <option value="all">Tous</option>
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="ger-error">
          <AlertCircle size={17} /> {error}
        </div>
      )}

      <div className="panel ger-panel">
        <div className="ger-heading">
          <div>
            <h3>Journal des événements</h3>
            <p>Horaires affichés en heure locale d'Abidjan (UTC+0).</p>
          </div>
          <span>{loading ? "Chargement…" : `${fmt(rows.length)} événement(s)`}</span>
        </div>

        {loading ? (
          <div className="ger-empty">Chargement des événements…</div>
        ) : rows.length === 0 ? (
          <div className="ger-empty">
            Aucun événement enregistré pour cette période.
          </div>
        ) : (
          <div className="ger-list">
            {rows.map(event => {
              const failed = isFailure(event);
              return (
                <article className="ger-event" key={event.id}>
                  <div className="ger-event-top">
                    <div className="ger-event-title">
                      {failed
                        ? <AlertCircle size={17} />
                        : event.event_type === "generation_succeeded"
                          ? <CheckCircle2 size={17} />
                          : <Activity size={17} />}
                      <strong>{labels[event.event_type] ?? event.event_type}</strong>
                    </div>
                    <span className={`ger-status ${failed ? "failed" : "normal"}`}>
                      {failed ? "Échec" : "Événement"}
                    </span>
                  </div>

                  <div className="ger-date">
                    <Clock3 size={13} /> {fmtDate(event.created_at)}
                  </div>

                  <div className="ger-meta">
                    <span>Fonction : <b>{event.function_name}</b></span>
                    <span>Opération : <b>{event.operation}</b></span>
                    {event.provider && <span>Fournisseur : <b>{event.provider}</b></span>}
                    {event.model && <span>Modèle : <b>{event.model}</b></span>}
                    {event.attempt != null && <span>Tentative : <b>{event.attempt}</b></span>}
                    {event.http_status != null && <span>HTTP : <b>{event.http_status}</b></span>}
                    {event.duration_ms != null && <span>Durée : <b>{(event.duration_ms / 1000).toFixed(2)} s</b></span>}
                  </div>

                  {(event.error_code || event.error_message || Object.keys(event.details ?? {}).length > 0) && (
                    <details className="ger-details">
                      <summary>Détails techniques</summary>
                      {event.error_code && <p><b>Code :</b> {event.error_code}</p>}
                      {event.error_message && <p><b>Message :</b> {event.error_message}</p>}
                      <p><b>Identifiant de génération :</b> <code>{event.run_id}</code></p>
                      {Object.keys(event.details ?? {}).length > 0 && (
                        <pre>{JSON.stringify(event.details, null, 2)}</pre>
                      )}
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
      <div className="ger-note">
        <Activity size={16} />
        <span>
          Ce journal conserve les événements instrumentés par kalyno-generate.
          Les journaux bruts des autres services Supabase ne sont pas encore
          intégrés à cet écran.
        </span>
      </div>
    </section>
  );
}
