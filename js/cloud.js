// Public endpoint only. Room credentials are issued by the server per browser tab.
const endpoint =
  "https://ydcforyxwlmmgdgyypiu.supabase.co/functions/v1/casino/";
export function cloudEndpoint(url = new URL(location.href)) {
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  const production = ["zerovert.fr", "www.zerovert.fr", "rien-ne-va-plus.vercel.app"];
  return production.includes(url.hostname) ||
    (local && url.searchParams.get("cloud") === "1")
    ? endpoint
    : null;
}
