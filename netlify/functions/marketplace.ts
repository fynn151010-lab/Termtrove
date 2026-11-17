import { serverlessHandler } from "../../server/serverless";

export default async function marketplace(request: Request): Promise<Response> {
  return serverlessHandler(request);
}

// Preserve the original API URL, including callback and search query strings.
export const config = { path: ["/api", "/api/*"] };
