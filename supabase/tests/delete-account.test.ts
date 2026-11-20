import assert from "node:assert/strict";
import { deletionHandler } from "../functions/delete-account/handler.ts";
import { removeOwnerFiles } from "../functions/delete-account/storage.ts";

const calls: string[] = [];
let authenticated = false;
let failStorage = false;
const handler = deletionHandler({
  async authenticate() { return authenticated ? { userId: "owner", authHeader: "Bearer test-jwt" } : null; },
  async removeFiles(id) { calls.push(`files:${id}`); if (failStorage) throw new Error("Storage failed"); },
  async revokeSessions(token) { calls.push(`revoke:${token}`); },
  async deleteUser(id) { calls.push(`delete:${id}`); },
});
const request = (body: unknown = { confirmation: "DELETE", userId: "victim" }) => new Request("https://example.test/delete-account", { method: "POST", body: JSON.stringify(body) });
assert.equal((await handler(request())).status, 401);
assert.deepEqual(calls, []);
authenticated = true;
assert.equal((await handler(request({}))).status, 400);
assert.deepEqual(calls, []);
failStorage = true;
assert.equal((await handler(request())).status, 500);
assert.deepEqual(calls, ["files:owner"]);
calls.length = 0; failStorage = false;
const success = await handler(request());
assert.deepEqual(await success.json(), { deleted: true });
assert.deepEqual(calls, ["files:owner", "revoke:test-jwt", "delete:owner"]);
const removed: string[] = [];
await removeOwnerFiles({
  async list(prefix, { offset }) {
    if (prefix === "owner") return { data: offset === 0 ? [...Array.from({ length: 999 }, (_,i) => ({ id: String(i), name: `${i}.jpg` })), { id: null, name: "nested" }] : [{ id: "last", name: "last.jpg" }], error: null };
    assert.equal(prefix, "owner/nested");
    return { data: [{ id: "nested", name: "photo.jpg" }], error: null };
  },
  async remove(paths) { removed.push(...paths); return { error: null }; },
}, "owner");
assert.equal(removed.length, 1001);
assert.ok(removed.includes("owner/last.jpg") && removed.includes("owner/nested/photo.jpg"));
await assert.rejects(removeOwnerFiles({ async list() { return { data: null, error: new Error("offline") }; }, async remove() { throw new Error("must not run"); } }, "owner"));
console.log("PASS deletion: authentication, confirmation, ownership, failure ordering, recursive storage pagination");
