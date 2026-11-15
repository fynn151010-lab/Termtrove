import type { SupabaseClient } from "@supabase/supabase-js";
import { body, email, password, text, fail } from "./http";
import { safeReturnTo, type AppConfig } from "./config";
const redirect = (path: string, config: AppConfig) =>
  new Response(null, {
    status: 303,
    headers: { Location: config.origin + path },
  });
export async function authRoute(
  req: Request,
  client: SupabaseClient,
  config: AppConfig,
): Promise<Response | null> {
  const url = new URL(req.url),
    path = url.pathname;
  if (path === "/api/auth/callback" && req.method === "GET") {
    const code = url.searchParams.get("code");
    if (!code) return redirect("/login?error=confirmation", config);
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) return redirect("/login?error=confirmation", config);
    return redirect(safeReturnTo(url.searchParams.get("next")), config);
  }
  if (path === "/api/auth/confirm" && req.method === "GET") {
    const token_hash = url.searchParams.get("token_hash"),
      type = url.searchParams.get("type");
    if (!token_hash || !["signup", "recovery", "email"].includes(type || ""))
      return redirect("/login?error=confirmation", config);
    const { error } = await client.auth.verifyOtp({
      token_hash,
      type: type as "signup" | "recovery" | "email",
    });
    if (error) return redirect("/login?error=confirmation", config);
    return redirect(
      type === "recovery"
        ? "/reset-password"
        : safeReturnTo(url.searchParams.get("next")),
      config,
    );
  }
  if (!path.startsWith("/api/auth/")) return null;
  if (req.method !== "POST") fail(405, "Method not allowed.");
  const data = await body(req);
  if (path === "/api/auth/signup") {
    const { data: result, error } = await client.auth.signUp({
      email: email(data.email),
      password: password(data.password),
      options: {
        data: { display_name: text(data.display_name, "Display name", 60) },
        emailRedirectTo:
          config.origin +
          "/api/auth/callback?next=" +
          encodeURIComponent(safeReturnTo(data.return_to)),
      },
    });
    if (error) {
      if (error.status === 429)
        fail(
          429,
          "Too many sign-up requests. Please wait before trying again.",
        );
      fail(
        400,
        "We could not create this account. Check your details, or try signing in.",
      );
    }
    return Response.json({ ok: true, requires_confirmation: !result.session });
  }
  if (path === "/api/auth/login") {
    // Existing users may have a shorter legacy password; only enforce the new policy at signup/reset.
    if (
      typeof data.password !== "string" ||
      !data.password ||
      data.password.length > 128
    )
      fail(400, "Enter your password.");
    const pass = data.password;
    const { error } = await client.auth.signInWithPassword({
      email: email(data.email),
      password: pass,
    });
    if (error)
      fail(
        error.status === 429 ? 429 : 401,
        error.status === 429
          ? "Too many attempts. Please try again later."
          : "Email or password is incorrect, or your email has not been confirmed.",
      );
    return Response.json({ ok: true });
  }
  if (path === "/api/auth/logout") {
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) fail(503, "Sign-out could not complete. Please try again.");
    return Response.json({ ok: true });
  }
  if (path === "/api/auth/forgot-password") {
    const { error } = await client.auth.resetPasswordForEmail(
      email(data.email),
      { redirectTo: config.origin + "/api/auth/callback?next=/reset-password" },
    );
    if (error && error.status !== 429)
      console.error("Recovery email request failed", { status: error.status });
    // Same response prevents disclosing whether an email is registered.
    return Response.json({
      ok: true,
      message:
        "If an account exists for that email, a password-reset link will arrive shortly.",
    });
  }
  if (path === "/api/auth/reset-password") {
    const {
      data: { user },
      error: sessionError,
    } = await client.auth.getUser();
    if (sessionError || !user)
      fail(401, "Open a valid password-reset link first.");
    const { error } = await client.auth.updateUser({
      password: password(data.password),
    });
    if (error)
      fail(
        400,
        "The password could not be updated. Use a different password or request another reset link.",
      );
    await client.auth.signOut({ scope: "global" });
    return Response.json({ ok: true });
  }
  fail(404, "Authentication route not found.");
}
