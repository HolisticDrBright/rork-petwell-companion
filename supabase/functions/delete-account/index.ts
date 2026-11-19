import { getCaller, serviceClient } from "../_shared/auth.ts";
import { deletionHandler } from "./handler.ts";
import { removeOwnerFiles } from "./storage.ts";

Deno.serve(deletionHandler({
  authenticate: getCaller,
  async removeFiles(userId) {
    const service = serviceClient();
    for (const bucket of ["pet-photos", "scan-images", "documents", "reports"]) {
      await removeOwnerFiles(service.storage.from(bucket), userId);
    }
  },
  async revokeSessions(token) {
    const { error } = await serviceClient().auth.admin.signOut(token, "global");
    if (error) throw error;
  },
  async deleteUser(userId) {
    const { error } = await serviceClient().auth.admin.deleteUser(userId);
    if (error) throw error;
  },
}));
