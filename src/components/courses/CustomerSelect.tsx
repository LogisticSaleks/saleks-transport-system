"use client";

export type CustomerTariffOption = {
  id: string;
  name: string;
  type: string;
  billableKmLogic: string;
  minKm: number | null;
  maxKm: number | null;
  pricePerKm: number | null;
  fixedPrice: number | null;
  waitingHourlyRate: number | null;
  portFeeIncluded: boolean;
  isActive: boolean;
};

export type CustomerOption = {
  id: string;
  name: string;
  tariffs: readonly CustomerTariffOption[];
};

type CustomerSelectProps = {
  value: string;
  customers: readonly CustomerOption[];
  rowNumber: number;
  onChange: (customerId: string) => void;
};

export default function CustomerSelect({
  value,
  customers,
  rowNumber,
  onChange,
}: CustomerSelectProps) {
  return (
    <select
      value={value}
      aria-label={`Клиент, ред ${rowNumber}`}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded border border-transparent bg-transparent px-2 text-slate-900 outline-none transition hover:border-slate-200 focus:border-slate-400 focus:bg-white"
    >
      <option value="">Избери клиент</option>

      {customers.length === 0 ? (
        <option value="" disabled>
          Няма активни клиенти
        </option>
      ) : (
        customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}
          </option>
        ))
      )}
    </select>
  );
}