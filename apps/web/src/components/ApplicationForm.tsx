import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AnswerMap, Detection, Job, Section } from "../lib/types.ts";
import { getBackend } from "../lib/backendInstance.ts";
import { loadClientSignals } from "../lib/fingerprint.ts";
import { TelemetryCollector } from "../lib/telemetry.ts";
import FieldRenderer from "./FieldRenderer.tsx";

type Props = {
  job: Job;
  onSubmitted: (detection: Detection) => void;
};

function sectionForField(job: Job, name: string): string | null {
  for (const section of job.sections) {
    if (section.fields.some((f) => f.name === name)) return section.id;
  }
  return null;
}

export default function ApplicationForm({ job, onSubmitted }: Props) {
  const sections = job.sections;
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const telemetryRef = useRef<TelemetryCollector | null>(null);
  const lastSection = useRef<string | null>(null);

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

  function noteSection(name: string) {
    const sectionId = sectionForField(job, name);
    if (!sectionId) return;
    if (lastSection.current !== sectionId) {
      telemetryRef.current?.recordSectionChange(sectionId);
      lastSection.current = sectionId;
    }
  }

  function setAnswer(name: string, value: string | string[] | null) {
    setAnswers((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
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

  const fieldHandlers = {
    setAnswer,
    onFocus: (name: string) => {
      noteSection(name);
      telemetryRef.current?.recordFocus(name);
    },
    onBlur: (name: string, len: number) => telemetryRef.current?.recordBlur(name, len),
    onInput: (name: string, len: number) => telemetryRef.current?.recordInput(name, len),
    onPaste: (name: string, pasteLen: number, len: number) =>
      telemetryRef.current?.recordPaste(name, pasteLen, len),
  };

  function renderSection(section: Section, index: number) {
    const isEeo = section.id === "eeo";
    const isContact = section.id === "contact";
    return (
      <div key={section.id} className="flex flex-col gap-4">
        {index > 0 ? <hr className="gh-divider my-2" /> : null}
        {!isContact ? (
          <p className="text-base font-bold leading-6">
            {section.title}
            {isEeo ? (
              <span className="mt-2 block text-sm font-normal" style={{ color: "var(--gh-text-60)" }}>
                Responses are voluntary and used only for equal employment opportunity reporting
                where applicable.
              </span>
            ) : null}
          </p>
        ) : null}
        {isContact && section.fields.length >= 2 ? (
          <>
            {section.fields.map((field) => (
              <FieldRenderer
                key={field.name}
                field={field}
                value={answers[field.name] ?? null}
                onChange={fieldHandlers.setAnswer}
                onFocus={fieldHandlers.onFocus}
                onBlur={fieldHandlers.onBlur}
                onInput={fieldHandlers.onInput}
                onPaste={fieldHandlers.onPaste}
              />
            ))}
          </>
        ) : (
          section.fields.map((field) => (
            <FieldRenderer
              key={field.name}
              field={field}
              value={answers[field.name] ?? null}
              onChange={fieldHandlers.setAnswer}
              onFocus={fieldHandlers.onFocus}
              onBlur={fieldHandlers.onBlur}
              onInput={fieldHandlers.onInput}
              onPaste={fieldHandlers.onPaste}
            />
          ))
        )}
      </div>
    );
  }

  return (
    <section id="application" className="scroll-mt-8">
      <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="gh-title">Apply for this job</h2>
          <p className="mt-2 flex text-sm" style={{ color: "var(--gh-text-60)" }}>
            <span style={{ color: "var(--gh-asterisk)" }} className="mr-1">
              *
            </span>
            indicates a required field
          </p>
        </div>
        <button type="button" className="gh-pill-secondary self-start" disabled title="Not available in this demo">
          Autofill my application
        </button>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 flex flex-col gap-6" noValidate>
        {sections.map((section, index) => renderSection(section, index))}

        {error ? (
          <p className="text-sm" style={{ color: "var(--gh-asterisk)" }} role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button type="submit" className="gh-pill" disabled={submitting || !sessionId}>
            {submitting ? "Submitting application…" : "Submit application"}
          </button>
        </div>

        {!sessionId ? (
          <p className="text-center text-xs" style={{ color: "var(--gh-text-60)" }} aria-live="polite">
            Preparing application session…
          </p>
        ) : null}
      </form>
    </section>
  );
}
