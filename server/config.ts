export type AppConfig = {
  supabaseUrl: string;
  supabaseKey: string;
  origin: string;
};
export function readConfig(): AppConfig {
  const supabaseUrl = process.env.SUPABASE_URL || "",
    supabaseKey =
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "",
    origin = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || "";
  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseKey.startsWith("replace-") ||
    !origin
  )
    throw new Error(
      "Configure SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and APP_ORIGIN in the server environment.",
    );
  const publicOrigin = new URL(origin);
  if (
    !["http:", "https:"].includes(publicOrigin.protocol) ||
    publicOrigin.pathname !== "/" ||
    publicOrigin.search ||
    publicOrigin.hash
  )
    throw new Error("APP_ORIGIN must be an absolute origin without a path.");
  if (
    publicOrigin.protocol === "http:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(publicOrigin.hostname)
  )
    throw new Error("Use HTTPS for the public application origin.");
  return { supabaseUrl, supabaseKey, origin: publicOrigin.origin };
}
export function safeReturnTo(value: unknown, fallback = "/account"): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\x00-\x20]/.test(value)
  )
    return fallback;
  try {
    const parsed = new URL(value, "https://termtrove.invalid");
    return parsed.origin === "https://termtrove.invalid"
      ? parsed.pathname + parsed.search
      : fallback;
  } catch {
    return fallback;
  }
}
