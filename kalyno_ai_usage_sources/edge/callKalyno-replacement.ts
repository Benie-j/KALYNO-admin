// Remplace l'ancienne fonction callKalyno par ce bloc.
// Le helper recordAiUsage et le type AiUsageContext sont dans usage-logging-snippet.ts.

async function callKalyno(
  payload: Record<string, unknown>,
  usageContext: AiUsageContext,
): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new KalynoError("not_configured", false, 500);

  const model = (Deno.env.get("GEMINI_MODEL") ?? DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KALYNO_TIMEOUT_MS);
  const startedAt = Date.now();
  let logged = false;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );

    const raw = await res.text();
    let data: any = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }

    const usage = data?.usageMetadata ?? null;
    const actualModel = typeof data?.modelVersion === "string" ? data.modelVersion : model;

    if (!res.ok) {
      const code = res.status === 429
        ? "rate_limited"
        : res.status >= 500
          ? "kalyno_unavailable"
          : "kalyno_rejected";

      await recordAiUsage(usageContext, actualModel, usage, "error", code, Date.now() - startedAt);
      logged = true;

      if (res.status === 429) throw new KalynoError("rate_limited", true, 429);
      if (res.status >= 500) throw new KalynoError("kalyno_unavailable", true, 503);
      console.error("kalyno_http", res.status);
      throw new KalynoError("kalyno_rejected", false, 502);
    }

    // Enregistre les compteurs exacts renvoyés par Gemini avant le parsing du texte.
    await recordAiUsage(usageContext, actualModel, usage, "success", null, Date.now() - startedAt);
    logged = true;

    const cand = data?.candidates?.[0];
    const text = (cand?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new KalynoError(
        cand?.finishReason === "SAFETY" ? "blocked" : "empty_response",
        true,
      );
    }
    return text;
  } catch (e) {
    if (!logged) {
      const code = e instanceof KalynoError
        ? e.code
        : e instanceof DOMException && e.name === "AbortError"
          ? "timeout"
          : "network";
      await recordAiUsage(usageContext, model, null, "error", code, Date.now() - startedAt);
    }

    if (e instanceof KalynoError) throw e;
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new KalynoError("timeout", true, 504);
    }
    console.error("kalyno_network");
    throw new KalynoError("network", true, 502);
  } finally {
    clearTimeout(timer);
  }
}

// Changements obligatoires dans index.ts :
// A) modifier les signatures :
//    gradeAction(body, usageContext: AiUsageContext)
//    assistAction(body, usageContext: AiUsageContext)
// B) dans chacune, appeler callKalyno(payload, usageContext) au lieu de callKalyno(payload).
// C) Dans Deno.serve, juste après le parsing JSON du body et avant le dispatch :
//    const usageContext: AiUsageContext = {
//      userId: data.user.id,
//      action: body.action === "grade" ? "grade" : "assist",
//      requestId: crypto.randomUUID(),
//    };
// D) dispatcher avec gradeAction(body, usageContext) et assistAction(body, usageContext).
//
// Note : les tokens de réflexion sont conservés séparément de candidatesTokenCount.
// La ligne reste enregistrée même si la réponse Gemini ne contient pas de texte exploitable.
