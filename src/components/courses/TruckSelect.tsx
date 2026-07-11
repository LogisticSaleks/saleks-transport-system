"use client";

export type TruckOption = {
  id: string;
  name: string;
  licensePlate: string;
  defaultFuelConsumptionLPer100Km: number;
};

type TruckSelectProps = {
  value: string;
  trucks: readonly TruckOption[];
  rowNumber: number;
  onChange: (truckId: string) => void;
};

export default function TruckSelect({
  value,
  trucks,
  rowNumber,
  onChange,
}: TruckSelectProps) {
  return (
    <select
      value={value}
      aria-label={`Камион, ред ${rowNumber}`}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded border border-transparent bg-transparent px-2 text-slate-900 outline-none transition hover:border-slate-200 focus:border-slate-400 focus:bg-white"
    >
      <option value="">Избери камион</option>

      {trucks.length === 0 ? (
        <option value="" disabled>
          Няма активни камиони
        </option>
      ) : (
        trucks.map((truck) => (
          <option key={truck.id} value={truck.id}>
            {truck.name} — {truck.licensePlate}
          </option>
        ))
      )}
    </select>
  );
}