import { getBackend } from "../lib/backendInstance.ts";
import JobCard from "../components/JobCard.tsx";

export default function Home() {
  const jobs = getBackend().listJobs();

  return (
    <div>
      <p className="mb-6 max-w-2xl text-slate-300">
        Apply to a demo role. The form records timing and interaction telemetry
        (not keystroke content) to score auto-apply vs human-filled applications.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
