import type { Field } from "../lib/types.ts";

type Props = {
  field: Field;
  value: string | string[] | null;
  onChange: (name: string, value: string | string[] | null) => void;
  onFocus: (name: string) => void;
  onBlur: (name: string, len: number) => void;
  onInput: (name: string, len: number) => void;
  onPaste: (name: string, pasteLen: number, len: number) => void;
};

function str(v: string | string[] | null): string {
  if (v === null) return "";
  return Array.isArray(v) ? v.join(", ") : v;
}

function RequiredMark({ required }: { required: boolean }) {
  if (!required) return null;
  return (
    <span className="req" aria-hidden>
      *
    </span>
  );
}

export default function FieldRenderer({
  field,
  value,
  onChange,
  onFocus,
  onBlur,
  onInput,
  onPaste,
}: Props) {
  const id = `field-${field.name}`;
  const wide = field.type === "textarea";
  const text = str(value);

  return (
    <div className={wide ? "gh-field-wide w-full" : "gh-field w-full"}>
      <div className={`gh-input-shell ${wide ? "input-wrapper__multi-line" : ""}`}>
        <label className="gh-label" htmlFor={id} id={`${id}-label`}>
          {field.label}
          <RequiredMark required={field.required} />
          {field.required ? <span className="sr-only"> (required)</span> : null}
        </label>
        {field.type === "textarea" ? (
          <textarea
            id={id}
            name={field.name}
            required={field.required}
            aria-required={field.required}
            rows={4}
            className="gh-control"
            value={text}
            onFocus={() => onFocus(field.name)}
            onBlur={() => onBlur(field.name, text.length)}
            onChange={(e) => {
              onChange(field.name, e.target.value);
              onInput(field.name, e.target.value.length);
            }}
            onPaste={(e) => {
              const paste = e.clipboardData.getData("text");
              const nextLen = text.length + paste.length;
              onPaste(field.name, paste.length, nextLen);
            }}
          />
        ) : field.type === "select" ? (
          <select
            id={id}
            name={field.name}
            required={field.required}
            aria-required={field.required}
            className="gh-control"
            value={text}
            onFocus={() => onFocus(field.name)}
            onBlur={() => onBlur(field.name, text.length)}
            onChange={(e) => {
              onChange(field.name, e.target.value);
              onInput(field.name, e.target.value.length);
            }}
          >
            <option value="">Select...</option>
            {field.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            name={field.name}
            type={field.type === "email" ? "email" : "text"}
            required={field.required}
            aria-required={field.required}
            autoComplete={
              field.name === "email"
                ? "email"
                : field.name === "first_name"
                  ? "given-name"
                  : field.name === "last_name"
                    ? "family-name"
                    : field.name.includes("name")
                      ? "name"
                      : undefined
            }
            className="gh-control"
            value={text}
            onFocus={() => onFocus(field.name)}
            onBlur={() => onBlur(field.name, text.length)}
            onChange={(e) => {
              onChange(field.name, e.target.value);
              onInput(field.name, e.target.value.length);
            }}
            onPaste={(e) => {
              const paste = e.clipboardData.getData("text");
              const nextLen = text.length + paste.length;
              onPaste(field.name, paste.length, nextLen);
            }}
          />
        )}
      </div>
    </div>
  );
}
