import type { ReactNode } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import Home from "./routes/Home.tsx";
import Apply from "./routes/Apply.tsx";
import Recruiter from "./routes/Recruiter.tsx";

function BoardLogo() {
  return (
    <Link to="/" className="gh-logo" aria-label="Anti-Slop careers home">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden>
        <circle cx="20" cy="13" r="7.5" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="20" cy="27" r="8.5" stroke="currentColor" strokeWidth="2.2" />
      </svg>
      <span className="text-lg font-semibold tracking-tight">Anti-Slop</span>
    </Link>
  );
}

function BoardFooter() {
  return (
    <footer className="gh-footer">
      <p>
        Careers demo ·{" "}
        <Link className="gh-link" to="/recruiter">
          Recruiter review
        </Link>
      </p>
    </footer>
  );
}

function BoardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="gh-board">
        <BoardLogo />
        {children}
        <BoardFooter />
      </div>
    </div>
  );
}

function RecruiterShell() {
  return (
    <div className="gh-recruiter">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b pb-6" style={{ borderColor: "var(--gh-text-30)" }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--gh-text-60)" }}>
            Internal
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight">Anti-Slop ATS</h1>
        </div>
        <nav className="flex gap-4 text-sm" aria-label="Site">
          <Link className="gh-link" to="/">
            Jobs
          </Link>
          <Link className="gh-link" to="/recruiter">
            Recruiter
          </Link>
        </nav>
      </header>
      <Recruiter />
    </div>
  );
}

function AppShell() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/recruiter")) {
    return <RecruiterShell />;
  }

  return (
    <BoardShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/apply/:slug" element={<Apply />} />
      </Routes>
    </BoardShell>
  );
}

export default function App() {
  return <AppShell />;
}
