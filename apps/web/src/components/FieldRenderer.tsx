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
    "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

  if (field.type === "textarea") {
    const text = str(value);
    return (
      <label className="block text-sm" htmlFor={id}>
        <span className="font-medium text-slate-200">
          {field.label}
          {field.required ? " *" : ""}
        </span>
        <textarea
          id={id}
          required={field.required}
          rows={5}
          className={common}
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
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block text-sm" htmlFor={id}>
        <span className="font-medium text-slate-200">
          {field.label}
          {field.required ? " *" : ""}
        </span>
        <select
          id={id}
          required={field.required}
          className={common}
          value={str(value)}
          onFocus={() => onFocus(field.name)}
          onBlur={() => onBlur(field.name, str(value).length)}
          onChange={(e) => {
            onChange(field.name, e.target.value);
            onInput(field.name, e.target.value.length);
          }}
        >
          <option value="">Select…</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  const inputType = field.type === "email" ? "email" : "text";
  const text = str(value);
  return (
    <label className="block text-sm" htmlFor={id}>
      <span className="font-medium text-slate-200">
        {field.label}
        {field.required ? " *" : ""}
      </span>
      <input
        id={id}
        type={inputType}
        required={field.required}
        className={common}
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
    </label>
  );
}
