# KALYNO-admin — Console Platform API

## Contenu du correctif
- `src/PlatformApiManager.tsx` : écran dédié de supervision API et gestion des brouillons.
- `src/PlatformApiManager.css` : styles responsive.
- Mise à jour de `src/lib/platformApi.ts` : appels health/capabilities/concours, limite de liste alignée sur l'API (100), erreurs avec request ID.
- Intégration dans `src/App.tsx` : nouvelle entrée latérale « Platform API · Console ».

## Application depuis Termux
1. Extraire ce ZIP dans `~/KALYNO-admin` (à la racine, pas dans `src`).
2. Vérifier que les fichiers `install_platform_console.py` et `README.md` sont à la racine.
3. Lancer :

```bash
cd ~/KALYNO-admin
python install_platform_console.py
npm test
npm run build
```

Le script exige la branche `feat/platform-api-v1`, un dépôt Git propre et les points d'ancrage attendus. Il refuse d'écraser les nouveaux fichiers s'ils existent déjà. Il sauvegarde `App.tsx` et `platformApi.ts` dans `.kalyno-backup-platform-console-*`.

## Publication
Uniquement si les tests et le build réussissent :

```bash
git add src
git commit -m "feat(admin): add platform API console"
git push origin feat/platform-api-v1
```

## Retour arrière
Depuis la racine du dépôt, remplacer `src/App.tsx` et `src/lib/platformApi.ts` par leurs copies dans le dossier `.kalyno-backup-platform-console-*`, puis supprimer `src/PlatformApiManager.tsx` et `src/PlatformApiManager.css`. Faire cela uniquement si aucun autre changement n'a été ajouté depuis l'installation.

## Limites connues
- La liste est limitée à 100 éléments car l'API actuelle plafonne `limit` à 100.
- La suppression n'est pas proposée dans l'interface.
- Les brouillons restent internes ; « Validé » n'entraîne pas une publication aux élèves.
- La console nécessite une session Supabase authentifiée avec `profiles.role = admin`.
