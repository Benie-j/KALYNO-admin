import { FormEvent, useEffect, useState } from "react";
import { supabase } from "./lib/supabase";

type AuthorizationDetails = {
  authorization_id: string;
  client?: {
    name?: string;
    client_name?: string;
  };
  redirect_uri?: string;
  scope?: string;
};

type AuthorizationRedirect = {
  redirect_url: string;
};

function isRedirect(
  value: AuthorizationDetails | AuthorizationRedirect
): value is AuthorizationRedirect {
  return "redirect_url" in value;
}

export default function OAuthConsent() {
  const authorizationId = new URLSearchParams(window.location.search)
    .get("authorization_id");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState<AuthorizationDetails | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState("");

  async function loadDetails() {
    if (!authorizationId) {
      setError("La demande OAuth ne contient pas d’identifiant d’autorisation.");
      return;
    }

    const { data, error: detailsError } =
      await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

    if (detailsError || !data) {
      throw detailsError ?? new Error("Impossible de lire la demande OAuth.");
    }

    if (isRedirect(data)) {
      window.location.replace(data.redirect_url);
      return;
    }

    setDetails(data as AuthorizationDetails);
  }

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        if (!authorizationId) {
          setError("Identifiant d’autorisation manquant. Relance la connexion depuis ChatGPT.");
          return;
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!active) return;

        if (!data.session) {
          setNeedsLogin(true);
          return;
        }

        await loadDetails();
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (signInError) throw signInError;

      setNeedsLogin(false);
      setLoading(true);
      await loadDetails();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
      setBusy(false);
    }
  }

  async function decide(decision: "approve" | "deny") {
    if (!authorizationId) return;

    setBusy(true);
    setError("");

    try {
      const result = decision === "approve"
        ? await supabase.auth.oauth.approveAuthorization(authorizationId)
        : await supabase.auth.oauth.denyAuthorization(authorizationId);

      if (result.error) throw result.error;
      window.location.replace(result.data.redirect_url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setBusy(false);
    }
  }

  const scopes = details?.scope?.trim()
    ? details.scope.trim().split(/\s+/)
    : [];

  const clientName =
    details?.client?.name ??
    details?.client?.client_name ??
    "Cette application";

  return (
    <main className="oauth-page">
      <section className="oauth-card">
        <div className="oauth-brand">
          <span className="oauth-mark">K</span>
          <span>KALYNO</span>
        </div>

        {loading ? (
          <p className="oauth-muted">Chargement de la demande…</p>
        ) : needsLogin ? (
          <>
            <h1>Connexion requise</h1>
            <p className="oauth-muted">
              Connecte-toi à ton compte KALYNO pour examiner cette demande d’accès.
            </p>
            <form className="oauth-form" onSubmit={signIn}>
              <label>
                Adresse e-mail
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Mot de passe
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                />
              </label>
              <button className="oauth-primary" disabled={busy}>
                {busy ? "Connexion…" : "Se connecter"}
              </button>
            </form>
          </>
        ) : details ? (
          <>
            <p className="oauth-eyebrow">AUTORISATION DE COMPTE</p>
            <h1>Autoriser {clientName} ?</h1>
            <p className="oauth-muted">
              Cette application demande l’autorisation d’accéder aux informations
              ci-dessous avec ton compte KALYNO.
            </p>

            <div className="oauth-details">
              <strong>Application</strong>
              <p>{clientName}</p>

              {details.redirect_uri && (
                <>
                  <strong>Adresse de retour</strong>
                  <p className="oauth-break">{details.redirect_uri}</p>
                </>
              )}

              <strong>Permissions demandées</strong>
              {scopes.length ? (
                <ul>{scopes.map(scope => <li key={scope}>{scope}</li>)}</ul>
              ) : (
                <p>Aucune portée n’a été précisée.</p>
              )}
            </div>

            <p className="oauth-muted">
              N’autorise l’accès que si tu reconnais cette application et comprends
              les permissions demandées.
            </p>

            <div className="oauth-actions">
              <button
                className="oauth-secondary"
                disabled={busy}
                onClick={() => void decide("deny")}
              >
                Refuser
              </button>
              <button
                className="oauth-primary"
                disabled={busy}
                onClick={() => void decide("approve")}
              >
                {busy ? "Traitement…" : "Autoriser"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h1>Demande OAuth indisponible</h1>
            <p className="oauth-muted">
              La demande est invalide, expirée ou ne peut pas être chargée.
              Relance la connexion depuis ChatGPT.
            </p>
          </>
        )}

        {error && <p className="oauth-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
