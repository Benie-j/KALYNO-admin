import { parseListLimit, validateDraftInput, validateDraftPatch } from "./contract.ts";
Deno.test("accepte un brouillon valide et applique les valeurs par défaut", () => {
  const result = validateDraftInput({ exam_track: "cafop", content_type: "course", title: "Accord du participe passé", content: { sections: [] } });
  if (!result.ok || result.value.difficulty !== "intermediate") throw new Error("Validation ou défaut incorrect");
});
Deno.test("refuse les valeurs invalides", () => {
  if (validateDraftInput({ exam_track: "other", content_type: "course", title: "Titre valide", content: {} }).ok) throw new Error("Concours inconnu accepté");
  if (validateDraftInput({ exam_track: "cafop", content_type: "course", title: "x", content: {} }).ok) throw new Error("Titre trop court accepté");
});
Deno.test("PATCH refuse les champs protégés", () => {
  if (validateDraftPatch({ created_by: "00000000-0000-4000-8000-000000000000" }).ok) throw new Error("created_by ne doit pas être modifiable");
  const status = validateDraftPatch({ status: "approved" });
  if (!status.ok || status.value.status !== "approved") throw new Error("Statut approved refusé");
});
Deno.test("limite de liste bornée", () => {
  if (parseListLimit(null) !== 50 || parseListLimit("500") !== 100 || parseListLimit("0") !== 1) throw new Error("Bornes de limite incorrectes");
});
