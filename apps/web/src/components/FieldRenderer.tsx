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
    <span className="text-emerald-400/90" aria-hidden>
      {" "}
      *
    </span>
  );
}

function FieldLabel({ id, field }: { id: string; field: Field }) {
  return (
    <span className="mb-1.5 block text-sm font-medium text-slate-200">
      <label htmlFor={id}>
        {field.label}
        <RequiredMark required={field.required} />
      </label>
      {field.required ? (
        <span className="sr-only"> (required)</span>
      ) : (
        <span className="ml-1 text-xs font-normal text-slate-500">(optional)</span>
      )}
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
  const common =
    "w-full rounded-lg border border-slate-700/90 bg-slate-950/80 px-3.5 py-2.5 text-sm text-white shadow-inner shadow-black/20 placeholder:text-slate-500 transition-[border-color,box-shadow] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60";

  if (field.type === "textarea") {
    const text = str(value);
    return (
      <div className="text-sm">
        <FieldLabel id={id} field={field} />
        <textarea
          id={id}
          name={field.name}
          required={field.required}
          aria-required={field.required}
          rows={5}
          className={common}
          placeholder={`Enter your response…`}
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
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div className="text-sm">
        <FieldLabel id={id} field={field} />
        <select
          id={id}
          name={field.name}
          required={field.required}
          aria-required={field.required}
          className={common}
          value={str(value)}
          onFocus={() => onFocus(field.name)}
          onBlur={() => onBlur(field.name, str(value).length)}
          onChange={(e) => {
            onChange(field.name, e.target.value);
            onInput(field.name, e.target.value.length);
          }}
        >
          <option value="">Select an option…</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const inputType = field.type === "email" ? "email" : "text";
  const text = str(value);
  return (
    <div className="text-sm">
      <FieldLabel id={id} field={field} />
      <input
        id={id}
        name={field.name}
        type={inputType}
        required={field.required}
        aria-required={field.required}
        autoComplete={field.name === "email" ? "email" : field.name.includes("name") ? "name" : undefined}
        className={common}
        placeholder={field.label}
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
    </div>
  );
}
