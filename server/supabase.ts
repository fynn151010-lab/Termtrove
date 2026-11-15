import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import type { AppConfig } from "./config";
export function requestClient(req: Request, config: AppConfig) {
  const outgoing: string[] = [];
  const jar = parse(req.headers.get("cookie") || "");
  const client = createServerClient(config.supabaseUrl, config.supabaseKey, {
    cookieOptions: {
      httpOnly: true,
      secure: config.origin.startsWith("https:"),
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () =>
        Object.entries(jar).map(([name, value]) => ({
          name,
          value: value || "",
        })),
      setAll(cookies) {
        for (const { name, value, options } of cookies) {
          jar[name] = value;
          outgoing.push(
            serialize(name, value, {
              ...options,
              httpOnly: true,
              secure: config.origin.startsWith("https:"),
              sameSite: "lax",
              path: "/",
            }),
          );
        }
      },
    },
  });
  return {
    client,
    finish(response: Response) {
      for (const cookie of outgoing)
        response.headers.append("Set-Cookie", cookie);
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("X-Content-Type-Options", "nosniff");
      return response;
    },
  };
}
