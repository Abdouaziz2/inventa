export const getErrorMessage = (error: unknown, fallback = "Une erreur est survenue") => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallback;
};
