from pathlib import Path
import shutil
import sys

app = Path("src/App.tsx")
if not app.exists():
    sys.exit("Erreur : lance ce script depuis la racine de KALYNO-admin (src/App.tsx introuvable).")

source = app.read_text(encoding="utf-8")
replacements = [
    (
        'import GenerationErrorsManager from "./GenerationErrorsManager";',
        'import GenerationErrorsManager from "./GenerationErrorsManager";\nimport GenerationManager from "./GenerationManager";'
    ),
    (
        'type Section = "overview" | "levels" | "courses" | "banners" | "motivation" | "themes" | "freeexercises" | "firstchallenge" | "semantic" | "reports" | "aiusage" | "errors" | "faq";',
        'type Section = "overview" | "levels" | "courses" | "banners" | "motivation" | "themes" | "freeexercises" | "firstchallenge" | "semantic" | "reports" | "aiusage" | "generation" | "errors" | "faq";'
    ),
    (
        '    { id: "aiusage" as Section, label: "Consommation IA", icon: Activity },',
        '    { id: "aiusage" as Section, label: "Consommation IA", icon: Activity },\n    { id: "generation" as Section, label: "Génération IA", icon: Sparkles },'
    ),
    (
        '          {section === "aiusage" && <AiUsageManager />}\n          {section === "errors" && <GenerationErrorsManager />}',
        '          {section === "aiusage" && <AiUsageManager />}\n          {section === "generation" && <GenerationManager onOpenLogs={() => setSection("errors")} />}\n          {section === "errors" && <GenerationErrorsManager />}'
    ),
]

for old, new in replacements:
    count = source.count(old)
    if count != 1:
        sys.exit(f"Arrêt sans modification : ancre attendue une seule fois, trouvée {count} fois : {old[:100]!r}")
    source = source.replace(old, new, 1)

backup = app.with_name("App.tsx.bak-manual-generation")
if not backup.exists():
    shutil.copy2(app, backup)
app.write_text(source, encoding="utf-8")
print("OK : App.tsx mis à jour. Sauvegarde :", backup)
journal = Path("src/GenerationErrorsManager.tsx")
if journal.exists():
    journal_source = journal.read_text(encoding="utf-8")
    old_log = '<span>Opération : <b>{event.operation}</b></span>'
    new_log = old_log + '\n                    {event.details?.trigger_source && <span>Déclenchement : <b>{event.details.trigger_source === "admin_manual" ? "Manuel admin" : String(event.details.trigger_source)}</b></span>}'
    if old_log in journal_source and new_log not in journal_source:
        journal_source = journal_source.replace(old_log, new_log, 1)
        journal.write_text(journal_source, encoding="utf-8")
        print("OK : journal technique enrichi avec le mode de déclenchement.")
    elif new_log in journal_source:
        print("Journal technique déjà enrichi.")
    else:
        print("INFO : ancre du journal technique absente ; fichier laissé intact.")
print("Nouveaux fichiers : src/GenerationManager.tsx et src/generation-manager.css")
print("Étape suivante : npm run build")
