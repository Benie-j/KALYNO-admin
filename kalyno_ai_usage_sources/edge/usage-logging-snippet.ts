// À ajouter dans supabase/functions/kalyno-gemini/index.ts après la fonction fail().
// Supabase fournit SUPABASE_SERVICE_ROLE_KEY dans l'environnement Edge.
// Ne jamais déplacer cette clé dans KALYNO-admin ou dans l'application Android.

type AiUsageContext = { userId: string; action: "grade" | "assist"; requestId: string };

function tokenCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

async function recordAiUsage(
  context: AiUsageContext,
  model: string,
  usage: Record<string, unknown> | null,
  status: "success" | "error",
  errorCode: string | null,
  durationMs: number,
): Promise<void> {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !supabaseUrl) {
    console.error("ai_usage_logging_not_configured");
    return;
  }

  const input = tokenCount(usage?.promptTokenCount);
  const output = tokenCount(usage?.candidatesTokenCount);
  const thoughts = tokenCount(usage?.thoughtsTokenCount);
  const cached = tokenCount(usage?.cachedContentTokenCount);
  const toolInput = tokenCount(usage?.toolUsePromptTokenCount);
  const total = tokenCount(usage?.totalTokenCount);
  const usageAvailable = [input, output, thoughts, cached, toolInput, total].some(v => v !== null);

  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.from("ai_usage_logs").insert({
      request_id: context.requestId, user_id: context.userId, provider: "gemini", model,
      action: context.action, input_tokens: input, output_tokens: output,
      thoughts_tokens: thoughts, cached_tokens: cached, tool_input_tokens: toolInput,
      total_tokens: total, usage_available: usageAvailable, status,
      error_code: errorCode, duration_ms: Math.max(0, Math.floor(durationMs)),
    });
    if (error) console.error("ai_usage_log_insert_failed", error.code);
  } catch {
    console.error("ai_usage_log_insert_failed");
  }
}

// Dans Deno.serve, après validation du body et avant le dispatch :
const usageContext: AiUsageContext = {
  userId: data.user.id,
  action: body.action === "grade" ? "grade" : "assist",
  requestId: crypto.randomUUID(),
};

// Modifier les signatures:
// gradeAction(body, usageContext)
// assistAction(body, usageContext)
// et leurs appels à callKalyno(payload) en callKalyno(payload, usageContext).
//
// Dans callKalyno:
// 1. noter startedAt = Date.now() et logged = false;
// 2. lire le JSON de réponse Gemini;
// 3. récupérer data.usageMetadata et data.modelVersion;
// 4. appeler recordAiUsage(usageContext, data.modelVersion ?? model, data.usageMetadata ?? null,
//    "success", null, Date.now() - startedAt) avant de retourner le texte;
// 5. sur réponse HTTP non OK ou exception réseau, appeler recordAiUsage(..., "error", code, durée).
