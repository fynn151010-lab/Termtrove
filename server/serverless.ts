import { handleAPI } from "./api";
import { productionHeaders } from "./security";

const maxBodyBytes = 4 * 1024 * 1024;

function finish(response: Response): Response {
  for (const [name, value] of Object.entries(productionHeaders))
    response.headers.set(name, value);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

/** Web Request/Response adapter; keeps multiple auth cookies intact. */
export async function serverlessHandler(
  request: Request,
  api: (request: Request) => Promise<Response> = handleAPI,
): Promise<Response> {
  try {
    const path = new URL(request.url).pathname;
    if (path !== "/api" && !path.startsWith("/api/"))
      return finish(Response.json({ error: "Not found." }, { status: 404 }));

    if (request.body) {
      const tooLarge = () =>
        finish(
          Response.json(
            { error: "Request too large. Photos must be under 3 MB." },
            { status: 413 },
          ),
        );
      const reader = request.body.getReader();
      if (Number(request.headers.get("content-length")) > maxBodyBytes) {
        await reader.cancel();
        return tooLarge();
      }
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBodyBytes) {
          await reader.cancel();
          return tooLarge();
        }
        chunks.push(value);
      }
      const payload = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        payload.set(chunk, offset);
        offset += chunk.byteLength;
      }
      request = new Request(request, { body: payload });
    }
    return finish(await api(request));
  } catch {
    return finish(
      Response.json(
        { error: "The server could not complete this request." },
        { status: 500 },
      ),
    );
  }
}
