export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path, "petwell:///");
    const route = url.protocol === "petwell:" && url.hostname ? `/${url.hostname}${url.pathname}` : url.pathname;
    if (route.replace(/\/$/, "") === "/reset-password") return `/reset-password${url.search}`;
    // Email verification is completed by Auth before redirecting. Sign in with
    // the chosen password here; never treat a signup code as password recovery.
    if (route.replace(/\/$/, "") === "/account") return "/account";
  } catch { /* Invalid external links go home. */ }
  return "/";
}
