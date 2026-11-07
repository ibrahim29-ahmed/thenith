function getDaysRemaining(expiresAt) {
  if (!expiresAt) return null;
  const d = new Date(expiresAt).getTime();
  if (isNaN(d)) return null;
  return Math.max(
    0,
    Math.ceil((d - Date.now()) / 86400000),
  );
}

export default { getDaysRemaining };
