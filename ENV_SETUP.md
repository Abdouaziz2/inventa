# 🔧 Configuration Guide - Environment Setup

Pour que la landing page fonctionne complètement, vous devez configurer les variables d'environnement.

---

## 📋 Variables Requises

### 1. Créer le fichier `.env.local`

À la racine du projet, créez un fichier `.env.local` (à ne PAS committer en git):

```bash
# .env.local
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_BACKEND_URL=http://localhost:3001
```

### 2. Obtenir les Credentials Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Connectez-vous à votre projet
3. Allez dans **Settings** → **API**
4. Copiez:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon/Public key** → `VITE_SUPABASE_PUBLISHABLE_KEY`

Exemple:
```bash
VITE_SUPABASE_URL=https://xyzabc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Backend URL (Optionnel)

Si vous avez un backend Node.js/Express:
```bash
VITE_BACKEND_URL=http://localhost:3001
```

Sinon, vous pouvez laisser vide ou commenter.

---

## 🚀 Démarrer le Projet

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer les variables d'environnement
```bash
# Créer .env.local avec les credentials
echo "VITE_SUPABASE_URL=your_url" > .env.local
echo "VITE_SUPABASE_PUBLISHABLE_KEY=your_key" >> .env.local
```

### 3. Démarrer le serveur de développement
```bash
npm run dev
```

→ Ouvrez http://localhost:8080

### 4. Builder pour production
```bash
npm run build
```

→ Output dans `dist/`

---

## 📝 Structure des Variables

### Supabase
```
VITE_SUPABASE_URL
├─ Required: OUI
├─ Type: String
├─ Format: https://your-project.supabase.co
└─ Source: Supabase Dashboard → Settings → API
```

### Supabase Key
```
VITE_SUPABASE_PUBLISHABLE_KEY
├─ Required: OUI
├─ Type: String (JWT token)
├─ Format: eyJhbGc... (très long)
└─ Source: Supabase Dashboard → Settings → API → Anon/Public
```

### Backend URL
```
VITE_BACKEND_URL
├─ Required: NON (fallback: http://localhost:3000)
├─ Type: String
├─ Format: http://localhost:3001
└─ Source: Your backend server address
```

---

## ✅ Validation

Après configuration, vérifiez que tout fonctionne:

### 1. Variables Chargées
```bash
# Dans le navigateur (console)
console.log(import.meta.env.VITE_SUPABASE_URL)
```

Vous devriez voir l'URL Supabase (pas "undefined").

### 2. Landing Page Charge
```
http://localhost:8080 → Devrait afficher la landing page complète
```

### 3. Pas d'Erreurs Console
```bash
# Ouvrez F12 → Console
# Vérifiez qu'il n'y a pas d'erreur rouge "Missing Supabase..."
```

### 4. CTAs Fonctionnent
```bash
# Cliquez sur "Commencer" → Devrait aller à /login
# Cliquez sur "Essayer gratuitement" → Devrait aller à /login
```

---

## 🔐 Sécurité

### ✅ À FAIRE
- [x] Créer `.env.local` localement
- [x] Utiliser les clés Supabase **publiques** (Anon key)
- [x] Ajouter `.env.local` à `.gitignore`
- [x] Ne jamais committer les credentials

### ❌ À NE PAS FAIRE
- [x] Utiliser les clés privées Supabase (Service key)
- [x] Committer `.env.local` en git
- [x] Hardcoder les secrets dans le code
- [x] Partager les credentials sur Slack/Discord

### .gitignore
Vérifiez que `.gitignore` contient:
```gitignore
# Environment variables
.env.local
.env.*.local
```

---

## 🚨 Troubleshooting

### Erreur: "Missing Supabase environment variables"

**Cause**: Variables d'environnement non configurées

**Solution**:
1. Créez `.env.local` à la racine du projet
2. Ajoutez `VITE_SUPABASE_URL=your_url`
3. Ajoutez `VITE_SUPABASE_PUBLISHABLE_KEY=your_key`
4. Relancez le serveur dev (`npm run dev`)

### Erreur: "Cannot read property 'auth' of undefined"

**Cause**: Supabase client n'a pas été initialisé correctement

**Solution**:
1. Vérifiez que les credentials sont corrects
2. Vérifiez l'URL Supabase (doit contenir `supabase.co`)
3. Redémarrez le serveur dev

### Erreur: "Unauthorized" lors du signup

**Cause**: La clé Supabase est invalide ou n'a pas les bonnes permissions

**Solution**:
1. Allez dans Supabase Dashboard
2. Vérifiez que vous utilisez l'**Anon/Public key** (pas Service key)
3. Vérifiez les Row Level Security policies

### La page affiche une page blanche

**Cause**: Erreur JavaScript pas catchée

**Solution**:
1. Ouvrez F12 → Console
2. Vérifiez s'il y a une erreur rouge
3. Vérifiez que `.env.local` existe
4. Vérifiez que les variables sont valides

---

## 🔗 Ressources

### Supabase
- [Dashboard](https://app.supabase.com)
- [Documentation](https://supabase.com/docs)
- [API Keys Guide](https://supabase.com/docs/guides/api/keys)

### Vite
- [Vite Docs](https://vitejs.dev)
- [Environment Variables](https://vitejs.dev/guide/env-and-mode.html)

### React
- [React Docs](https://react.dev)
- [React Router](https://reactrouter.com)

---

## 📊 Variables par Environnement

### Development (.env.local)
```bash
VITE_SUPABASE_URL=https://dev-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=dev_anon_key_...
VITE_BACKEND_URL=http://localhost:3001
```

### Staging (.env.staging)
```bash
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=staging_anon_key_...
VITE_BACKEND_URL=https://staging-api.example.com
```

### Production (.env.production)
```bash
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=prod_anon_key_...
VITE_BACKEND_URL=https://api.example.com
```

**Note**: En production, les variables sont généralement définies dans:
- Docker env
- CI/CD secrets (GitHub Secrets, GitLab CI)
- Platform (Vercel, Netlify, Heroku env vars)

---

## ✨ Tips

### 1. Copier facilement les credentials
```bash
# Depuis Supabase Dashboard
1. Settings → API
2. Project URL: Copier avec le bouton "Copy"
3. Anon key: Copier avec le bouton "Copy"
4. Coller dans .env.local
```

### 2. Vérifier rapidement la config
```bash
# Ajouter en haut de src/lib/supabase.ts
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL ? '✅' : '❌');
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? '✅' : '❌');
```

### 3. Recharger après .env changes
```bash
# Les changements de .env.local ne sont appliqués que au redémarrage
npm run dev  # Kill + redémarrer
```

### 4. Utiliser un fichier .env.example
```bash
# Créez .env.example (committé en git)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_public_anon_key
VITE_BACKEND_URL=http://localhost:3001

# Les nouveaux devs copient:
cp .env.example .env.local
# Puis éditent avec leurs credentials
```

---

## 🎯 Next Steps

1. ✅ Créer `.env.local` avec credentials Supabase
2. ✅ Vérifier que les variables se chargent
3. ✅ Lancer `npm run dev`
4. ✅ Visiter http://localhost:8080
5. ✅ Tester les CTAs → /login
6. ✅ Tester le signup complet

---

## 📞 Support

**Variables non chargées?**
→ Vérifiez que `.env.local` est à la racine (même niveau que `package.json`)

**Toujours pas de variable?**
→ Vérifiez qu'aucun IDE/terminal cache le fichier

**Erreur Supabase?**
→ Allez dans Supabase Dashboard et vérifiez les Row Level Security policies

