const ADMIN_USERNAME = Deno.env.get("ADMIN_USERNAME") ?? "";
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") ?? "";

export const isAdminAuthorized = (req: Request): boolean => {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  const encoded = authHeader.slice("Basic ".length);
  const decoded = atob(encoded);
  const colonIndex = decoded.indexOf(":");
  const username = colonIndex !== -1 ? decoded.slice(0, colonIndex) : "";
  const password = colonIndex !== -1 ? decoded.slice(colonIndex + 1) : decoded;

  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
};
