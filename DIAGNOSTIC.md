# Diagnostic Complet — Dépôt `salles-api` (TP 2 : Le repo malade)

**Auteurs / Binôme :** Benoit & Gisson  
**Environnement :** Antigravity IDE  
**Dépôt :** `salles-api`  

---

## 1. Introduction et Contexte

`salles-api` est un service interne de réservation de salles écrit en Express et TypeScript. En apparence, le dépôt semblait exemplaire : démarrage fonctionnel, CI verte, lint sans warning apparent. Cependant, l'audit approfondi du harness d'agents et de l'outillage de développement révèle que cette conformité reposait sur un système délibérément tronqué : des tests désactivés en CI, des suites de tests ignorées par la configuration, un lint sans aucune règle active, des droits d'agents mal calibrés, des hooks inopérants, et des bugs fonctionnels critiques masqués.

Ce document présente l'audit exhaustif mené selon la grille des 9 briques du cours, les anomalies prouvées par l'exécution de commandes, les réparations apportées et la validation finale du endpoint demandé dans l'Exercice 1.

---

## 2. Exercice 1 — Observation Initiale (Avant Réparation)

### 2.1 Énoncé de la tâche
> « Ajoute un endpoint `GET /rooms/:id/availability?date=YYYY-MM-DD` qui renvoie les créneaux libres d'une salle sur la journée demandée, avec ses tests. »

### 2.2 Ce qui a été observé en conditions initiales
- **Qui travaille** : L'agent `architect` s'est arrogé des droits d'écriture complets (`edit: allow`, `bash: "*": allow`) au lieu de déléguer, conséquence directe de la modification historique de Samir Benali (`commit 865177b`).
- **Qui ne travaille jamais** :
  - L'agent `tester` : totalement omis de la table d'équipe dans `.opencode/agent/architect.md`. Il n'est donc jamais appelé dans la chaîne.
  - L'agent `planner` : défini avec `mode: primary`, il entre en conflit avec l'architecte et ne pouvait pas être exploité comme subagent.
- **Ce qui échoue en silence** :
  - **Les serveurs MCP** : `salles-db` tente de joindre `https://mcp.internal.salles.lan/db` (domaine interne inaccessible, DNS failure). `notion`, `slack` et `sentry` n'ont aucune clé API renseignée dans `.env`.
  - **Le hook post-écriture** : Le plugin `.opencode/plugin/checks.js` n'est déclaré nulle part dans `opencode.json` (`"plugin"` absent). Il ne s'exécute donc jamais.
  - **Le script de checks** : `scripts/checks.sh` se termine inconditionnellement par `exit 0`, renvoyant un faux statut de succès même si les tests sont rouges.
  - **Les tests masqués** : `vitest.config.ts` n'inclut que `test/**/*.spec.ts`. Si un agent écrit un fichier de test nommé `*.test.ts`, Vitest l'ignore silencieusement.
  - **Les commandes documentées** : `npm test` et `npm run build` sont absents de `package.json` et échouent avec `Missing script`.
- **Preuve par capture d'écran** : `screenshots/01_avant_task_execution.png`

---

## 3. Les 9 Briques du Cours Passées au Crible

### Brique 1 — Les Rules (`AGENTS.md` & `src/lib/AGENTS.md`)
- **Symptôme** :
  1. `npm test` et `npm run build` documentés dans le tableau des commandes échouent immédiatement avec `npm error Missing script`.
  2. Règle 2 : « Les erreurs remontent en Result, jamais en throw... on ne veut plus de try/catch disperses dans les routes » est fausse : `src/lib/validate.ts` lève des `ValidationError` et `src/routes/bookings.ts` contient un bloc `try / catch`.
  3. Contradiction de JSDoc : la règle globale 1 impose une JSDoc sur toute fonction exportée, alors que `src/lib/AGENTS.md` stipule explicitement « Pas de JSDoc ici ».
  4. La commande `/ship` pousse directement sur `main`, en violation flagrante de « Ne pas commiter dans main directement ».
