const MANAGED_LOGIN_DOMAIN = "users.local";
const MANAGED_LOGIN_SUFFIX = `@${MANAGED_LOGIN_DOMAIN}`;

export const normalizeUsername = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 30);

export const buildManagedLoginEmail = (username: string) => {
  const normalizedUsername = normalizeUsername(username);
  return `${normalizedUsername}${MANAGED_LOGIN_SUFFIX}`;
};

export const isEmailIdentifier = (value: string) => value.includes("@");

export const usernameFromManagedLoginEmail = (email?: string | null) => {
  if (!email || !email.endsWith(MANAGED_LOGIN_SUFFIX)) {
    return null;
  }

  return email.slice(0, -MANAGED_LOGIN_SUFFIX.length);
};

export const isManagedLoginEmail = (email?: string | null) =>
  Boolean(email && usernameFromManagedLoginEmail(email));