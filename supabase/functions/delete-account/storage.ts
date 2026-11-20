type Item = { name: string; id: string | null };
export interface StorageBucket {
  list: (path: string, options: { limit: number; offset: number; sortBy: { column: string; order: string } }) => Promise<{ data: Item[] | null; error: unknown }>;
  remove: (paths: string[]) => Promise<{ error: unknown }>;
}

/** Collect before deleting so pagination offsets never skip files. */
export async function removeOwnerFiles(bucket: StorageBucket, ownerId: string): Promise<void> {
  const paths: string[] = [];
  async function visit(prefix: string) {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await bucket.list(prefix, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw error;
      for (const item of data ?? []) {
        if (!item.name || item.name.includes("/") || item.name === "." || item.name === "..") throw new Error("Invalid storage path");
        const path = `${prefix}/${item.name}`;
        if (item.id) paths.push(path);
        else await visit(path);
      }
      if ((data?.length ?? 0) < 1000) break;
    }
  }
  await visit(ownerId);
  for (let i = 0; i < paths.length; i += 1000) {
    const { error } = await bucket.remove(paths.slice(i, i + 1000));
    if (error) throw error;
  }
}
