export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}
export function text(
  value: unknown,
  label: string,
  max = 200,
  required = true,
): string {
  if (
    typeof value !== "string" ||
    (required && !value.trim()) ||
    value.length > max
  )
    fail(400, `${label} is required and must be at most ${max} characters.`);
  return value.trim();
}
export function uuid(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    fail(400, "Invalid record ID.");
  return value;
}
export function email(value: unknown): string {
  const address = text(value, "Email", 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
    fail(400, "Enter a valid email address.");
  return address;
}
export function password(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length < 12 ||
    value.length > 128
  )
    fail(400, "Use a password between 12 and 128 characters.");
  return value;
}
export async function body(req: Request): Promise<Record<string, any>> {
  const raw = await req.text();
  if (raw.length > 30000) fail(413, "Request too large.");
  try {
    const data = JSON.parse(raw);
    if (!data || Array.isArray(data) || typeof data !== "object") throw Error();
    return data;
  } catch {
    fail(400, "Invalid JSON request.");
  }
}
export function checked<T>(result: { data: T; error: any }): T {
  if (result.error) {
    const error = result.error;
    const status =
      error.code === "42501"
        ? 403
        : error.code === "PGRST116"
          ? 404
          : error.code === "P0001" || error.code === "23505"
            ? 409
            : 400;
    if (["42501", "22023", "P0001"].includes(error.code))
      fail(status, error.message);
    if (error.code === "23514")
      fail(400, "Check the required fields, book condition and price.");
    console.error("Backend request failed", { code: error.code });
    fail(
      status,
      "We could not complete this request. Please check your details and try again.",
    );
  }
  return result.data;
}
export function assertSameOrigin(req: Request, origin: string) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  if (req.headers.get("origin") !== origin)
    fail(403, "This request must come from TermTrove.");
  if (req.headers.get("sec-fetch-site") === "cross-site")
    fail(403, "Cross-site requests are not allowed.");
}
