import { getBackend } from "../lib/backendInstance.ts";
import JobCard from "../components/JobCard.tsx";

export default function Home() {
  const jobs = getBackend().listJobs();
  const departments = [...new Set(jobs.map((j) => j.department))];

  return (
    <main>
      <h1 className="gh-title gh-title-lg">Current openings at Anti-Slop</h1>
      <p className="mt-4 max-w-2xl text-base leading-6" style={{ color: "var(--gh-text-60)" }}>
        Apply on this first-party board. Timing and interaction telemetry (not keystroke
        content) is recorded so the demo can score auto-apply vs human-filled applications.
      </p>

      <div className="job-posts mt-10">
        {departments.map((department) => {
          const rows = jobs.filter((j) => j.department === department);
          return (
            <section key={department} className="mb-10">
              <h2 className="gh-title mb-2">{department}</h2>
              <table className="gh-jobs-table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </main>
  );
}
