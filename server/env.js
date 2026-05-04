import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

function requireStrongSecret(name, { minLength = 32 } = {}) {
  const value = process.env[name];

  if (!value && isProduction) {
    throw new Error(`${name} is required in production.`);
  }

  if (value && value.length < minLength && isProduction) {
    throw new Error(`${name} must be at least ${minLength} characters in production.`);
  }

  return value;
}

export function requireProductionEnv() {
  if (!isProduction) return;

  requireStrongSecret('JWT_SECRET');

  const required = [
    'DATABASE_URL',
    'CORS_ORIGIN',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }
}