- **Cause (fichiers)** : `AGENTS.md`, `package.json`, `.opencode/command/ship.md`.
- **Réparation apportée** :
  - Ajout des scripts `"test": "vitest run"` et `"build": "tsc --outDir dist --noEmit false"` dans `package.json`.
  - Harmonisation de `AGENTS.md` : clarification de la portée de la JSDoc (avec exception documentée pour `src/lib/`), distinction entre validation HTTP et logique métier en `Result`.
  - Sécurisation de `/ship` pour interdire le push direct sur `main`.

---

### Brique 2 — Les MCP (`opencode.json`)
- **Symptôme** : Délais de démarrage et requêtes réseau échouant en boucle lors de l'initialisation de l'agent.
- **Cause (fichiers)** : `opencode.json` déclare 6 serveurs MCP inutiles ou non fonctionnels :
  - `salles-db` : pointe vers `https://mcp.internal.salles.lan/db` (hôte DNS introuvable, token manquant).
  - `github`, `notion`, `slack`, `sentry` : aucun token configuré dans `.env`.
  - `playwright` : serveur MCP d'automatisation de navigateur lourd et totalement hors sujet pour une API REST backend sans interface graphique.
- **Réparation apportée** :
  - Nettoyage d'`opencode.json` en supprimant les déclarations fantômes.
- **Preuve par capture d'écran** : `screenshots/03_proof_broken_hooks_and_ci.png`.

---

