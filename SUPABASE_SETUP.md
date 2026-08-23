# Supabase Backend Reset

This project is ready to work with a new Supabase backend through the local CLI.

## 1. Install dependencies

```powershell
npm install
```

## 2. Log in to Supabase

```powershell
npm run sb:login
```

## 3. Configure this repo for the new project

```powershell
npm run sb:configure -- -ProjectRef <new-project-ref> -AnonKey <anon-key>
```

Example:

```powershell
npm run sb:configure -- -ProjectRef abcdefghijklmnop -AnonKey eyJ...
```

This updates `.env` and `supabase/config.toml`.

## 4. Link this repo to the new Supabase project

```powershell
npm run sb:link -- --project-ref <new-project-ref>
```

Example:

```powershell
npm run sb:link -- --project-ref abcdefghijklmnop
```

## 5. Push migrations to the new project

```powershell
npm run sb:db:push
```

## 6. Regenerate TypeScript types

```powershell
npm run sb:types
```

## 7. Deploy the admin edge functions

```powershell
npm run sb:functions:deploy
npx supabase functions deploy admin-delete-user --no-verify-jwt
npx supabase functions deploy admin-update-subscription --no-verify-jwt
```

## 8. Set edge function secrets

```powershell
npm run sb -- secrets set SUPABASE_URL=https://<new-project-ref>.supabase.co SUPABASE_ANON_KEY=<anon-key> SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## 9. Update local frontend env vars

Update `.env` with:

```env
SUPABASE_URL="https://<new-project-ref>.supabase.co"
SUPABASE_PUBLISHABLE_KEY="<anon-key>"
VITE_SUPABASE_PROJECT_ID="<new-project-ref>"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon-key>"
VITE_SUPABASE_URL="https://<new-project-ref>.supabase.co"
```

## Useful local commands

```powershell
npm run sb:start
npm run sb:status
npm run sb:stop
```
