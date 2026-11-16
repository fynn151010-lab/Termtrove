export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Never automatically retry writes: a lost response can still mean a saved order. */
export async function requestJSON(
  url: string,
  options: RequestInit = {},
  timeoutMs = 45_000,
) {
  const controller = new AbortController();
  const externalSignal = options.signal;
  const abort = () => controller.abort();
  if (externalSignal?.aborted) abort();
  else externalSignal?.addEventListener("abort", abort, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
      credentials: "same-origin",
    });
    let data;
    try {
      data = await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new ApiError(
        "The server returned an unexpected response. Please try again.",
        response.status,
      );
    }
    if (!response.ok)
      throw new ApiError(
        typeof data?.error === "string"
          ? data.error
          : "We could not complete this request. Please try again.",
        response.status,
      );
    return data;
  } catch (error) {
    if (externalSignal?.aborted)
      throw new DOMException("Request cancelled", "AbortError");
    if (error instanceof ApiError) throw error;
    const write = !["GET", "HEAD"].includes(
      options.method?.toUpperCase() || "GET",
    );
    throw new Error(
      (timedOut
        ? "This request took too long."
        : "We couldn’t reach TermTrove. Check your connection.") +
        (write
          ? " The change may have been saved; check your account before trying again."
          : " Please try again."),
    );
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", abort);
  }
}
