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

function locationTokens(location: string): string[] {
  return location.split(";").map((part) => part.trim()).filter(Boolean);
}

export default function Home() {
  const jobs = getBackend().listJobs();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All");
  const [location, setLocation] = useState("All");

  const departments = useMemo(
    () =>
      uniqueSorted(
        jobs.map((j) => j.department),
        departmentRank,
      ),
    [jobs],
  );
  const locations = useMemo(
    () => uniqueSorted(jobs.flatMap((j) => locationTokens(j.location))),
    [jobs],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (department !== "All" && job.department !== department) return false;
      if (location !== "All" && !locationTokens(job.location).includes(location)) return false;
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
    <main>
      <h1 className="gh-title gh-title-lg">Current openings at Anti-Slop</h1>
      <p className="mt-4 max-w-2xl text-base leading-6" style={{ color: "var(--gh-text-60)" }}>
        Demo careers listing inspired by public xAI / X Platform open roles. Apply on any posting
        — timing and interaction telemetry (not keystroke content) is recorded so the demo can
        score auto-apply vs human-filled applications.
      </p>

      <div className="mt-8 space-y-4">
        <label className="block max-w-xl">
          <span className="sr-only">Search roles</span>
          <div className="gh-input-shell">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, locations, teams…"
              className="gh-control"
            />
          </div>
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

      <p className="mt-6 text-sm" style={{ color: "var(--gh-text-60)" }}>
        {filtered.length} open role{filtered.length === 1 ? "" : "s"}
        {department !== "All" ? ` in ${department}` : ""}
        {location !== "All" ? ` · ${location}` : ""}
      </p>

      <div className="job-posts mt-8">
        {grouped.length === 0 ? (
          <p
            className="rounded-[5px] border px-4 py-8 text-center text-base"
            style={{ borderColor: "var(--gh-text-30)", color: "var(--gh-text-60)" }}
          >
            No roles match those filters.
          </p>
        ) : (
          grouped.map(([dept, deptJobs]) => (
            <section key={dept} className="mb-10" aria-labelledby={`dept-${dept}`}>
              <h2 id={`dept-${dept}`} className="gh-title mb-2">
                {dept}
              </h2>
              <table className="gh-jobs-table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {deptJobs.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </tbody>
              </table>
            </section>
          ))
        )}
      </div>
    </main>
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
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--gh-text-60)" }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={active ? "gh-pill px-4 py-1.5 text-sm" : "gh-pill-secondary px-4 py-1.5 text-sm"}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
