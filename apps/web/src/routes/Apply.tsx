import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import ApplicationForm from "../components/ApplicationForm.tsx";
import { getBackend } from "../lib/backendInstance.ts";
import type { Detection } from "../lib/types.ts";

function LocationIcon() {
  return (
    <svg className="mt-0.5 shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2a7.3 7.3 0 0 1 7.3 7.3c0 4.4-4.3 10.2-6.6 13.2a1.5 1.5 0 0 1-2.4 0C8 19.5 4.7 13.7 4.7 9.3A7.3 7.3 0 0 1 12 2Zm0 4.7a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z"
      />
    </svg>
  );
}

export default function Apply() {
  const { slug } = useParams<{ slug: string }>();
  const job = slug ? getBackend().getJob(slug) : null;
  const [submitted, setSubmitted] = useState<Detection | null>(null);

  if (!job) {
    return (
      <div>
        <Link className="gh-back" to="/">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              fill="currentColor"
              d="M14.27 3.13a1.1 1.1 0 0 1 .51 2.23L7.57 12l7.21 7.21a1.1 1.1 0 1 1-1.56 1.56L5.62 13.14a1.1 1.1 0 0 1 0-1.56l8.14-8.17c.2-.2.47-.3.51-.28Z"
            />
          </svg>
          Back to jobs
        </Link>
        <h1 className="gh-title gh-title-lg mt-8">Position not found</h1>
        <p className="mt-3 text-base" style={{ color: "var(--gh-text-60)" }}>
          This opening may have been removed or the link is incorrect.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div>
        <Link className="gh-back" to="/">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              fill="currentColor"
              d="M14.27 3.13a1.1 1.1 0 0 1 .51 2.23L7.57 12l7.21 7.21a1.1 1.1 0 1 1-1.56 1.56L5.62 13.14a1.1 1.1 0 0 1 0-1.56l8.14-8.17c.2-.2.47-.3.51-.28Z"
            />
          </svg>
          Back to jobs
        </Link>
        <h1 className="gh-title gh-title-lg mt-8">Thank you for applying.</h1>
        <p className="gh-prose mt-4">
          Your application for <strong>{job.title}</strong> has been received. If there is a
          fit, someone will be getting back to you.
        </p>
        <p className="mt-6 text-sm" style={{ color: "var(--gh-text-60)" }}>
          Demo scoring result:{" "}
          <strong style={{ color: "var(--gh-text)" }}>
            {submitted.label === 1 ? "auto-apply signal" : "human-like signal"}
          </strong>{" "}
          (P={submitted.probability.toFixed(2)}). {submitted.reasoning}
        </p>
        <div className="mt-8">
          <Link to="/recruiter" className="gh-pill-secondary">
            Recruiter dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <article>
      <Link className="gh-back" to="/">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            fill="currentColor"
            d="M14.27 3.13a1.1 1.1 0 0 1 .51 2.23L7.57 12l7.21 7.21a1.1 1.1 0 1 1-1.56 1.56L5.62 13.14a1.1 1.1 0 0 1 0-1.56l8.14-8.17c.2-.2.47-.3.51-.28Z"
          />
        </svg>
        Back to jobs
      </Link>

      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="gh-title gh-title-lg">{job.title}</h1>
          <div className="gh-location">
            <LocationIcon />
            <span>{job.location}</span>
          </div>
        </div>
        <a className="gh-pill shrink-0 self-start" href="#application">
          Apply
        </a>
      </div>

      <div className="gh-prose mt-8">
        <p>{job.jd_text}</p>
        <h3>ABOUT THE ROLE</h3>
        <p>
          This is a {job.department.toLowerCase()} opening. The application below is the live
          demo form used to collect answers and interaction telemetry for auto-apply detection.
        </p>
      </div>

      <div className="gh-alert">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
          <path
            fill="currentColor"
            d="M18.73 14C18 13.24 17.34 12.58 17.34 9.67A7.1 7.1 0 0 0 14.1 4.76a.4.4 0 0 1-.1-.3 3.1 3.1 0 0 0-1.86-3.24A3.24 3.24 0 0 0 9.74 3.48c0 .36.08.7.23 1 .06.1 0 .24-.1.3A7.1 7.1 0 0 0 6.64 9.68c0 2.86-.64 3.52-1.38 4.3C4.45 14.82 3.54 15.77 3.54 19c0 .38.31.7.7.7h4.02A4.24 4.24 0 0 0 12 22.78a4.24 4.24 0 0 0 3.46-3.1h4.02c.38 0 .7-.31.7-.7 0-3.22-.91-4.15-1.7-4.98ZM12 21.37a2.3 2.3 0 0 1-2.29-1.7h4.58A2.3 2.3 0 0 1 12 21.37Zm-6.8-3.1h13.6c-.13-1.87-.67-2.42-1.28-3.07-.83-.86-1.78-1.84-1.78-5.26A4.0 4.0 0 0 0 12 5.72a3.96 3.96 0 0 0-3.94 3.95c0 3.47-.95 4.45-1.79 5.3-.61.64-1.15 1.2-1.28 3.07H5.2Z"
          />
        </svg>
        <div>
          <p className="font-bold">Create a Job Alert</p>
          <p className="mt-1 text-base leading-6">
            Interested in building your career at Anti-Slop? Get future opportunities sent
            straight to your email.
          </p>
          <button type="button" className="gh-link mt-2 border-0 bg-transparent p-0 text-base">
            Create alert
          </button>
        </div>
      </div>

      <hr className="gh-divider" />

      <ApplicationForm job={job} onSubmitted={setSubmitted} />
    </article>
  );
}
