import type { Section } from "../lib/types.ts";

type Props = {
  sections: Section[];
  currentId: string;
  onSelect: (id: string) => void;
};

export default function SectionNav({ sections, currentId, onSelect }: Props) {
  return (
    <ol className="flex flex-wrap gap-2">
      {sections.map((section, index) => {
        const active = section.id === currentId;
        return (
          <li key={section.id}>
            <button
              type="button"
              onClick={() => onSelect(section.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                active
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {index + 1}. {section.title}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
