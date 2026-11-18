import { logicalPath, appHref, visualPreview } from "./routing";
import { AppLink } from "./routing";
import { CheckCircle2, MapPin, Menu, Plus, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, signIn } from "./api";
import { AuthPage } from "./auth";
import { updateMetadata } from "./metadata";
import { Brand, Footer, Loading } from "./components";
import { Dashboard } from "./pages/account";
import { Checkout } from "./pages/checkout";
import { Info } from "./pages/info";
import { Browse, Home, Product } from "./pages/marketplace";
import { Sell } from "./pages/sell";
import "./styles.css";
import type { Profile } from "./types";
import { scrollBehavior } from "./utils";
function scrollToFragment(hash: string, focus = false) {
  let id;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return;
  }
  const element = document.getElementById(id);
  element?.scrollIntoView({ behavior: scrollBehavior() });
  if (focus) element?.focus({ preventScroll: true });
}
function App() {
  const [path, setPath] = useState(logicalPath()),
    [routeKey, setRouteKey] = useState(location.pathname + location.search),
    [user, setUser] = useState<Profile | null>(null),
    [authReady, setAuthReady] = useState(false),
    [mobile, setMobile] = useState(false),
    [notice, setNotice] = useState("");
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    ),
    menuButton = useRef<HTMLButtonElement>(null),
    navigation = useRef<HTMLElement>(null),
    header = useRef<HTMLElement>(null);
  const initialSession = useRef<AbortController | null>(null);
  const notify = (msg: string) => {
    clearTimeout(noticeTimer.current);
    setNotice(msg);
    noticeTimer.current = setTimeout(() => setNotice(""), 6000);
  };
  const navigate = (url: string) => {
    history.pushState({}, "", appHref(url));
    setPath(logicalPath());
    setRouteKey(location.pathname + location.search);
    setMobile(false);
    window.scrollTo(0, 0);
    setTimeout(
      () => document.getElementById("main")?.focus({ preventScroll: true }),
      0,
    );
  };
  useEffect(() => {
    const listener = () => {
      setPath(logicalPath());
      setRouteKey(location.pathname + location.search);
      setMobile(false);
      window.scrollTo(0, 0);
      setTimeout(
        () => document.getElementById("main")?.focus({ preventScroll: true }),
        0,
      );
    };
    window.addEventListener("popstate", listener);
    const expired = () => {
      initialSession.current?.abort();
      setUser(null);
      notify("Your session has ended. Please sign in again.");
    };
    window.addEventListener("termtrove:session-expired", expired);
    const click = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a");
      if (
        anchor &&
        anchor.origin === location.origin &&
        !anchor.target &&
        !anchor.hasAttribute("download") &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey &&
        !event.defaultPrevented &&
        event.button === 0 &&
        !anchor.pathname.startsWith("/api/")
      ) {
        event.preventDefault();
        if (
          anchor.hash &&
          anchor.pathname === location.pathname &&
          anchor.search === location.search
        ) {
          scrollToFragment(anchor.hash, true);
          return;
        }
        navigate(logicalPath(anchor.pathname) + anchor.search + anchor.hash);
        if (anchor.hash) setTimeout(() => scrollToFragment(anchor.hash), 30);
      }
    };
    document.addEventListener("click", click);
    const controller = new AbortController();
    initialSession.current = controller;
    api("/me", { signal: controller.signal })
      .then((d) => {
        if (!controller.signal.aborted) setUser(d.user);
      })
      .catch(() => {})
      .finally(() => setAuthReady(true));
    return () => {
      controller.abort();
      window.removeEventListener("popstate", listener);
      window.removeEventListener("termtrove:session-expired", expired);
      document.removeEventListener("click", click);
      clearTimeout(noticeTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!mobile) return;
    navigation.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobile(false);
      menuButton.current?.focus();
    };
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setMobile(false);
    };
    const resize = () => {
      if (window.innerWidth > 640) setMobile(false);
    };
    window.addEventListener("keydown", escape);
    window.addEventListener("resize", resize);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("keydown", escape);
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerdown", outside);
    };
  }, [mobile]);
  useEffect(() => updateMetadata(path), [path]);
  const ctx = { user, notify, navigate };
  return (
    <>
      <AppLink href="#main" className="skip-link">
        Skip to content
      </AppLink>
      <div className="topline">
        A new chapter for your books. A little more in your pocket.{" "}
        <span>
          Made for Bangkok’s learning community <MapPin size={12} />
        </span>
      </div>
      <header ref={header}>
        <div className="nav-wrap">
          <Brand />
          <nav
            id="primary-navigation"
            ref={navigation}
            aria-label="Main navigation"
            className={mobile ? "open" : ""}
          >
            {[
              ["/", "Home"],
              ["/browse", "Browse Books"],
              ["/sell", "Sell a Book"],
              ["/how-it-works", "How It Works"],
              ["/about", "About Us"],
            ].map(([href, label]) => (
              <AppLink
                key={href}
                href={href}
                className={path === href ? "active" : ""}
                aria-current={path === href ? "page" : undefined}
              >
                {label}
              </AppLink>
            ))}
          </nav>
          <div className="nav-actions">
            {user ? (
              <AppLink
                className="account-link"
                href="/account"
                aria-label="My account"
              >
                <UserRound size={17} />
                <span>My account</span>
              </AppLink>
            ) : (
              <AppLink className="signin" href={signIn("/account")}>
                Sign in
              </AppLink>
            )}
            <AppLink className="button small" href="/sell">
              <Plus size={16} /> Sell a book
            </AppLink>
            <button
              className="menu icon-button"
              ref={menuButton}
              aria-label={mobile ? "Close navigation" : "Open navigation"}
              aria-expanded={mobile}
              aria-controls="primary-navigation"
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      {visualPreview && (
        <div className="preview-banner" role="note">
          <strong>Design preview</strong>
          <span>
            Sample books only. Signup, purchases and messages are disabled until
            the live backend is connected.
          </span>
        </div>
      )}
      <main key={routeKey} id="main" tabIndex={-1}>
        {[
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
        ].includes(path) ? (
          <AuthPage
            path={path}
            navigate={navigate}
            onAuthenticated={async () => {
              initialSession.current?.abort();
              const d = await api("/me");
              setUser(d.user);
            }}
          />
        ) : !authReady &&
          (path === "/account" ||
            path === "/contact" ||
            path.startsWith("/checkout/")) ? (
          <Loading />
        ) : path === "/" ? (
          <Home />
        ) : path === "/browse" ? (
          <Browse />
        ) : path.startsWith("/book/") ? (
          <Product id={path.split("/")[2]} {...ctx} />
        ) : path === "/sell" || path.startsWith("/edit/") ? (
          <Sell
            id={path.startsWith("/edit/") ? path.split("/")[2] : undefined}
            authReady={authReady}
            {...ctx}
          />
        ) : path.startsWith("/checkout/") ? (
          <Checkout id={path.split("/")[2]} {...ctx} />
        ) : path === "/account" ? (
          <Dashboard key={user?.id || "guest"} setUser={setUser} {...ctx} />
        ) : (
          <Info path={path} user={user} />
        )}
      </main>
      <Footer />
      <div className="toast" role="status" hidden={!notice}>
        <CheckCircle2 size={20} />
        {notice}
        <button aria-label="Dismiss notification" onClick={() => setNotice("")}>
          <X size={16} />
        </button>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
