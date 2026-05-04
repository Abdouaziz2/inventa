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

## Connexion

Les connexions passent par Supabase Authentication. Creez les comptes dans Supabase `Authentication > Users`, puis connectez-vous avec l'email et le mot de passe Supabase.

L'ancien compte local `admin` / `admin123` n'est pas autorise dans le mode production.

## Scripts utiles

- `npm run dev` : frontend Vite
- `npm run dev:api` : API Express locale
- `npm run dev:full` : API + frontend
- `npm run build` : build frontend
- `npm run test` : tests
- `npm run lint` : lint

## Production

Les secrets ne doivent pas etre commits dans le repo. Configurez les variables dans Vercel puis gardez seulement un `.env` local ignore par Git.

Voir [PRODUCTION_ENV.md](PRODUCTION_ENV.md) pour la liste exacte des variables, ou les trouver dans Supabase, et comment les ajouter dans Vercel.

Les comptes doivent etre crees dans Supabase `Authentication > Users`. A la premiere connexion, l'API cree le profil local necessaire et isole automatiquement les donnees de chaque admin avec `company_id`.
