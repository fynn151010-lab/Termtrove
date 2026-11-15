import { CheckCircle2, MapPin, Menu, Plus, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, signIn } from "./api";
import { AuthPage } from "./auth";
import { Brand, Footer, Loading } from "./components";
import { Dashboard } from "./pages/account";
import { Checkout } from "./pages/checkout";
import { Info } from "./pages/info";
import { Browse, Home, Product } from "./pages/marketplace";
import { Sell } from "./pages/sell";
import "./styles.css";
import type { Profile } from "./types";
function App() {
  const [path, setPath] = useState(location.pathname),
    [routeKey, setRouteKey] = useState(location.pathname + location.search),
    [user, setUser] = useState<Profile | null>(null),
    [authReady, setAuthReady] = useState(false),
    [mobile, setMobile] = useState(false),
    [notice, setNotice] = useState("");
  const notify = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 6000);
  };
  const navigate = (url: string) => {
    history.pushState({}, "", url);
    setPath(location.pathname);
    setRouteKey(location.pathname + location.search);
    setMobile(false);
    window.scrollTo(0, 0);
  };
  useEffect(() => {
    const listener = () => {
      setPath(location.pathname);
      setRouteKey(location.pathname + location.search);
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", listener);
    const click = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a");
      if (
        anchor &&
        anchor.origin === location.origin &&
        !anchor.target &&
        !anchor.hasAttribute("download") &&
        !event.metaKey &&
        !event.ctrlKey &&
        !anchor.pathname.startsWith("/sign")
      ) {
        event.preventDefault();
        navigate(anchor.pathname + anchor.search + anchor.hash);
        if (anchor.hash)
          setTimeout(
            () =>
              document
                .querySelector(anchor.hash)
                ?.scrollIntoView({ behavior: "smooth" }),
            30,
          );
      }
    };
    document.addEventListener("click", click);
    api("/me")
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setAuthReady(true));
    return () => {
      window.removeEventListener("popstate", listener);
      document.removeEventListener("click", click);
    };
  }, []);
  const ctx = { user, notify, navigate };
  return (
    <>
      <div className="topline">
        A new chapter for your books. A little more in your pocket.{" "}
        <span>
          Made for Bangkok’s learning community <MapPin size={12} />
        </span>
      </div>
      <header>
        <div className="nav-wrap">
          <Brand />
          <nav className={mobile ? "open" : ""}>
            <a className={path === "/" ? "active" : ""} href="/">
              Home
            </a>
            <a className={path === "/browse" ? "active" : ""} href="/browse">
              Browse Books
            </a>
            <a className={path === "/sell" ? "active" : ""} href="/sell">
              Sell a Book
            </a>
            <a href="/how-it-works">How It Works</a>
            <a href="/about">About Us</a>
          </nav>
          <div className="nav-actions">
            {user ? (
              <a className="account-link" href="/account">
                <UserRound size={17} />
                <span>My account</span>
              </a>
            ) : (
              <a className="signin" href={signIn("/account")}>
                Sign in
              </a>
            )}
            <a className="button small" href="/sell">
              <Plus size={16} /> Sell a book
            </a>
            <button
              className="menu icon-button"
              aria-label="Toggle navigation"
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main key={routeKey}>
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
              const d = await api("/me");
              setUser(d.user);
            }}
          />
        ) : !authReady &&
          (path === "/account" || path.startsWith("/checkout/")) ? (
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
          <Dashboard setUser={setUser} {...ctx} />
        ) : (
          <Info path={path} {...ctx} />
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
