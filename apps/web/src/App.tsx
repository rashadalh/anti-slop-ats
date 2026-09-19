import { Link, Route, Routes } from "react-router-dom";
import Home from "./routes/Home.tsx";
import Apply from "./routes/Apply.tsx";
import Recruiter from "./routes/Recruiter.tsx";

export default function App() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-400">
            Demo careers site
          </p>
          <h1 className="text-2xl font-semibold text-white">Anti-Slop ATS</h1>
        </div>
        <nav className="flex gap-4 text-sm">
          <Link className="text-slate-300 hover:text-white" to="/">
            Jobs
          </Link>
          <Link className="text-slate-300 hover:text-white" to="/recruiter">
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
