"use client";

export const COURSE_TYPES = [
  {
    value: "ROUND_TRIP",
    label: "Кръгов",
  },
  {
    value: "SHUNT",
    label: "Шунт",
  },
] as const;

type CourseTypeSelectProps = {
  value: string;
  rowNumber: number;
  onChange: (courseType: string) => void;
};

export default function CourseTypeSelect({
  value,
  rowNumber,
  onChange,
}: CourseTypeSelectProps) {
  return (
    <select
      value={value}
      aria-label={`Тип курс, ред ${rowNumber}`}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded border border-transparent bg-transparent px-2 text-slate-900 outline-none transition hover:border-slate-200 focus:border-slate-400 focus:bg-white"
    >
      <option value="">Избери тип</option>

      {COURSE_TYPES.map((courseType) => (
        <option
          key={courseType.value}
          value={courseType.value}
        >
          {courseType.label}
        </option>
      ))}
    </select>
  );
}