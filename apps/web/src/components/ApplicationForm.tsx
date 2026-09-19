import { useEffect, useMemo, useRef, useState } from "react";
import type { AnswerMap, Detection, Job } from "../lib/types.ts";
import { getBackend } from "../lib/backendInstance.ts";
import { loadClientSignals } from "../lib/fingerprint.ts";
import { TelemetryCollector } from "../lib/telemetry.ts";
import FieldRenderer from "./FieldRenderer.tsx";
import SectionNav from "./SectionNav.tsx";

type Props = {
  job: Job;
  onSubmitted: (detection: Detection) => void;
};

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

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
      <SectionNav
        sections={sections}
        currentId={sectionId}
        onSelect={setSectionId}
      />

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-lg font-semibold text-white">{section.title}</h2>
        <div className="mt-6 space-y-5">
          {section.fields.map((field) => (
            <FieldRenderer
              key={field.name}
              field={field}
              value={answers[field.name] ?? null}
              onChange={setAnswer}
              onFocus={(name) => telemetryRef.current?.recordFocus(name)}
              onBlur={(name, len) => telemetryRef.current?.recordBlur(name, len)}
              onInput={(name, len) => telemetryRef.current?.recordInput(name, len)}
              onPaste={(name, pasteLen, len) =>
                telemetryRef.current?.recordPaste(name, pasteLen, len)
              }
            />
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          disabled={sectionIndex === 0}
          onClick={goPrev}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 disabled:opacity-40"
        >
          Previous
        </button>
        {isLast ? (
          <button
            type="submit"
            disabled={submitting || !sessionId}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit application"}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600"
          >
            Next section
          </button>
        )}
      </div>
    </form>
  );
}
