"use client";

import { useState } from "react";

type CourseNoteButtonProps = {
  note: string | null | undefined;
  courseLabel?: string | null;
  buttonLabel?: string;
};

export default function CourseNoteButton({
  note,
  courseLabel,
  buttonLabel = "Бележка",
}: CourseNoteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedNote = note?.trim() ?? "";

  if (normalizedNote === "") {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-8 items-center justify-center rounded-md border border-sky-300 bg-sky-50 px-3 text-xs font-semibold text-sky-800 transition hover:border-sky-400 hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-300"
      >
        {buttonLabel}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label="Бележка за курс"
        >
          <div className="w-full max-w-xl rounded-2xl border border-slate-300 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Бележка за курс
                </h2>

                {courseLabel && (
                  <p className="mt-1 text-sm text-slate-500">
                    {courseLabel}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Затвори
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                {normalizedNote}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
