import { logicalPath, visualPreview } from "./routing";
import { ApiError, requestJSON } from "./http-client";
export async function api(path: string, options: RequestInit = {}) {
  if (visualPreview) {
    if (options.method && options.method !== "GET")
      throw new Error(
        "This is a design preview. Signup and transactions are disabled until Supabase is connected.",
      );
    return (await import("./preview")).previewRead(path);
  }
  try {
    return await requestJSON(
      "/api" + path,
      options,
      options.body instanceof FormData ? 120_000 : 45_000,
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      !path.startsWith("/auth/")
    )
      window.dispatchEvent(new Event("termtrove:session-expired"));
    throw error;
  }
}
export const signIn = (path = logicalPath() + location.search) =>
  "/login?return_to=" + encodeURIComponent(path);
