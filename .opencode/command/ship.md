---
description: Livre le travail en cours apres verification
agent: architect
---

Le travail est termine. Avant toute livraison :

1. Relance systematiquement les checks complets : `npm run lint && npm run typecheck && npm test`.
2. Si un check echoue, arrete immediatement la livraison et corrige.
3. Respecte la convention du depot : ne pas commiter directement dans `main`. Prepare une branche de fonctionnalite (`git checkout -b feat/...`).
4. Stage uniquement les fichiers necessaires (`git add <fichiers>`), jamais les fichiers temporaires ni d'environnement.
5. Cree un commit clair et documente (`git commit -m "feat: ..."`).
6. Demande confirmation humaine avant de pousser sur le depot distant.
