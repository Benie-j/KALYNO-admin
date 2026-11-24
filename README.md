# KALYNO — Déclenchement manuel de génération

## Ce qui est déjà en production
- `kalyno-generate` version 16 est ACTIVE.
- Le mode `manual: true` vérifie côté serveur que l'appelant est un administrateur et que le compte ciblé est un élève.
- Une clé `manual-<UUID>` sépare les déclenchements manuels de l'idempotence automatique `auto-5h-*`.
- La génération manuelle est journalisée comme `trigger_source: admin_manual`.
- La politique RLS de lecture admin sur `student_profiles` est déjà créée en production.

## Installer l'interface admin depuis Termux
1. Extraire l'archive dans `~` afin d'obtenir `~/KALYNO-admin/src/GenerationManager.tsx`, `~/KALYNO-admin/src/generation-manager.css` et `~/KALYNO-admin/apply_admin_patch.py`.
2. Dans Termux :
   ```sh
   cd ~/KALYNO-admin
   python apply_admin_patch.py
   npm run build
   ```
3. Vérifier les changements :
   ```sh
   git status --short
   ```
4. Si le build passe, enregistrer et pousser :
   ```sh
   git add src/App.tsx src/GenerationManager.tsx src/generation-manager.css src/GenerationErrorsManager.tsx
   git commit -m "feat(admin): déclenchement manuel de génération IA"
   git push
   ```

## Conserver la migration dans le dépôt KALYNO
La migration SQL incluse est déjà appliquée en production. Elle sert à documenter/versionner la politique RLS ; ne la réexécute pas manuellement dans Supabase.
```sh
cd ~/KALYNO
git status --short
git add supabase/migrations/20261124_student_profiles_admin_select.sql
git commit -m "db: autoriser les admins à lire les profils élèves"
git push
```

## Vérification fonctionnelle
Après déploiement de KALYNO-admin :
- ouvrir « Génération IA » ;
- choisir un compte élève avec une classe ;
- choisir une leçon publiée (ou laisser la sélection automatique) ;
- lancer la génération ;
- vérifier le nombre enregistré, le fournisseur et l'ID de run ;
- ouvrir « Erreurs & journaux » pour examiner les événements du run.

Le build et l'appel réel à Gemini/Groq ne sont pas prétendus comme testés depuis cette archive. Le backend a été déployé et sa source relue ; la génération réelle doit être lancée depuis l'interface admin après son déploiement.
