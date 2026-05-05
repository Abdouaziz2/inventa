# Supabase V1 Runbook

## 1. Variables Vercel

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

## 2. SQL a lancer dans Supabase

Fichier:

```txt
supabase/sql/v1_saas_schema.sql
```

## 3. Auth

- `src/lib/supabase.ts`
- `src/services/auth.ts`
- `src/contexts/AuthContext.tsx`
- `src/pages/LoginPage.tsx`

## 4. Services front

- `src/services/clients.ts`
- `src/services/jewelry.ts`
- `src/services/sales.ts`
- `src/services/storage.ts`

## 5. Hooks front

- `src/hooks/useAuthSession.ts`
- `src/hooks/useClientsSupabase.ts`
- `src/hooks/useJewelrySupabase.ts`
- `src/hooks/useCreateSale.ts`

## 6. A supprimer apres migration ecrans

- `api/`
- `server/`
- `src/lib/api.ts`
- `src/hooks/useDatabase.ts`
- anciens appels `/api/*`

## 7. A garder

- `src/components/*`
- `src/pages/*`
- `src/lib/format.ts`
- `src/lib/errors.ts`
- `src/lib/receipts.ts`
- `src/features/*` apres remplacement progressif des appels API
