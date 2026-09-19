import { useMemo, useState } from "react";
import { getBackend } from "../lib/backendInstance.ts";
import JobCard from "../components/JobCard.tsx";
import type { Job } from "../lib/types.ts";

const DEPARTMENT_ORDER = [
  "Engineering",
  "Infrastructure",
  "Information Security",
  "Human Data",
  "Data Center",
  "Product",
  "Safety",
  "G&A",
  "Operations",
];

function departmentRank(dept: string): number {
  const i = DEPARTMENT_ORDER.indexOf(dept);
  return i === -1 ? DEPARTMENT_ORDER.length : i;
}

function uniqueSorted(values: string[], rank?: (v: string) => number): string[] {
  const set = [...new Set(values)];
  return set.sort((a, b) => {
    const ra = rank?.(a) ?? 0;
    const rb = rank?.(b) ?? 0;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

export default function Home() {
  const jobs = getBackend().listJobs();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All");
  const [location, setLocation] = useState("All");

  const departments = useMemo(
    () => uniqueSorted(
      jobs.map((j) => j.department),
      departmentRank,
    ),
    [jobs],
  );
  const locations = useMemo(
    () => uniqueSorted(jobs.map((j) => j.location)),
    [jobs],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (department !== "All" && job.department !== department) return false;
      if (location !== "All" && job.location !== location) return false;
      if (!q) return true;
      const hay = `${job.title} ${job.department} ${job.location} ${job.jd_text}`.toLowerCase();
      return hay.includes(q);
    });
  }, [jobs, query, department, location]);

  const grouped = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const job of filtered) {
      const list = map.get(job.department) ?? [];
      list.push(job);
      map.set(job.department, list);
    }
    return [...map.entries()].sort(
      (a, b) => departmentRank(a[0]) - departmentRank(b[0]) || a[0].localeCompare(b[0]),
    );
  }, [filtered]);

  return (
    <div>
      <p className="mb-6 max-w-2xl text-slate-300">
        Demo careers listing inspired by public xAI / X Platform open roles.
        Apply on any posting — the form records timing and interaction telemetry
        (not keystroke content) to score auto-apply vs human-filled applications.
      </p>

      <div className="mb-8 space-y-4">
        <label className="block">
          <span className="sr-only">Search roles</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles, locations, teams…"
            className="w-full rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none"
          />
        </label>

        <FilterRow
          label="Team"
          value={department}
          options={["All", ...departments]}
          onChange={setDepartment}
        />
        <FilterRow
          label="Location"
          value={location}
          options={["All", ...locations]}
          onChange={setLocation}
        />
      </div>

      <p className="mb-6 text-sm text-slate-400">
        {filtered.length} open role{filtered.length === 1 ? "" : "s"}
        {department !== "All" ? ` in ${department}` : ""}
        {location !== "All" ? ` · ${location}` : ""}
      </p>

      {grouped.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-8 text-center text-slate-400">
          No roles match those filters.
        </p>
      ) : (
        <div className="space-y-10">
          {grouped.map(([dept, deptJobs]) => (
            <section key={dept} aria-labelledby={`dept-${dept}`}>
              <h2
                id={`dept-${dept}`}
                className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400/90"
              >
                {dept}
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                {deptJobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={
                active
                  ? "rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-white"
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
