import { useState } from "react";
import {
  ArrowUpRight,
  Calculator,
  Leaf,
  Music,
  Orbit,
  Search,
} from "lucide-react";
import { findKits, kits } from "../kits";
import { AppLink } from "../routing";

const curricula = [...new Set(kits.map((k) => k.curriculum))];
const subjects: string[] = [...new Set(kits.map((k) => k.subject))];
const icons = { Mathematics: Calculator, Biology: Leaf, Physics: Orbit, Music };

function initialFilters() {
  const params = new URLSearchParams(location.search);
  const curriculum = params.get("curriculum") || "",
    subject = params.get("subject") || "";
  return {
    q: (params.get("q") || "").slice(0, 120),
    curriculum: curricula.includes(curriculum) ? curriculum : "",
    subject: subjects.includes(subject) ? subject : "",
  };
}

export function Kits() {
  const [filters, setFilters] = useState(initialFilters);
  const results = findKits(filters.q, filters.curriculum, filters.subject);
  const active = Boolean(filters.q || filters.curriculum || filters.subject);
  function update(next: typeof filters) {
    const params = new URLSearchParams(
      Object.entries(next).filter(([, v]) => v),
    );
    history.replaceState(
      history.state,
      "",
      location.pathname + (params.size ? "?" + params : ""),
    );
    setFilters(next);
  }
  const clear = () => update({ q: "", curriculum: "", subject: "" });
  return (
    <section className="section kits-page">
      <div className="page-title">
        <h1>Transition Kits</h1>
        <p>
          Find a checklist for your next course. Browse available books or ask
          the team to help match the items you need.
        </p>
      </div>
      <div
        className="kit-filters"
        role="search"
        aria-label="Search transition kits"
      >
        <label>
          Search kits
          <span className="kit-search">
            <Search aria-hidden="true" size={18} />
            <input
              type="search"
              value={filters.q}
              maxLength={120}
              placeholder="Kit, subject or item"
              onChange={(e) => update({ ...filters, q: e.target.value })}
            />
          </span>
        </label>
        <label>
          Curriculum
          <select
            value={filters.curriculum}
            onChange={(e) => update({ ...filters, curriculum: e.target.value })}
          >
            <option value="">All curricula</option>
            {curricula.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Subject
          <select
            value={filters.subject}
            onChange={(e) => update({ ...filters, subject: e.target.value })}
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="kit-count">
        <span role="status">
          {results.length} {results.length === 1 ? "kit" : "kits"}
        </span>
        {active && (
          <button type="button" onClick={clear}>
            Clear filters
          </button>
        )}
      </div>
      {results.length ? (
        <div className="kits-grid">
          {results.map((kit) => {
            const Icon = icons[kit.subject];
            return (
              <article key={kit.id} className="kit-card">
                <div className="kit-caption">
                  <Icon size={24} aria-hidden="true" />
                  <span>
                    {kit.curriculum} · {kit.subject}
                  </span>
                </div>
                <h2>{kit.name}</h2>
                <p>{kit.description}</p>
                <ul>
                  {kit.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p className="kit-check">{kit.check}</p>
                <div className="kit-actions">
                  <AppLink
                    className="button small"
                    href={"/contact?kit=" + kit.id}
                    aria-label={"Request the " + kit.name}
                  >
                    Request kit
                  </AppLink>
                  <AppLink
                    className="text-link"
                    href={"/browse?" + new URLSearchParams(kit.books)}
                    aria-label={"Browse books for the " + kit.name}
                  >
                    Browse books <ArrowUpRight size={16} />
                  </AppLink>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          <h2>No matching kits</h2>
          <p>
            Try a broader search or clear your filters to see the full
            collection.
          </p>
        </div>
      )}
    </section>
  );
}
