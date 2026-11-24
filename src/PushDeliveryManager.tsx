import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, Clock3, RefreshCw, Search, XCircle } from "lucide-react";
import { supabase } from "./lib/supabase";
import "./push-delivery.css";

type PushEvent = {
  id: string;
  push_key: string | null;
  topic: string;
  notification_type: string;
  title: string;
  body: string;
  fcm_status: "accepted" | "failed";
  fcm_message_name: string | null;
  fcm_error: string | null;
  created_at: string;
};

type Period = "24" | "7" | "30" | "all";

const dateLabel = (value: string) =>
  new Date(value).toLocaleString("fr-FR", {
    timeZone: "Africa/Abidjan",
    dateStyle: "medium",
    timeStyle: "medium"
  });

const typeLabel: Record<string, string> = {
  lesson: "Nouvelle leçon",
  cards: "Nouvelles cartes",
  banner: "Annonce",
  challenge: "Nouveau défi",
  theme: "Nouveau thème",
  capsule: "Nouvelle capsule",
  free_exercise: "Exercice libre"
};

export default function PushDeliveryManager() {
  const [rows, setRows] = useState<PushEvent[]>([]);
  const [period, setPeriod] = useState<Period>("7");
  const [status, setStatus] = useState<"all" | "accepted" | "failed">("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      let query = supabase
        .from("push_delivery_events")
        .select("id,push_key,topic,notification_type,title,body,fcm_status,fcm_message_name,fcm_error,created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (period !== "all") {
        const hours = period === "24" ? 24 : Number(period) * 24;
        query = query.gte(
          "created_at",
          new Date(Date.now() - hours * 3600000).toISOString()
        );
      }

      if (status !== "all") query = query.eq("fcm_status", status);

      const { data, error: queryError } = await query;
      if (queryError) throw queryError;

      setRows((data ?? []) as PushEvent[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [period, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row =>
      [row.title, row.body, row.topic, row.notification_type,
       row.fcm_message_name ?? "", row.fcm_error ?? ""]
        .some(value => value.toLowerCase().includes(q))
    );
  }, [rows, search]);

  const accepted = rows.filter(row => row.fcm_status === "accepted").length;
  const failed = rows.filter(row => row.fcm_status === "failed").length;

  return (
    <section className="page push-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">FIREBASE CLOUD MESSAGING · SUPABASE</div>
          <h2>Suivi des notifications</h2>
          <p>
            Historique des messages envoyés par KALYNO et réponses du service Firebase.
          </p>
        </div>
        <button className="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      <div className="push-stats">
        <article>
          <span>Messages enregistrés</span>
          <strong>{rows.length}</strong>
        </article>
        <article>
          <span>Acceptés par Firebase</span>
          <strong>{accepted}</strong>
        </article>
        <article>
          <span>Envois rejetés</span>
          <strong>{failed}</strong>
        </article>
      </div>

      <div className="push-notice">
        <Bell size={19} />
        <div>
          <strong>À savoir : accepté ne signifie pas reçu.</strong>
          <p>
            « Accepté par Firebase » confirme que FCM a accepté la demande d'envoi.
            Cela ne prouve pas encore que le téléphone a reçu ou affiché la notification.
            L'accusé de réception par appareil sera ajouté séparément.
          </p>
        </div>
      </div>

      <div className="push-toolbar">
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
          État Firebase
          <select
            value={status}
            onChange={e => setStatus(e.target.value as typeof status)}
          >
            <option value="all">Tous les états</option>
            <option value="accepted">Acceptés</option>
            <option value="failed">Rejetés</option>
          </select>
        </label>

        <label className="push-search">
          Rechercher
          <div>
            <Search size={16} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Titre, classe, erreur…"
            />
          </div>
        </label>
      </div>

      {error && <div className="push-error">{error}</div>}

      <div className="panel push-panel">
        <div className="push-panel-heading">
          <div>
            <h3>Historique des envois</h3>
            <p>Heures locales d'Abidjan (UTC+0).</p>
          </div>
          <span>{loading ? "Chargement…" : `${filtered.length} message(s)`}</span>
        </div>

        {loading ? (
          <div className="push-empty">Chargement des notifications…</div>
        ) : filtered.length === 0 ? (
          <div className="push-empty">
            Aucun envoi enregistré pour ces filtres.
          </div>
        ) : (
          <div className="push-list">
            {filtered.map(row => {
              const ok = row.fcm_status === "accepted";
              return (
                <article className="push-event" key={row.id}>
                  <div className="push-event-top">
                    <div className="push-event-title">
                      {ok
                        ? <CheckCircle2 size={19} />
                        : <XCircle size={19} />}
                      <strong>{row.title}</strong>
                    </div>
                    <span className={`push-state ${ok ? "accepted" : "failed"}`}>
                      {ok ? "Accepté par Firebase" : "Rejeté"}
                    </span>
                  </div>

                  <p className="push-body">{row.body}</p>

                  <div className="push-meta">
                    <span><Clock3 size={13} /> {dateLabel(row.created_at)}</span>
                    <span>Type : <b>{typeLabel[row.notification_type] ?? row.notification_type}</b></span>
                    <span>Destination : <b>{row.topic}</b></span>
                  </div>

                  {row.fcm_message_name && (
                    <details>
                      <summary>Identifiant et réponse Firebase</summary>
                      <code>{row.fcm_message_name}</code>
                      <p className="push-pending">
                        Envoi accepté. Réception sur les appareils non confirmée.
                      </p>
                    </details>
                  )}

                  {row.fcm_error && (
                    <details open>
                      <summary>Détail du rejet</summary>
                      <pre>{row.fcm_error}</pre>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
