---
name: salles-api
description: Guide d'architecture, règles métier et conventions pour le service de réservation salles-api.
---

# Skill : salles-api

Ce skill fournit les directives fondamentales pour intervenir sur le microservice `salles-api`.

## 1. Architecture et Stockage

- **Stockage en mémoire temporaire** : `src/store.ts` héberge les données des salles et des réservations.
- **Règle absolue (INFRA-140)** : Ne JAMAIS modifier `src/store.ts`. Le schéma sera migré vers une vraie base de données par l'équipe infrastructure. Toute logique métier doit être codée à l'extérieur.

## 2. Manipulation des Dates et Créneaux

- **Format strict** : Les dates circulent toujours sous forme de chaînes de caractères au format **ISO 8601 UTC** (`YYYY-MM-DD` pour les journées, `YYYY-MM-DDTHH:mm:ss.sssZ` pour les horodatages complets).
- **Intervalles semi-ouverts** : Tout créneau temporel est modélisé par l'intervalle semi-ouvert `[startsAt, endsAt[`.
  - Deux créneaux `A` et `B` se chevauchent si et seulement si `A.startsAt < B.endsAt && B.startsAt < A.endsAt`.
  - Si `A.endsAt === B.startsAt`, les créneaux sont contigus (bout à bout) et ne se chevauchent pas.
- **Journée complète** : Une journée `YYYY-MM-DD` commence à `YYYY-MM-DDT00:00:00.000Z` et se termine à `(J+1)T00:00:00.000Z`.

## 3. Gestion des Erreurs et Conventions de Code

- **Fonctions pures et calculs métier** (`src/lib/`) : Retournent un type `Result<T, E>` (`{ ok: true, value } | { ok: false, error }`). Ne lèvent jamais d'exception non gérée.
- **Modules dans `src/lib/`** : Un `export default` obligatoire pour la fonction principale. Fonctions strictement pures sans I/O.
- **Routes Express** : Valident les requêtes et transforment les erreurs métier en réponses JSON claires avec les statuts HTTP appropriés (400, 404, 409).

## 4. Tests et Filet de Sécurité

- Tous les fichiers de tests doivent correspondre au motif `test/**/*.{spec,test}.ts`.
- Pour les tests d'intégration d'API, démarrer l'application sur un port éphémère via `app.listen(0)` et utiliser `fetch` natif, puis fermer le serveur dans un bloc `finally`.
- Avant toute livraison : exécuter `npm run lint && npm run typecheck && npm test`.
