import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import ApplicationForm from "../components/ApplicationForm.tsx";
import { getBackend } from "../lib/backendInstance.ts";
import type { Detection } from "../lib/types.ts";

export default function Apply() {
  const { slug } = useParams<{ slug: string }>();
  const job = slug ? getBackend().getJob(slug) : null;
  const [submitted, setSubmitted] = useState<Detection | null>(null);

  if (!job) {
    return (
      <div>
        <p className="text-slate-300">Job not found.</p>
        <Link className="mt-4 inline-block text-emerald-400" to="/">
          Back to jobs
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-6">
        <h2 className="text-xl font-semibold text-white">Application submitted</h2>
        <p className="mt-2 text-slate-300">
          Scored as{" "}
          <strong>{submitted.label === 1 ? "auto-apply (1)" : "human (0)"}</strong>{" "}
          with P={submitted.probability.toFixed(2)}.
        </p>
        <p className="mt-4 text-sm text-slate-400">{submitted.reasoning}</p>
        <Link
          to="/recruiter"
          className="mt-6 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
        >
          View recruiter dashboard
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs uppercase text-slate-500">{job.department}</p>
      <h2 className="text-2xl font-semibold text-white">{job.title}</h2>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300">
        {job.jd_text}
      </p>
      <div className="mt-10">
        <ApplicationForm job={job} onSubmitted={setSubmitted} />
      </div>
    </div>
  );
}
