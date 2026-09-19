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
      <div className="apply-empty-state">
        <h2 className="text-lg font-semibold text-white">Position not found</h2>
        <p className="mt-2 text-sm text-slate-400">
          This opening may have been removed or the link is incorrect.
        </p>
        <Link className="apply-link mt-6 inline-flex" to="/">
          ← View open roles
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="apply-section-card overflow-hidden text-center">
          <div className="border-b border-emerald-900/40 bg-emerald-950/30 px-8 py-10">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-950/50"
              aria-hidden
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12.5L10 17.5L19 7.5"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight text-white">
              Application received
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Thank you for applying to <strong className="font-medium text-white">{job.title}</strong>.
              Our team will review your submission.
            </p>
          </div>
          <div className="space-y-4 px-8 py-8 text-left text-sm">
            <p className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-3 text-slate-300">
              Demo scoring result:{" "}
              <strong className="text-white">
                {submitted.label === 1 ? "auto-apply signal" : "human-like signal"}
              </strong>{" "}
              (P={submitted.probability.toFixed(2)}).
            </p>
            <p className="leading-relaxed text-slate-400">{submitted.reasoning}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/" className="apply-link-secondary">
                Browse more jobs
              </Link>
              <Link to="/recruiter" className="apply-link">
                Recruiter dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article className="apply-page">
      <div className="mb-8 lg:mb-10">
        <nav aria-label="Breadcrumb">
          <Link to="/" className="apply-breadcrumb">
            ← Careers home
          </Link>
        </nav>
        <div className="mt-4 lg:hidden">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
            {job.department}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">{job.title}</h1>
          <p className="mt-1 text-sm text-slate-400">{job.location}</p>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(260px,300px)_minmax(0,1fr)] lg:gap-12 xl:gap-16">
        <aside className="hidden lg:block">
          <div className="apply-job-panel sticky top-6 space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                {job.department}
              </p>
              <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-white xl:text-3xl">
                {job.title}
              </h1>
            </div>
            <dl className="grid gap-3 border-t border-slate-800/80 pt-5 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Location
                </dt>
                <dd className="mt-0.5 font-medium text-slate-200">{job.location}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Job type
                </dt>
                <dd className="mt-0.5 font-medium text-slate-200">Full-time</dd>
              </div>
            </dl>
            <div className="border-t border-slate-800/80 pt-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                About the role
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{job.jd_text}</p>
            </div>
            <p className="border-t border-slate-800/80 pt-5 text-xs leading-relaxed text-slate-500">
              Your answers and interaction timing help demo auto-apply detection. Keystroke content
              is not recorded.
            </p>
          </div>
        </aside>

        <main aria-labelledby="apply-form-heading">
          <h2 id="apply-form-heading" className="sr-only">
            Application for {job.title}
          </h2>
          <ApplicationForm job={job} onSubmitted={setSubmitted} />
        </main>
      </div>
    </article>
  );
}
