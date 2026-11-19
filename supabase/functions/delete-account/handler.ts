import { json, preflight } from "../_shared/cors.ts";

export interface DeleteDependencies {
  authenticate: (req: Request) => Promise<{ userId: string; authHeader: string } | null>;
  removeFiles: (userId: string) => Promise<void>;
  revokeSessions: (token: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
}

export function deletionHandler(deps: DeleteDependencies) {
  return async (req: Request): Promise<Response> => {
    const options = preflight(req);
    if (options) return options;
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    try {
      const caller = await deps.authenticate(req);
      if (!caller) return json({ error: "Sign in to delete your account." }, 401);
      const body = await req.json().catch(() => null);
      if (body?.confirmation !== "DELETE") return json({ error: "Deletion confirmation required." }, 400);
      // Never accept an owner ID from the body. A failed cleanup stops deletion
      // so storage can be retried while the authenticated account still exists.
      await deps.removeFiles(caller.userId);
      await deps.revokeSessions(caller.authHeader.replace(/^Bearer\s+/i, "").trim());
      await deps.deleteUser(caller.userId);
      return json({ deleted: true });
    } catch {
      return json({ error: "Account deletion could not be completed. Please retry." }, 500);
    }
  };
}
