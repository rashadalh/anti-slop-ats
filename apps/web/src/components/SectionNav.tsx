import type { Section } from "../lib/types.ts";

type Props = {
  sections: Section[];
  currentId: string;
  onSelect: (id: string) => void;
};

function stepStatus(index: number, currentIndex: number): "complete" | "current" | "upcoming" {
  if (index < currentIndex) return "complete";
  if (index === currentIndex) return "current";
  return "upcoming";
}

export default function SectionNav({ sections, currentId, onSelect }: Props) {
  const currentIndex = Math.max(
    0,
    sections.findIndex((s) => s.id === currentId),
  );
  const progressPct = Math.round(((currentIndex + 1) / sections.length) * 100);

  return (
    <nav aria-label="Application progress" className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>
            Step {currentIndex + 1} of {sections.length}
          </span>
          <span className="tabular-nums">{progressPct}%</span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-slate-800"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Application completion"
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <ol className="hidden flex-col gap-0 lg:flex">
        {sections.map((section, index) => {
          const status = stepStatus(index, currentIndex);
          const active = status === "current";
          const complete = status === "complete";

          return (
            <li key={section.id} className="relative flex gap-3 pb-6 last:pb-0">
              {index < sections.length - 1 ? (
                <span
                  className="absolute left-[0.6875rem] top-8 h-[calc(100%-1.25rem)] w-px bg-slate-800"
                  aria-hidden
                />
              ) : null}
              <span
                className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  complete
                    ? "bg-emerald-600 text-white"
                    : active
                      ? "bg-white text-slate-950 ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-slate-950"
                      : "border border-slate-700 bg-slate-900 text-slate-500"
                }`}
                aria-hidden
              >
                {complete ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path
                      d="M2.5 6L5 8.5L9.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <button
                type="button"
                onClick={() => onSelect(section.id)}
                aria-current={active ? "step" : undefined}
                className={`min-w-0 flex-1 pt-0.5 text-left transition-colors ${
                  active ? "text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="block text-sm font-medium leading-snug">{section.title}</span>
                {active ? (
                  <span className="mt-0.5 block text-xs text-emerald-400/90">In progress</span>
                ) : complete ? (
                  <span className="mt-0.5 block text-xs text-slate-500">Complete</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      <ol className="flex gap-2 overflow-x-auto pb-1 lg:hidden" aria-label="Section shortcuts">
        {sections.map((section, index) => {
          const active = section.id === currentId;
          return (
            <li key={section.id} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(section.id)}
                aria-current={active ? "step" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-900/40"
                    : "border border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700"
                }`}
              >
                {index + 1}. {section.title}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