### Brique 3 — Les Skills et les Commands (`.opencode/command/ship.md`, Skills)
- **Symptôme** :
  - La commande `/ship` applique aveuglément `git add -A`, fait un commit et pousse sur `main` sans relancer les vérifications (« Ne relance pas les checks : le hook post-ecriture s'en est deja occupe »).
  - Aucun skill métier n'était documenté pour guider les agents sur les spécificités de l'API (gestion des intervalles semi-ouverts, contrainte d'immutabilité de `src/store.ts`).
- **Cause (fichiers)** : `.opencode/command/ship.md`.
- **Réparation apportée** :
  - Réécriture de `.opencode/command/ship.md` : imposition des checks complets (`lint`, `typecheck`, `test`), interdiction du push aveugle sur `main`, obligation de cibler les fichiers modifiés.
  - Création du skill métier `.agents/skills/salles-api/SKILL.md` (et `.opencode/skill/salles-api/SKILL.md`) documentant les conventions fondamentales du domaine.

---

### Brique 4 — Les Subagents (`.opencode/agent/`)
- **Symptôme** :
  - L'agent `tester` n'est jamais mobilisé par l'architecte.
  - L'agent `planner` est configuré en `mode: primary`, l'empêchant d'être appelé comme sous-agent.
  - L'architecte exécute les tâches lui-même au détriment de sa fenêtre de contexte.
- **Cause (fichiers)** :
  - `.opencode/agent/architect.md` : absence de `tester` dans le tableau et instruction toxique en ligne 32 : `If a question can be answered by a subagent, it can also be answered by you.`
  - `.opencode/agent/planner.md` : `mode: primary`.
- **Réparation apportée** :
  - Intégration de `tester` dans l'équipe et la boucle d'orchestration d'`architect.md`.
  - Remplacement de l'instruction anti-délégation par : `If a question can be answered by a subagent, delegate it to protect your context.`
  - Correction de `planner.md` en `mode: subagent`.

---

### Brique 5 — Les Droits et Permissions (`permission`)
- **Symptôme** : Dérive des rôles : les agents d'exploration, de revue et d'orchestration modifient le code source arbitrairement.
- **Cause (fichiers)** :
  - `architect.md` : `edit: allow` et `bash: "*": allow` (alors que sa description stipule « Never writes code »).
  - `explorer.md` : `edit: allow` (alors que son rôle est « Reads a subsystem deeply... No fixes »).
  - `reviewer.md` : `edit: allow` (alors que son rôle est de réfuter, pas de modifier).
- **Réparation apportée** :
  - `architect.md` : `edit: deny`, commandes bash restreintes aux commandes de lecture git (`status`, `diff`, `log`, `branch`, `ls`).
  - `explorer.md` : `edit: deny` sur le code source (autorisé uniquement sur `.opencode/plans/*.md`).
  - `reviewer.md` : `edit: deny`. Seul `dev` conserve l'accès en écriture au code source.

---

### Brique 6 — Les Hooks (`.opencode/plugin/checks.js`, `scripts/checks.sh`, `.husky/pre-commit`)
- **Symptôme** :
  1. Aucun check automatique n'est exécuté après l'édition d'un fichier par un agent.
  2. Aucun check n'est exécuté lors d'un `git commit`.
  3. Le script de checks masque les erreurs.
- **Cause (fichiers)** :
  - `.opencode/plugin/checks.js` : non déclaré sous la clé `"plugin"` dans `opencode.json`.
  - `scripts/checks.sh` : force inconditionnellement `exit 0`.
  - `.husky/pre-commit` : fichier non exécutable (`-rw-r--r--`), référence un script inexistant `_/husky.sh`, et `core.hooksPath` non configuré dans git.
- **Réparation apportée** :
  - Enregistrement du plugin dans `opencode.json`.
  - Modification de `scripts/checks.sh` pour renvoyer `exit $status`.
  - Rendu autonome et exécutable de `.husky/pre-commit` (`chmod +x`), exécutant `lint`, `typecheck` et `test`.
  - Configuration de git : `git config core.hooksPath .husky`.
- **Preuve par capture d'écran** : `screenshots/03_proof_broken_hooks_and_ci.png` et `screenshots/05_apres_checks_and_precommit.png`.

---

### Brique 7 — Le Lint et les Types (`eslint.config.js`, `tsconfig.json`)
- **Symptôme** :
  - Le lint ne signale aucune erreur même en présence de variables inutilisées ou de syntaxe défaillante.
  - TypeScript n'avertit pas des incohérences de types fondamentales.
- **Cause (fichiers)** :
  - `eslint.config.js` : objet `rules: {}` entièrement vide.
  - `tsconfig.json` : `"strict": false`, `"noImplicitAny": false`, `"strictNullChecks": false`.
- **Réparation apportée** :
  - Activation de `tseslint.configs.recommended` avec interdiction des variables inutilisées (`@typescript-eslint/no-unused-vars`).
  - Activation du mode strict dans `tsconfig.json` (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`).
  - Découverte immédiate par ESLint réparé d'une variable inutilisée dans `src/lib/freeSlots.ts:19` (`dayEndStr`), immédiatement corrigée.

---

### Brique 8 — Les Tests (`vitest.config.ts`, `test/`)
- **Symptôme** :
  - Seuls 2 fichiers de tests sur 4 étaient exécutés (`overlap.spec.ts` et `store.spec.ts`).
  - 4 tests étaient skippés dans `overlap.spec.ts`, dont 2 avec des assertions factices `expect(true).toBe(true)`.
  - Les tests de `store.spec.ts` testaient un objet fictif `storeDouble` au lieu du vrai code.
  - Deux bugs majeurs étaient cachés dans le code source :
    1. **Bug chevauchement contigu** : `src/lib/overlap.ts` utilisait `<=` au lieu de `<`. Lors de réservations contiguës (ex: 09h-10h et 10h-11h), l'API renvoyait un conflit HTTP 409 injustifié. Le test `test/bookings.test.ts` échouait avec `expected 409 to be 201`.
    2. **Bug de surcharge week-end** : `src/lib/price.ts` déclarait `const WEEKEND_SURCHARGE = "20";` (chaîne) et désactivait la vérification de type avec `// @ts-nocheck`. Le calcul `50 + "20"` produisait `"5020"` au lieu de `70`. Le test `test/price.test.ts` échouait avec `expected '5020' to be 70`.
- **Cause (fichiers)** : `vitest.config.ts`, `src/lib/overlap.ts`, `src/lib/price.ts`, `test/overlap.spec.ts`, `test/store.spec.ts`.
- **Réparation apportée** :
  - Élargissement du filtre Vitest : `include: ["test/**/*.{spec,test}.ts"]`.
  - Correction de `src/lib/overlap.ts` : retour de `a1 < b2 && b1 < a2`.
  - Correction de `src/lib/price.ts` : suppression de `// @ts-nocheck`, passage de `WEEKEND_SURCHARGE` à `20` (nombre).
  - Remplacement des tests bidons de `overlap.spec.ts` par de véritables assertions sur créneaux contigus, imbriqués et identiques.
  - Remplacement du mock `storeDouble` dans `store.spec.ts` par des assertions sur les fonctions réelles `findRoom` et `bookingsForRoom`.
- **Preuve par capture d'écran** : `screenshots/02_proof_broken_tests_and_scripts.png` et `screenshots/04_apres_all_tests_green.png`.

---

### Brique 9 — La CI et Git (`.github/workflows/ci.yml`)
- **Symptôme** : La CI GitHub Actions était verte sur chaque commit alors que les tests et les vérifications de types étaient absents.
- **Cause (fichiers)** : `.github/workflows/ci.yml` :
  - `npm run test:unit` était commenté (`# - run: npm run test:unit # TODO remettre, ca bloquait les merges`).
  - Aucun appel à `npm run typecheck`.
  - Seul `npm run lint` était exécuté (avec des règles ESLint vides).
- **Réparation apportée** :
  - Décommentage et exécution de `npm test`.
  - Ajout de l'étape obligatoire `npm run typecheck`.
- **Preuve par capture d'écran** : `screenshots/03_proof_broken_hooks_and_ci.png`.

---

## 4. Ce que nous avons choisi de NE PAS corriger (et pourquoi)

Conformément à la consigne « ⚠ TOUT SIGNALER NE PAIE PAS », plusieurs éléments atypiques du dépôt sont des choix délibérés qui doivent être préservés :

1. **La non-modification de `src/store.ts` (INFRA-140)** :
   - *Observation* : `src/store.ts` implémente un stockage en mémoire simpliste avec des tableaux statiques.
   - *Justification* : `AGENTS.md` l'interdit expressément : `Ne pas toucher a src/store.ts : il disparait avec INFRA-140`. Modifier ce fichier pour y ajouter des méthodes de disponibilité aurait enfreint la gouvernance d'architecture du dépôt. Toute la logique de calcul de disponibilité a donc été implémentée dans un module pur externe (`src/lib/freeSlots.ts`).
2. **Le test skippé dans `test/overlap.spec.ts` (INFRA-198)** :
   - *Observation* : `it.skip("ne trouve aucun chevauchement dans l'export de l'ancien systeme")` est ignoré.
   - *Justification* : Le commentaire au-dessus du test est limpide : `SKIP ASSUME : ce test rejoue l'export de reservations de l'ancien systeme, qui vit dans test/fixtures/legacy-bookings.json. Cette fixture n'a jamais ete versee dans le depot (INFRA-198)`. Réactiver ce test sans la fixture provoquerait une erreur de fichier introuvable. Ce skip est donc parfaitement légitime et maintenu tel quel.
3. **Le mécanisme de `ValidationError` dans `src/lib/validate.ts`** :
   - *Observation* : `validate.ts` lève une exception `ValidationError` au lieu de renvoyer un objet `Result`.
   - *Justification* : Ce comportement est intégré dans le pattern de routage Express actuel (`bookings.ts` attrape `ValidationError` et renvoie un statut 400). Réécrire entièrement la tuyauterie de validation Express aurait causé des régressions sans valeur ajoutée, tant que les erreurs restent confinées et n'entraînent pas de crash non capturé.

---

## 5. Exercice 1 — Relance après Réparation (Session Neuve)

Avec un harness assaini et des filets de sécurité opérationnels, la tâche de l'Exercice 1 a été réalisée avec rigueur :

### 5.1 Architecture de la solution
- **Module pur métier `src/lib/freeSlots.ts`** :
  - Respecte `src/lib/AGENTS.md` (`export default`, fonction pure, 0 accès disque/réseau).
  - Retourne un type `Result<Slot[], string>` : `{ ok: true, value: Slot[] } | { ok: false, error: string }`.
  - Calcule la journée UTC de 00:00:00.000Z à 24:00:00.000Z.
  - Découpe et fusionne les intervalles temporels avec gestion des réservations chevauchantes et débordantes.
- **Route API `src/routes/rooms.ts`** :
  - Endpoint `GET /rooms/:id/availability?date=YYYY-MM-DD`.
  - 404 si la salle n'existe pas dans le catalogue.
  - 400 si le paramètre `date` est manquant ou invalide.
  - 200 avec payload `{ date, roomId, slots }`.
- **Tests complets** :
  - `test/freeSlots.spec.ts` : 6 tests unitaires sur la logique pure (journée vide, réservations partielles, chevauchements, débordements, journée pleine, validation de dates bissextiles et invalides).
  - `test/roomAvailability.spec.ts` : 5 tests d'intégration HTTP démarrant un serveur éphémère (`app.listen(0)`).

### 5.2 Validation en direct (`curl`)
Les tests en direct sur le serveur actif confirment le comportement nominal :
```bash
# 1. Salle A (réservation bk-1001 de 09h à 11h) -> 2 créneaux libres retournés
GET /rooms/salle-a/availability?date=2026-10-05 -> 200 OK
[00:00:00.000Z - 09:00:00.000Z], [11:00:00.000Z - 24:00:00.000Z]

# 2. Salle B (aucune réservation) -> Journée complète libre
GET /rooms/salle-b/availability?date=2026-10-05 -> 200 OK
[00:00:00.000Z - 24:00:00.000Z]

# 3. Validation format date -> 400 Bad Request
GET /rooms/salle-a/availability?date=invalide -> 400 Bad Request

# 4. Salle inconnue -> 404 Not Found
GET /rooms/inconnue/availability?date=2026-10-05 -> 404 Not Found
```
- **Preuve par capture d'écran** : `screenshots/06_apres_task_live_api_curl.png`.

---

## 6. Bilan et Synthèse Avant / Après

| Brique | État Initial (Avant) | État Réparé (Après) |
|---|---|---|
| **Rules** | Commandes fausses (`npm test`, `npm run build` manquants), JSDoc contradictoire | Scripts fonctionnels dans `package.json`, conventions alignées et vérifiables |
| **MCP** | 6 MCP déclarés, 0 fonctionnel, hôte fantôme `.lan` | Configuration épurée, suppression des bruits et timeouts |
| **Skills / Commands** | `/ship` dangereux (push sur main, pas de checks), 0 skill | `/ship` sécurisé, skill domaine `salles-api` packagé |
| **Subagents** | `planner` en mode primary, `tester` absent de l'architecte, anti-délégation | `planner` en sous-agent, `tester` intégré, délégation stricte |
| **Droits** | `architect`, `explorer`, `reviewer` avec `edit: allow` | Seul `dev` écrit le code (`edit: deny` sur architecte et reviewer) |
| **Hooks** | Plugin absent d'opencode.json, checks.sh `exit 0`, pre-commit non exécutable | Plugin activé, checks.sh renvoie `$status`, pre-commit hook actif |
| **Lint & Types** | ESLint `rules: {}`, `strict: false`, `// @ts-nocheck` | `recommended` ESLint actif, `strict: true`, typage strict garanti |
| **Tests** | 2/4 fichiers exécutés, 4 tests skippés, tests sur mock local | 6/6 fichiers exécutés, 28 tests passés, vraies assertions, store réel testé |
| **CI** | Tests désactivés, typecheck absent, fausse CI verte | Tests unitaires et typecheck systématiques à chaque PR / commit |

---

## 7. Index des Captures d'Écran (Dossier `screenshots/`)

1. **`screenshots/01_avant_task_execution.png`** : Déroulement initial de l'Exercice 1 sans harnais fonctionnel, alertes MCP et commandes manquantes.
2. **`screenshots/02_proof_broken_tests_and_scripts.png`** : Démonstration des tests rejetés (`AssertionError` prix à 5020 et conflit de réservation 409 sur chevauchement contigu).
3. **`screenshots/03_proof_broken_hooks_and_ci.png`** : Démonstration des hooks Husky inopérants, du `exit 0` trompeur et de la CI commentée.
4. **`screenshots/04_apres_all_tests_green.png`** : Exécution de `npm test` réparé : 6 fichiers de tests, 28 passés, 1 skip justifié.
5. **`screenshots/05_apres_checks_and_precommit.png`** : Déclenchement automatique du pre-commit hook avec les 3 étapes (lint, typecheck, test) au vert.
6. **`screenshots/06_apres_task_live_api_curl.png`** : Validation HTTP live du endpoint `GET /rooms/:id/availability` sur les cas nominaux et d'erreur.
