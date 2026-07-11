"use client";

type ManualMarkerProps = {
  visible: boolean;
  fieldLabel: string;
};

export default function ManualMarker({
  visible,
  fieldLabel,
}: ManualMarkerProps) {
  if (!visible) {
    return null;
  }

  const description = `${fieldLabel} е въведено ръчно`;

  return (
    <span
      role="img"
      aria-label={description}
      title={description}
      className="pointer-events-none absolute right-7 top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded bg-amber-100 px-1 text-xs font-bold leading-none text-amber-700"
    >
      ✎
    </span>
  );
}