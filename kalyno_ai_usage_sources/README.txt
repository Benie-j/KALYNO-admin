KALYNO — sources du suivi de consommation IA

Fichiers :
- supabase/migrations/20261122_ai_usage_logs.sql : table et politique RLS.
- edge/usage-logging-snippet.ts : helper à intégrer dans la fonction Edge existante.
- edge/callKalyno-replacement.ts : remplacement complet de callKalyno et liste des changements de signatures/dispatch.
- admin/src/AiUsageManager.tsx et admin/src/ai-usage.css : écran d'administration.

Intégration KALYNO-admin :
1. Copier AiUsageManager.tsx et ai-usage.css dans KALYNO-admin/src/.
2. Dans src/App.tsx :
   - importer AiUsageManager depuis "./AiUsageManager";
   - ajouter "aiusage" au type Section;
   - ajouter dans nav : { id: "aiusage" as Section, label: "Consommation IA", icon: Activity };
   - dans le contenu principal ajouter : {section === "aiusage" && <AiUsageManager/>}.
3. Lancer npm run build.

Intégration KALYNO :
1. Copier la migration dans KALYNO/supabase/migrations/.
2. Intégrer le helper et les changements décrits dans edge/usage-logging-snippet.ts dans
   supabase/functions/kalyno-gemini/index.ts.
3. Exécuter la migration SQL dans le SQL Editor Supabase.
4. Déployer : supabase functions deploy kalyno-gemini.

La fonction doit journaliser les réponses Gemini, y compris les appels assistant et correction.
Les champs d'entrée/sortie proviennent de usageMetadata (promptTokenCount et
candidatesTokenCount). thoughtsTokenCount, cachedContentTokenCount et totalTokenCount
sont aussi enregistrés lorsqu'ils existent.

La table n'enregistre ni énoncé, ni réponse de l'élève, ni clé API. La lecture est réservée
aux comptes administrateurs via public.is_admin(). L'insertion est faite par la fonction Edge
avec la clé service_role côté serveur uniquement.

Important : l'écran affiche les 1 000 dernières requêtes maximum pour la période sélectionnée.
Le coût financier n'est volontairement pas affiché tant que la grille tarifaire exacte du modèle
n'a pas été configurée.
