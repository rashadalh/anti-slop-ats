import { Link, Route, Routes, useLocation } from "react-router-dom";
import Home from "./routes/Home.tsx";
import Apply from "./routes/Apply.tsx";
import Recruiter from "./routes/Recruiter.tsx";

function AppShell() {
  const { pathname } = useLocation();
  const isApplyFlow = pathname.startsWith("/apply/");
  const isHome = pathname === "/";
  const widthClass = isApplyFlow || isHome ? "max-w-7xl" : "max-w-5xl";

  return (
    <div className={`mx-auto ${widthClass} px-4 py-6 sm:px-6 sm:py-8 lg:px-8`}>
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-6 sm:mb-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
            Careers
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
            Anti-Slop ATS
          </h1>
        </div>
        <nav className="flex gap-1 text-sm" aria-label="Site">
          <Link
            className="rounded-lg px-3 py-2 text-slate-300 transition-colors hover:bg-slate-900/60 hover:text-white"
            to="/"
          >
            Jobs
          </Link>
          <Link
            className="rounded-lg px-3 py-2 text-slate-300 transition-colors hover:bg-slate-900/60 hover:text-white"
            to="/recruiter"
          >
            Recruiter
          </Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/apply/:slug" element={<Apply />} />
        <Route path="/recruiter" element={<Recruiter />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
