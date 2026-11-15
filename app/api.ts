export async function api(path: string, options: RequestInit = {}) {
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
export const signIn = (path = location.pathname) =>
  "/login?return_to=" + encodeURIComponent(path);
