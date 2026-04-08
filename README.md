# Gems Flow Suite

Application de gestion de bijouterie avec :
- frontend `React + Vite`
- backend local `Node.js + Express`
- base `MySQL` via `XAMPP`

## Demarrage

1. Lancez `Apache` et `MySQL` dans XAMPP.
2. Lancez simplement l'API locale une premiere fois. Le schema [`server/master-schema.sql`](server/master-schema.sql) est applique automatiquement.
3. Verifiez les variables de [`.env`](.env).
4. Lancez l'API :
   `npm run dev:api`
5. Lancez le frontend :
   `npm run dev`

Vous pouvez aussi lancer les deux avec :
`npm run dev:full`

## Compte de demo

- identifiant : `admin`
- mot de passe : `admin123`

## Scripts utiles

- `npm run dev` : frontend Vite
- `npm run dev:api` : API Express locale
- `npm run dev:full` : API + frontend
- `npm run build` : build frontend
- `npm run test` : tests
- `npm run lint` : lint
