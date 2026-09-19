import type { Detection } from "../lib/types.ts";

export default function ReasoningPanel({ detection }: { detection: Detection }) {
  const f = detection.features;
  return (
    <div className="mt-3 space-y-2 text-sm text-slate-300">
      <p>{detection.reasoning}</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-3">
        <div>
          <dt>Duration</dt>
          <dd className="text-slate-200">{f.duration_ms} ms</dd>
        </div>
        <div>
          <dt>Fields</dt>
          <dd className="text-slate-200">{f.field_count}</dd>
        </div>
        <div>
          <dt>Paste ratio</dt>
          <dd className="text-slate-200">{f.paste_ratio.toFixed(2)}</dd>
        </div>
        <div>
          <dt>Section jumps</dt>
          <dd className="text-slate-200">{f.section_jumps}</dd>
        </div>
        <div>
          <dt>Hard rule</dt>
          <dd className="text-slate-200">{f.hard_rule}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd className="text-slate-200">{detection.mode}</dd>
        </div>
      </dl>
    </div>
  );
}
