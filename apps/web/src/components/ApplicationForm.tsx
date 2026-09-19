import { useEffect, useMemo, useRef, useState } from "react";
import type { AnswerMap, Detection, Field, Job, Section } from "../lib/types.ts";
import { getBackend } from "../lib/backendInstance.ts";
import { loadClientSignals } from "../lib/fingerprint.ts";
import { TelemetryCollector } from "../lib/telemetry.ts";
import FieldRenderer from "./FieldRenderer.tsx";
import SectionNav from "./SectionNav.tsx";

type Props = {
  job: Job;
  onSubmitted: (detection: Detection) => void;
};

function renderSectionFields(
  section: Section,
  answers: AnswerMap,
  handlers: {
    setAnswer: (name: string, value: string | string[] | null) => void;
    onFocus: (name: string) => void;
    onBlur: (name: string, len: number) => void;
    onInput: (name: string, len: number) => void;
    onPaste: (name: string, pasteLen: number, len: number) => void;
  },
) {
  const fieldProps = (field: Field) => (
    <FieldRenderer
      key={field.name}
      field={field}
      value={answers[field.name] ?? null}
      onChange={handlers.setAnswer}
      onFocus={handlers.onFocus}
      onBlur={handlers.onBlur}
      onInput={handlers.onInput}
      onPaste={handlers.onPaste}
    />
  );

  if (section.id === "contact" && section.fields.length >= 3) {
    const [first, second, ...rest] = section.fields;
    return (
      <>
        <div className="grid gap-5 sm:grid-cols-2">
          {first ? fieldProps(first) : null}
          {second ? fieldProps(second) : null}
        </div>
        {rest.map((field) => fieldProps(field))}
      </>
    );
  }

  return section.fields.map((field) => fieldProps(field));
}

export default function ApplicationForm({ job, onSubmitted }: Props) {
  const sections = job.sections;
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? "");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const telemetryRef = useRef<TelemetryCollector | null>(null);
  const prevSection = useRef(sectionId);

  const sectionIndex = useMemo(
    () => sections.findIndex((s) => s.id === sectionId),
    [sections, sectionId],
  );
  const section = sections[sectionIndex];

  useEffect(() => {
    const collector = new TelemetryCollector();
    telemetryRef.current = collector;
    let cancelled = false;

    void (async () => {
      const signals = await loadClientSignals();
      const backend = getBackend();
      const { session_id } = await backend.createSession(job.id, signals, "");
      if (cancelled) return;
      setSessionId(session_id);
      collector.startFlush(async (events) => {
        await backend.ingestTelemetry(session_id, events);
      });
    })();

    return () => {
      cancelled = true;
      collector.stop();
    };
  }, [job.id]);

  useEffect(() => {
    if (prevSection.current !== sectionId) {
      telemetryRef.current?.recordSectionChange(sectionId);
      prevSection.current = sectionId;
    }
  }, [sectionId]);

  function setAnswer(name: string, value: string | string[] | null) {
    setAnswers((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId || !telemetryRef.current) return;
    setSubmitting(true);
    setError(null);
    try {
      const signals = await loadClientSignals();
      const backend = getBackend();
      await telemetryRef.current.flushFinal();
      const detection = await backend.submitApplication(
        sessionId,
        answers,
        signals,
      );
      onSubmitted(detection);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (sectionIndex < sections.length - 1) {
      setSectionId(sections[sectionIndex + 1]!.id);
    }
  }

  function goPrev() {
    if (sectionIndex > 0) {
      setSectionId(sections[sectionIndex - 1]!.id);
    }
  }

  if (!section) return null;

  const isLast = sectionIndex === sections.length - 1;
  const isEeo = section.id === "eeo";

  const fieldHandlers = {
    setAnswer,
    onFocus: (name: string) => telemetryRef.current?.recordFocus(name),
    onBlur: (name: string, len: number) => telemetryRef.current?.recordBlur(name, len),
    onInput: (name: string, len: number) => telemetryRef.current?.recordInput(name, len),
    onPaste: (name: string, pasteLen: number, len: number) =>
      telemetryRef.current?.recordPaste(name, pasteLen, len),
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="lg:grid lg:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)] lg:items-start lg:gap-10"
      noValidate
    >
      <div className="mb-2 lg:sticky lg:top-6 lg:mb-0">
        <SectionNav
          sections={sections}
          currentId={sectionId}
          onSelect={setSectionId}
        />
      </div>

      <div className="min-w-0 space-y-6">
        <fieldset className="apply-section-card">
          <legend className="sr-only">{section.title}</legend>
          <div className="border-b border-slate-800/80 px-6 py-5 sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
              Section {sectionIndex + 1}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {section.title}
            </h2>
            {isEeo ? (
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-400">
                Responses are voluntary and used only for equal employment opportunity reporting where
                applicable.
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-400">
                Fields marked with <span className="text-emerald-400/90">*</span> are required.
              </p>
            )}
          </div>

          <div className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
            {renderSectionFields(section, answers, fieldHandlers)}
          </div>

          {error ? (
            <div
              className="mx-6 mb-6 rounded-lg border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-200 sm:mx-8"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div className="apply-section-footer flex flex-wrap items-center justify-between gap-3 px-6 py-4 sm:px-8">
            <button
              type="button"
              disabled={sectionIndex === 0}
              onClick={goPrev}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-40"
            >
              Previous
            </button>
            {isLast ? (
              <button
                type="submit"
                disabled={submitting || !sessionId}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-950/50 transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? "Submitting application…" : "Submit application"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-slate-100"
              >
                Continue
              </button>
            )}
          </div>
        </fieldset>

        {!sessionId ? (
          <p className="text-center text-xs text-slate-500" aria-live="polite">
            Preparing secure application session…
          </p>
        ) : null}
      </div>
    </form>
  );
}
