# KALYNO Platform API v1

## Périmètre initial

La première version crée une couche métier REST versionnée au-dessus de Supabase. Elle complète PostgREST et le MCP existant ; elle ne remplace ni l'un ni l'autre.

Base URL : `https://nscxeuaouowaemlqjagk.supabase.co/functions/v1/kalyno-platform-api`
Préfixe : `/v1`

Toutes les routes de cette première version exigent un JWT Supabase valide appartenant à un utilisateur dont `profiles.role = 'admin'`.

## Routes

| Méthode | Route | Fonction |
|---|---|---|
| GET | `/v1/health` | Vérifier l'API |
| GET | `/v1/capabilities` | Lister les modules actifs |
| GET | `/v1/exam-tracks` | Lister les concours |
| GET | `/v1/studio/drafts?limit=50` | Lister les brouillons |
| POST | `/v1/studio/drafts` | Créer un brouillon |
| GET | `/v1/studio/drafts/{id}` | Lire un brouillon |
| PATCH | `/v1/studio/drafts/{id}` | Modifier un brouillon/statut |
| DELETE | `/v1/studio/drafts/{id}?confirm=true` | Supprimer définitivement après confirmation explicite |

## Authentification

Envoyer les deux en-têtes :

```http
apikey: sb_publishable_...
Authorization: Bearer <SUPABASE_USER_ACCESS_TOKEN>
```

La clé publishable n'est pas un jeton utilisateur. Ne jamais envoyer une clé secrète ou `service_role` au navigateur ou à l'APK. La fonction utilise le JWT de l'utilisateur pour les requêtes de base de données ; les politiques RLS restent actives.

## Exemple de création

```json
{
  "exam_track": "cafop",
  "content_type": "course",
  "title": "Les accords du participe passé",
  "objective": "Maîtriser les règles principales.",
  "difficulty": "intermediate",
  "estimated_minutes": 25,
  "content": { "sections": [], "sources": [] },
  "source_note": "Cours de préparation CAFOP"
}
```

## Architecture cible

- KALYNO-admin : client REST commun.
- Android : même API avec le jeton de session Supabase.
- ChatGPT : le MCP `kalyno-french-studio` reste actif ; il utilise déjà OAuth et la même table de brouillons. La convergence de ses outils vers des services métier partagés sera une étape suivante.
- Autres intégrations : contrat REST v1, après attribution d'une identité et de permissions.

## Modules

Le seul module annoncé comme actif par cette version est `studio`. Les routes cours publiés, exercices élèves, corrections, progression, notifications et statistiques ne seront ajoutées qu'après inspection de leurs règles RLS et tests dédiés.

## Déploiement

Déployer les deux fichiers `index.ts` et `contract.ts` comme Edge Function `kalyno-platform-api`, avec `verify_jwt = true`. Vérifier les secrets Supabase automatiques `SUPABASE_URL` et `SUPABASE_ANON_KEY`. Aucun changement SQL n'est requis.

Tester ensuite : administrateur (succès), compte authentifié non-admin (403), requête sans JWT (401), données invalides (400), suppression sans `confirm=true` (409).
