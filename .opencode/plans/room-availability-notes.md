## Answer
L'endpoint `GET /rooms/:id/availability?date=YYYY-MM-DD` doit être ajouté dans `src/routes/rooms.ts`
sans modifier `src/store.ts` (interdit par AGENTS.md:32). Le store n'offre qu'un filtrage par salle
(`bookingsForRoom`), aucun par date : la logique de calcul de créneaux libres doit vivre dans un
nouveau module pur `src/lib/` avec `export default`, respectant la convention `Result` (AGENTS.md:20).
Les tests doivent être nommés `test/*.spec.ts` et utiliser `fetch` natif sur `app.listen(0)`.

## How it works
1. Le client appelle `GET /rooms/:id/availability?date=YYYY-MM-DD` routé par `src/app.ts:9` vers `src/routes/rooms.ts`.
2. La route vérifie la salle via `findRoom(id)` (`src/store.ts:53`). Si absente -> 404 (`src/routes/rooms.ts:13`).
3. La date demandée (`req.query.date`) est validée au format `YYYY-MM-DD` (`AGENTS.md:24`). Si invalide -> 400.
4. Les réservations existantes sont récupérées avec `bookingsForRoom(id)` (`src/store.ts:57`).
5. Un module pur dans `src/lib/` calcule les intervalles disponibles sur la journée demandée.
6. La route répond 200 avec le tableau des créneaux libres en ISO 8601 UTC strings (`AGENTS.md:24`).

## Key files
src/app.ts:9 — monte `roomsRouter` sur `/rooms`.
src/routes/rooms.ts:10-17 — routeurs des salles ; point d'ancrage pour `GET /:id/availability`.
src/store.ts:53-59 — `findRoom` et `bookingsForRoom` ; fichier gelé en modif (`AGENTS.md:32`).
src/lib/overlap.ts:6-12 — fonction de collision d'intervalles temporels.
src/lib/validate.ts:4-30 — helpers de validation jetant `ValidationError` (statut 400).
test/bookings.test.ts:4-14 — helper de test d'API avec `createApp()`, `app.listen(0)` et `fetch`.
vitest.config.ts:7 — filtre d'exécution Vitest ciblant strictement `test/**/*.spec.ts`.

## Gotchas
- `vitest.config.ts:7` ignore `*.test.ts` : tout nouveau fichier de test DOIT finir par `.spec.ts`.
- `npm test` n'existe pas dans `package.json:7-13`, seul `test:unit` existe (malgré `AGENTS.md:12`).
- `src/store.ts:32` est strictement en lecture seule ; pas de méthode de filtrage temporel.
- `src/lib/overlap.ts:11` utilise `<=` au lieu de `<` pour `[debut, fin[`, faussant les créneaux contigus.
- Divergence d'erreurs : `AGENTS.md:20` exige `Result`, mais `validate.ts:4` jette `ValidationError` et `bookings.ts:19` fait un `try/catch`.
- `src/lib/AGENTS.md:5-9` impose `export default` et pas de JSDoc, contredisant `AGENTS.md:18`.
- Tests CI désactivés : `.github/workflows/ci.yml:19` a commenté `npm run test:unit`.

## Unknowns
- Plage horaire d'ouverture : aucune constante (ex: 8h-20h ou 00h-24h UTC) n'existe dans le code. Déterminer si la journée couvre 00h-24h ou des heures ouvrées spécifiques exige clarification.
- Format exact de la réponse JSON : les clés de créneaux (`{ startsAt, endsAt }` vs `{ start, end }` ou tranches d'1h) ne sont pas spécifiées.
