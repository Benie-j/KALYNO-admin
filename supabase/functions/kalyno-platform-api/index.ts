import { createClient } from "npm:@supabase/supabase-js@2.119.2";
import { EXAM_TRACKS, parseListLimit, validateDraftInput, validateDraftPatch } from "./contract.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-request-id",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(status: number, body: unknown, requestId: string) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "X-Request-Id": requestId } });
}
function fail(status: number, code: string, message: string, requestId: string) {
  return json(status, { ok: false, error: { code, message, request_id: requestId } }, requestId);
}
function routePath(url: URL) {
  const marker = "/functions/v1/kalyno-platform-api";
  const index = url.pathname.indexOf(marker);
  const path = index >= 0 ? url.pathname.slice(index + marker.length) : url.pathname;
  return (path || "/").replace(/\/+$/, "") || "/";
}
function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
async function authenticate(request: Request, requestId: string) {
  const token = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
  if (!token) return { response: fail(401, "unauthenticated", "Une session KALYNO valide est requise.", requestId) };
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("platform_api_missing_config", requestId);
    return { response: fail(503, "service_unavailable", "Configuration du service indisponible.", requestId) };
  }
  const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user || authData.user.is_anonymous) return { response: fail(401, "invalid_session", "Session invalide ou expirée. Reconnecte-toi.", requestId) };
  // Le rôle provient de profiles, jamais de user_metadata modifiable par l'utilisateur.
  const { data: profile, error: profileError } = await client.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
  if (profileError || profile?.role !== "admin") return { response: fail(403, "admin_required", "Cette opération nécessite un compte administrateur KALYNO.", requestId) };
  return { client, userId: authData.user.id };
}
function parseJson(raw: string): unknown { try { return JSON.parse(raw); } catch { return null; } }

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID();
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const path = routePath(new URL(request.url));
  if (!path.startsWith("/v1/")) return fail(404, "not_found", "Route inconnue. L'API commence par /v1.", requestId);
  const auth = await authenticate(request, requestId);
  if ("response" in auth) return auth.response;
  const { client, userId } = auth;

  try {
    if (path === "/v1/health" && request.method === "GET") return json(200, { ok: true, data: { service: "kalyno-platform-api", version: "1.0.0", status: "ready" } }, requestId);
    if (path === "/v1/capabilities" && request.method === "GET") return json(200, { ok: true, data: { api_version: "v1", modules: [{ id: "studio", status: "active", resources: ["exam-tracks", "exam-drafts"] }], transports: ["rest", "mcp"] } }, requestId);
    if (path === "/v1/exam-tracks" && request.method === "GET") return json(200, { ok: true, data: EXAM_TRACKS }, requestId);

    if (path === "/v1/studio/drafts" && request.method === "GET") {
      const url = new URL(request.url);
      const limit = parseListLimit(url.searchParams.get("limit"));
      let query = client.from("exam_content_drafts").select("*", { count: "exact" }).order("updated_at", { ascending: false }).limit(limit);
      const track = url.searchParams.get("exam_track"), type = url.searchParams.get("content_type"), status = url.searchParams.get("status");
      if (track) query = query.eq("exam_track", track);
      if (type) query = query.eq("content_type", type);
      if (status) query = query.eq("status", status);
      const { data, error, count } = await query;
      if (error) { console.error("platform_api_list_drafts_failed", requestId, error.code); return fail(500, "database_error", "Impossible de récupérer les brouillons.", requestId); }
      return json(200, { ok: true, data: data ?? [], meta: { count: count ?? 0, limit } }, requestId);
    }

    if (path === "/v1/studio/drafts" && request.method === "POST") {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > 1_000_000) return fail(413, "payload_too_large", "La requête dépasse 1 Mo.", requestId);
      const parsed = validateDraftInput(parseJson(raw));
      if (!parsed.ok) return fail(400, "validation_error", parsed.message, requestId);
      const { data, error } = await client.from("exam_content_drafts").insert({ ...parsed.value, origin: "admin", created_by: userId }).select("*").single();
      if (error) { console.error("platform_api_create_draft_failed", requestId, error.code); return fail(500, "database_error", "Impossible de créer le brouillon.", requestId); }
      return json(201, { ok: true, data }, requestId);
    }

    const match = path.match(/^\/v1\/studio\/drafts\/([^/]+)$/);
    if (match) {
      const id = match[1];
      if (!isUuid(id)) return fail(400, "invalid_id", "Identifiant de brouillon invalide.", requestId);
      if (request.method === "GET") {
        const { data, error } = await client.from("exam_content_drafts").select("*").eq("id", id).maybeSingle();
        if (error) { console.error("platform_api_get_draft_failed", requestId, error.code); return fail(500, "database_error", "Impossible de récupérer le brouillon.", requestId); }
        if (!data) return fail(404, "not_found", "Brouillon introuvable.", requestId);
        return json(200, { ok: true, data }, requestId);
      }
      if (request.method === "PATCH") {
        const raw = await request.text();
        if (new TextEncoder().encode(raw).length > 1_000_000) return fail(413, "payload_too_large", "La requête dépasse 1 Mo.", requestId);
        const parsed = validateDraftPatch(parseJson(raw));
        if (!parsed.ok) return fail(400, "validation_error", parsed.message, requestId);
        const { data, error } = await client.from("exam_content_drafts").update({ ...parsed.value, updated_at: new Date().toISOString() }).eq("id", id).select("*").maybeSingle();
        if (error) { console.error("platform_api_update_draft_failed", requestId, error.code); return fail(500, "database_error", "Impossible de modifier le brouillon.", requestId); }
        if (!data) return fail(404, "not_found", "Brouillon introuvable ou accès refusé.", requestId);
        return json(200, { ok: true, data }, requestId);
      }
      if (request.method === "DELETE") {
        if (new URL(request.url).searchParams.get("confirm") !== "true") return fail(409, "confirmation_required", "Ajoute ?confirm=true pour confirmer la suppression définitive.", requestId);
        const { data, error } = await client.from("exam_content_drafts").delete().eq("id", id).select("id").maybeSingle();
        if (error) { console.error("platform_api_delete_draft_failed", requestId, error.code); return fail(500, "database_error", "Impossible de supprimer le brouillon.", requestId); }
        if (!data) return fail(404, "not_found", "Brouillon introuvable ou accès refusé.", requestId);
        return json(200, { ok: true, data: { id: data.id, deleted: true } }, requestId);
      }
      return fail(405, "method_not_allowed", "Méthode non autorisée pour cette ressource.", requestId);
    }
    return fail(404, "not_found", "Route inconnue.", requestId);
  } catch (error) {
    console.error("platform_api_unhandled_error", requestId, error instanceof Error ? error.message : "unknown");
    return fail(500, "internal_error", "Une erreur interne est survenue.", requestId);
  }
});
