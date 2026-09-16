export const startLogin = () => {
  if (typeof window === "undefined") return;
  const current = `${window.location.pathname}${window.location.search}`;
  const next = current.startsWith("/login") ? "/" : current;
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
};
