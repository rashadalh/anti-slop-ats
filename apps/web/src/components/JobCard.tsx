import { Link } from "react-router-dom";
import type { Job } from "../lib/types.ts";

export default function JobCard({ job }: { job: Job }) {
  return (
    <tr>
      <td>
        <Link to={`/apply/${job.slug}`} className="gh-job-link">
          <span className="gh-job-title body--medium">{job.title}</span>
        </Link>
      </td>
      <td>
        <Link to={`/apply/${job.slug}`} className="gh-job-link">
          {job.location}
        </Link>
      </td>
    </tr>
  );
}
