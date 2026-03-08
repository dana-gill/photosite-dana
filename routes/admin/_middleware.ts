import { define } from "../../utils.ts";
import { isAdminAuthorized } from "../../services/admin-auth-service.ts";

export const handler = define.middleware((ctx) => {
  if (!isAdminAuthorized(ctx.req)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": `Basic realm="Admin"` },
    });
  }
  return ctx.next();
});
