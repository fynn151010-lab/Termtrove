import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { api, signIn } from "./api";
function destination() {
  const value =
    new URLSearchParams(location.search).get("return_to") || "/account";
  return value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\x00-\x20]/.test(value)
    ? value
    : "/account";
}
export function SignInGate({
  title = "A little hello before we begin.",
}: {
  title?: string;
}) {
  return (
    <div className="signin-gate">
      <BookOpen size={36} />
      <h2>{title}</h2>
      <p>
        Create a TermTrove account to list books, place orders, and keep track
        of your next chapter.
      </p>
      <div className="auth-gate-actions">
        <a href={signIn()} className="button">
          Sign in <ArrowUpRight size={18} />
        </a>
        <a
          href={"/register?return_to=" + encodeURIComponent(location.pathname)}
          className="button outline"
        >
          Create an account
        </a>
      </div>
      <small>
        Your account, orders and collection messages stay private. No other
        account is required.
      </small>
    </div>
  );
}
export function AuthPage({
  path,
  onAuthenticated,
  navigate,
}: {
  path: string;
  onAuthenticated: () => Promise<void>;
  navigate: (path: string) => void;
}) {
  const [error, setError] = useState(
      new URLSearchParams(location.search).get("error") === "confirmation"
        ? "This email link is invalid or has expired. Request a fresh link, or sign in if your email is already confirmed."
        : "",
    ),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  const register = path === "/register",
    forgot = path === "/forgot-password",
    reset = path === "/reset-password";
  const next = destination();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (register) {
        const result = await api("/auth/signup", {
          method: "POST",
          body: JSON.stringify({ ...fields, return_to: next }),
        });
        if (result.requires_confirmation) setConfirm(true);
        else {
          await onAuthenticated();
          navigate(next);
        }
      } else if (forgot) {
        const result = await api("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify(fields),
        });
        setNotice(result.message);
      } else if (reset) {
        if (fields.password !== fields.confirm_password)
          throw new Error("The two passwords must match.");
        await api("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify(fields),
        });
        setNotice(
          "Your password has been updated. Sign in with your new password.",
        );
        await onAuthenticated();
      } else {
        await api("/auth/login", {
          method: "POST",
          body: JSON.stringify(fields),
        });
        await onAuthenticated();
        navigate(next);
      }
    } catch (problem: any) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section auth-page">
      <div className="auth-intro">
        <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
        <h1>
          {register
            ? "A community worth joining."
            : forgot
              ? "Let’s get you back in."
              : reset
                ? "A fresh start, securely."
                : "Good to see you again."}
        </h1>
        <p>
          {register
            ? "A few details, a whole bookshelf of possibilities. Create your free TermTrove account."
            : forgot
              ? "Enter your account email and we’ll send a link to reset your password."
              : reset
                ? "Choose a strong new password for your TermTrove account."
                : "Sign in to your TermTrove account to buy, sell, and pass on a little possibility."}
        </p>
        <div className="auth-promise">
          <ShieldCheck size={21} />
          <span>
            One account. Your own bookshelf.
            <br />
            Your details stay private.
          </span>
        </div>
      </div>
      {confirm ? (
        <div className="form-card auth-card">
          <CheckCircle2 size={35} />
          <h2>Check your inbox.</h2>
          <p>
            We’ve requested a confirmation email. Open the link to activate your
            account, then come back to TermTrove.
          </p>
          <p>
            If your email is already registered, you can sign in or reset your
            password.
          </p>
          <a className="button" href={signIn(next)}>
            Back to sign in <ArrowRight size={17} />
          </a>
        </div>
      ) : (
        <form className="form-card auth-card" onSubmit={submit}>
          <h2>
            {register
              ? "Create your account"
              : forgot
                ? "Reset your password"
                : reset
                  ? "Choose a new password"
                  : "Sign in to TermTrove"}
          </h2>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="auth-notice" role="status">
              {notice}
            </div>
          )}
          {!(reset && notice) && (
            <>
              {register && (
                <label>
                  Display name
                  <input
                    required
                    name="display_name"
                    maxLength={60}
                    autoComplete="nickname"
                    placeholder="The name other learners will see"
                  />
                </label>
              )}
              {!reset && (
                <label>
                  Email address
                  <input
                    required
                    name="email"
                    type="email"
                    maxLength={254}
                    autoComplete="email"
                    placeholder="you@example.com"
                  />
                </label>
              )}
              {!forgot && (
                <label>
                  {reset ? "New password" : "Password"}
                  <input
                    required
                    name="password"
                    type="password"
                    minLength={register || reset ? 12 : 1}
                    maxLength={128}
                    autoComplete={
                      register || reset ? "new-password" : "current-password"
                    }
                  />
                  {(register || reset) && (
                    <small>
                      Use at least 12 characters, with a password you don’t use
                      elsewhere.
                    </small>
                  )}
                </label>
              )}
              {reset && (
                <label>
                  Confirm new password
                  <input
                    required
                    name="confirm_password"
                    type="password"
                    minLength={12}
                    maxLength={128}
                    autoComplete="new-password"
                  />
                </label>
              )}
              {!register && !forgot && !reset && (
                <a className="auth-forgot" href="/forgot-password">
                  Forgot your password?
                </a>
              )}
              <button disabled={busy} className="button full" type="submit">
                {busy
                  ? "Please wait…"
                  : register
                    ? "Create account"
                    : forgot
                      ? "Send reset link"
                      : reset
                        ? "Update password"
                        : "Sign in"}{" "}
                <ArrowRight size={17} />
              </button>
            </>
          )}
          {reset && notice ? (
            <a className="button full" href={signIn(next)}>
              Sign in <ArrowRight size={17} />
            </a>
          ) : (
            <p className="auth-switch">
              {register
                ? "Already on the shelf?"
                : forgot || reset
                  ? "Remember your password?"
                  : "New to TermTrove?"}{" "}
              <a
                href={
                  register || forgot || reset
                    ? signIn(next)
                    : "/register?return_to=" + encodeURIComponent(next)
                }
              >
                {register || forgot || reset ? "Sign in" : "Create an account"}
              </a>
            </p>
          )}
          <div className="auth-fineprint">
            By using TermTrove, review our <a href="/terms">Terms</a> and{" "}
            <a href="/privacy">Privacy Policy</a>. Final approved policy text is
            pending.
          </div>
        </form>
      )}
    </section>
  );
}
export function SignOutButton() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <button
        type="button"
        className="signout"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api("/auth/logout", { method: "POST", body: "{}" });
            location.assign("/");
          } catch (problem: any) {
            setError(problem.message);
            setBusy(false);
          }
        }}
      >
        {busy ? "Signing out…" : "Sign out securely"}
      </button>
    </>
  );
}
