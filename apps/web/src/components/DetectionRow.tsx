import type { Detection } from "../lib/types.ts";
import ReasoningPanel from "./ReasoningPanel.tsx";

type Props = {
  detection: Detection;
  jobTitle?: string;
  onOverride: (id: string, label: 0 | 1) => void;
};

function displayLabel(d: Detection): 0 | 1 {
  return d.overridden_label ?? d.label;
}

export default function DetectionRow({ detection, jobTitle, onOverride }: Props) {
  const shown = displayLabel(detection);
  const autoApply = shown === 1;

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {detection.source} · {jobTitle ?? detection.job_id}
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {autoApply ? "Likely auto-apply" : "Likely human"}
            {detection.overridden_label !== null ? (
              <span className="ml-2 text-sm font-normal text-amber-400">
                (override)
              </span>
            ) : null}
          </p>
        </div>
        <div className="text-right text-sm">
          <p>
            <span className="text-slate-400">P(auto): </span>
            <span className="font-mono text-emerald-300">
              {detection.probability.toFixed(2)}
            </span>
          </p>
          <p>
            <span className="text-slate-400">Confidence: </span>
            <span className="font-mono text-slate-200">
              {detection.confidence.toFixed(2)}
            </span>
          </p>
        </div>
      </div>

      <ReasoningPanel detection={detection} />

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
          onClick={() => onOverride(detection.id, 0)}
        >
          Mark human (0)
        </button>
        <button
          type="button"
          className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
          onClick={() => onOverride(detection.id, 1)}
        >
          Mark auto-apply (1)
        </button>
      </div>
    </article>
  );
}
