import { Link } from "react-router-dom";
import type { Job } from "../lib/types.ts";

export default function JobCard({ job }: { job: Job }) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {job.department} · {job.location}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">{job.title}</h2>
      <p className="mt-3 line-clamp-3 text-sm text-slate-300">{job.jd_text}</p>
      <Link
        to={`/apply/${job.slug}`}
        className="mt-6 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
      >
        Apply
      </Link>
    </article>
  );
}
