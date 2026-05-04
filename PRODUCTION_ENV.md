# Configuration Production

Ce projet ne doit pas contenir de secrets dans le code. Les vraies valeurs vont dans Vercel, et les valeurs locales restent dans un fichier `.env` ignore par Git.

## Ou remplir les variables

### Production Vercel

1. Ouvrir Vercel.
2. Aller dans le projet `gems-flow-suite`.
3. Ouvrir `Settings` > `Environment Variables`.
4. Ajouter les variables ci-dessous dans l'environnement `Production`.
5. Redeployer apres modification.

### Local

1. Copier `.env.example` vers `.env`.
2. Remplir `.env` seulement sur la machine locale.
3. Ne jamais commit `.env`.

## Variables obligatoires

| Variable | Environnement | Secret | Ou la trouver |
| --- | --- | --- | --- |
| `VITE_API_URL` | Production, Preview, Local | Non | Mettre `/api` si le frontend et l'API sont sur le meme domaine Vercel. |
| `CORS_ORIGIN` | Production, Preview, Local | Non | Domaine autorise a appeler l'API. Exemple production: `https://gems-flow-suite.vercel.app`. |
| `JWT_SECRET` | Production, Preview, Local | Oui | Generer une chaine aleatoire longue, au moins 32 caracteres. |
| `JWT_EXPIRES_IN` | Production, Preview, Local | Non | Duree des sessions JWT. Exemple: `7d`. |
| `DATABASE_URL` | Production, Preview, Local | Oui | Supabase `Connect` > `Transaction pooler`. Remplacer `[YOUR-PASSWORD]`. |
| `DIRECT_URL` | Production, Preview, Local | Oui | Supabase `Connect` > `Direct connection`. Remplacer `[YOUR-PASSWORD]`. |
| `SUPABASE_URL` | Production, Preview, Local | Non | Supabase `Project Settings` > `API` ou menu `Connect`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview, Local | Oui | Supabase `Project Settings` > `API Keys` > `service_role`. |
| `SUPABASE_STORAGE_BUCKET` | Production, Preview, Local | Non | Supabase `Storage` > `New bucket`. Utiliser un bucket public pour les logos/photos. |
| `ALLOW_DEFAULT_ADMIN_SEED` | Local uniquement | Non | Mettre `true` seulement pour creer le compte demo local `admin` / `admin123`. Ne pas activer en production. |

## Variables encore a ajouter dans Vercel

Si Vercel contient seulement `JWT_SECRET`, `DATABASE_URL` et `DIRECT_URL`, ajouter aussi en `Production`:

```env
VITE_API_URL=/api
CORS_ORIGIN=https://gems-flow-suite.vercel.app
JWT_EXPIRES_IN=7d
SUPABASE_URL=https://bsingvkmtntkhvkdsypa.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_STORAGE_BUCKET=gems-flow-uploads
ALLOW_DEFAULT_ADMIN_SEED=false
```

Sans `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`, les utilisateurs crees dans Supabase Auth ne pourront pas se connecter.

## Valeurs recommandees pour Vercel Production

```env
VITE_API_URL=/api
CORS_ORIGIN=https://gems-flow-suite.vercel.app
JWT_EXPIRES_IN=7d
SUPABASE_URL=https://bsingvkmtntkhvkdsypa.supabase.co
SUPABASE_STORAGE_BUCKET=gems-flow-uploads
ALLOW_DEFAULT_ADMIN_SEED=false
```

Ajouter ensuite les secrets reels:

```env
JWT_SECRET=<chaine-aleatoire-longue>
DATABASE_URL=<transaction-pooler-url-supabase>
DIRECT_URL=<direct-connection-url-supabase>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## Ou trouver les infos dans Supabase

### `DATABASE_URL`

Dans Supabase:

1. Ouvrir le projet `sunu stock`.
2. Cliquer `Connect`.
3. Choisir `Transaction pooler`.
4. Copier la connection string.
5. Remplacer `[YOUR-PASSWORD]` par le mot de passe database.

Cette URL est adaptee a Vercel/serverless car elle passe par le pooler.

### `DIRECT_URL`

Dans Supabase:

1. Cliquer `Connect`.
2. Choisir `Direct connection`.
3. Copier la connection string.
4. Remplacer `[YOUR-PASSWORD]`.

Cette URL sert aux migrations et operations database directes.

### Database password

Si le mot de passe est perdu:

1. Supabase `Project Settings`.
2. `Database`.
3. `Reset database password`.
4. Mettre a jour `DATABASE_URL` et `DIRECT_URL` dans Vercel.

### `SUPABASE_SERVICE_ROLE_KEY`

Dans Supabase:

1. `Project Settings`.
2. `API Keys`.
3. Copier la cle `service_role`.

Ne jamais exposer cette cle dans le frontend, GitHub, screenshots publics ou logs.

### `SUPABASE_STORAGE_BUCKET`

Dans Supabase:

1. Ouvrir `Storage`.
2. Cliquer `New bucket`.
3. Nom recommande: `gems-flow-uploads`.
4. Cocher `Public bucket`.
5. Ajouter le meme nom dans Vercel: `SUPABASE_STORAGE_BUCKET=gems-flow-uploads`.

Les logos et photos de bijoux seront envoyes dans ce bucket au lieu du disque temporaire Vercel.

## Creer des utilisateurs dans Supabase

1. Supabase `Authentication` > `Users`.
2. Cliquer `Add user`.
3. Renseigner un vrai email et un mot de passe.
4. Confirmer l'email ou cocher l'option qui marque l'email comme confirme.
5. Optionnel: ajouter dans `User Metadata`:

```json
{
  "username": "boutique1",
  "full_name": "Boutique 1",
  "role": "admin"
}
```

Lors de la premiere connexion, l'API cree automatiquement le profil local dans la table `users`. Pour un role `admin`, `company_id` est mis sur l'id du profil local, ce qui isole ses clients, bijoux, ventes, reservations et acomptes.

Pour creer un superadmin via Supabase, definir le role dans les metadata:

```json
{
  "username": "superadmin",
  "full_name": "Super Admin",
  "role": "super_admin"
}
```

Attention: un `super_admin` voit toutes les donnees. Donner ce role uniquement au proprietaire de la plateforme.

## Commandes utiles

Lister les variables Vercel:

```powershell
npx vercel env ls
```

Ajouter une variable:

```powershell
npx vercel env add JWT_SECRET production
```

Tirer les variables Vercel en local:

```powershell
npx vercel env pull .env --environment=production --yes
```

Verifier le build:

```powershell
npm run build
```

## Notes de securite

- `.env` est ignore par Git.
- `.env.example` contient uniquement les noms de variables et des valeurs publiques ou vides.
- `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL` et `JWT_SECRET` doivent rester secrets.
- Le bucket Storage doit etre public seulement pour les fichiers que l'application doit afficher dans le navigateur.
- Pour les previews Vercel, utiliser idealement une base Supabase separee ou des variables Preview differentes de la Production.
