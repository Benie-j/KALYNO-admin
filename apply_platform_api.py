#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
import shutil, subprocess, sys

root = Path.cwd()
target = root / "src/FrenchConcoursStudio.tsx"
if not (root / "package.json").exists() or not target.exists():
    sys.exit("Lance ce script depuis la racine de ~/KALYNO-admin.")
status = subprocess.run(["git", "status", "--porcelain"], cwd=root, text=True, capture_output=True)
if status.returncode:
    sys.exit("Git indisponible ou dépôt introuvable.")
expected = {
    "INSTALLATION.txt",
    "apply_platform_api.py",
    ".github/workflows/platform-api-check.yml", "docs/openapi.yaml", "docs/platform-api.md",
    "src/lib/platformApi.ts", "supabase/functions/kalyno-platform-api/contract.ts",
    "supabase/functions/kalyno-platform-api/index.ts", "supabase/functions/kalyno-platform-api/contract_test.ts",
}
other_changes = []
for line in status.stdout.splitlines():
    changed_path = line[3:].rstrip("/")
    if changed_path not in expected and not any(item.startswith(changed_path + "/") for item in expected):
        other_changes.append(line)
if other_changes:
    print("ARRÊT : modifications préexistantes détectées. Aucun changement effectué :")
    print("\n".join(other_changes))
    sys.exit(2)
for rel in expected:
    if not (root / rel).is_file():
        sys.exit(f"Fichier livré manquant : {rel}")

original = target.read_text(encoding="utf-8")
replacements = [
('import { supabase } from "./lib/supabase";', 'import { listExamDrafts, createExamDraft, updateExamDraft } from "./lib/platformApi";'),
('''    const { data, error } = await supabase.from("exam_content_drafts").select("*").order("updated_at", { ascending: false }).limit(250);
    if (error) setNotice(`Chargement impossible : ${error.message}`);
    else {
      const list = (data ?? []) as Draft[]; setRows(list);
      setSelected(current => list.some(x => x.id === current) ? current : (list[0]?.id ?? ""));
    }
    setLoading(false);''', '''    try {
      const list = await listExamDrafts(250);
      setRows(list);
      setSelected(current => list.some(x => x.id === current) ? current : (list[0]?.id ?? ""));
    } catch (error) {
      setNotice(`Chargement impossible : ${errorMessage(error)}`);
    } finally {
      setLoading(false);
    }'''),
('''    const result = creating
      ? await supabase.from("exam_content_drafts").insert(payload).select("id").single()
      : await supabase.from("exam_content_drafts").update(payload).eq("id", selected).select("id").single();
    if (result.error) setNotice(`Enregistrement impossible : ${result.error.message}`);
    else { setNotice(creating ? "Brouillon créé." : "Brouillon mis à jour."); setCreating(false); setEdit(false); await load(); if (result.data?.id) setSelected(result.data.id); }
    setSaving(false);''', '''    try {
      const saved = creating ? await createExamDraft(payload) : await updateExamDraft(selected, payload);
      setNotice(creating ? "Brouillon créé." : "Brouillon mis à jour.");
      setCreating(false); setEdit(false); await load();
      if (saved?.id) setSelected(saved.id);
    } catch (error) {
      setNotice(`Enregistrement impossible : ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }'''),
('''    const { error } = await supabase.from("exam_content_drafts").update({ status: next }).eq("id", row.id);
    if (error) setNotice(`Changement de statut impossible : ${error.message}`);
    else { setNotice("Statut mis à jour. Aucune publication élève n'a été effectuée."); await load(); }
    setSaving(false);''', '''    try {
      await updateExamDraft(row.id, { status: next });
      setNotice("Statut mis à jour. Aucune publication élève n'a été effectuée.");
      await load();
    } catch (error) {
      setNotice(`Changement de statut impossible : ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }''')
]
for old, new in replacements:
    count = original.count(old)
    if count != 1:
        sys.exit(f"ARRÊT : bloc attendu une fois, trouvé {count}. Fichier source intact.")

backup = Path.home() / "kalyno-backups" / f"platform-api-v1-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
backup.mkdir(parents=True, exist_ok=False)
shutil.copy2(target, backup / target.name)
updated = original
for old, new in replacements:
    updated = updated.replace(old, new, 1)
target.write_text(updated, encoding="utf-8")
print("French Studio est maintenant relié au client REST Platform API.")
print(f"Sauvegarde : {backup / target.name}")
print("Aucune modification de production Supabase n'a été effectuée.")
