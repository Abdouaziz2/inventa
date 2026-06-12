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
- `npm run desktop:dev` : application desktop en mode developpement
- `npm run desktop:dir` : version Windows non installee dans `release/win-unpacked`
- `npm run desktop:build` : installateur Windows `.exe` dans `release`
- `npm run test` : tests
- `npm run lint` : lint

## Application Windows

L'application peut etre installee comme un logiciel Windows classique. La
connexion et les donnees restent synchronisees avec Supabase, une connexion
Internet est donc necessaire pour les operations metier.

Pour generer l'installateur :

`npm run desktop:build`

## Abonnements

Chaque compte Supabase Auth possede un abonnement associe a son adresse e-mail.
Les nouveaux comptes recoivent 14 jours d'essai. Quand l'abonnement expire ou
est suspendu, l'interface et les donnees metier sont bloquees.

Le super administrateur dispose du menu `Abonnements` pour :

- rechercher un compte par e-mail ;
- activer, suspendre ou resilier son acces ;
- prolonger l'abonnement de 30 jours ou d'un an.

Pour designer une seule fois le compte proprietaire :

```sql
update public.profiles
set role = 'super_admin'
where email = 'proprietaire@exemple.com';
```

La migration correspondante se trouve dans
[`supabase/sql/v1_subscription_access.sql`](supabase/sql/v1_subscription_access.sql).

## Production

Les secrets ne doivent pas etre commits dans le repo. Configurez les variables dans Vercel puis gardez seulement un `.env` local ignore par Git.

Voir [PRODUCTION_ENV.md](PRODUCTION_ENV.md) pour la liste exacte des variables, ou les trouver dans Supabase, et comment les ajouter dans Vercel.

Les comptes doivent etre crees dans Supabase `Authentication > Users`. A la premiere connexion, l'API cree le profil local necessaire et isole automatiquement les donnees de chaque admin avec `company_id`.
