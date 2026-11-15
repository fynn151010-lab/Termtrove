import { logicalPath, visualPreview } from "./routing";
export async function api(path: string, options: RequestInit = {}) {
  if (visualPreview) {
    if (options.method && options.method !== "GET")
      throw new Error(
        "This is a design preview. Signup and transactions are disabled until Supabase is connected.",
      );
    return (await import("./preview")).previewRead(path);
  }
  const response = await fetch("/api" + path, {
    ...options,
    headers:
      options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" },
    credentials: "same-origin",
  });
  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The server returned an unexpected response. Please try again.",
    );
  }
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
export const signIn = (path = logicalPath()) =>
  "/login?return_to=" + encodeURIComponent(path);
