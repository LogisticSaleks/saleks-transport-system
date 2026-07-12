"use client";

import { useId, useMemo } from "react";

export type AddressOption = {
  id: string;
  name: string;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  type: string;
};

export type AddressSelectionValue = {
  addressId: string;
  inputValue: string;
  isNewAddress: boolean;
};

type AddressAutocompleteProps = {
  value: string;
  inputValue: string;
  addresses: readonly AddressOption[];
  label: string;
  rowNumber: number;
  placeholder?: string;
  onChange: (value: AddressSelectionValue) => void;
};

type AddressWithLabel = {
  address: AddressOption;
  displayValue: string;
};

export default function AddressAutocomplete({
  value,
  inputValue,
  addresses,
  label,
  rowNumber,
  placeholder = "Търси или въведи нов адрес",
  onChange,
}: AddressAutocompleteProps) {
  const generatedId = useId();
  const dataListId = `address-options-${generatedId.replaceAll(
    ":",
    "",
  )}`;

  const addressOptions = useMemo<AddressWithLabel[]>(
    () =>
      addresses.map((address) => ({
        address,
        displayValue: formatAddress(address),
      })),
    [addresses],
  );

  const selectedAddress = addressOptions.find(
    (option) => option.address.id === value,
  );

  const visibleValue =
    selectedAddress?.displayValue ?? inputValue;

  function handleInputChange(nextValue: string): void {
    const matchingAddress = findMatchingAddress(
      addressOptions,
      nextValue,
    );

    if (matchingAddress) {
      onChange({
        addressId: matchingAddress.address.id,
        inputValue: matchingAddress.displayValue,
        isNewAddress: false,
      });

      return;
    }

    onChange({
      addressId: "",
      inputValue: nextValue,
      isNewAddress: nextValue.trim() !== "",
    });
  }

  function handleBlur(): void {
    const normalizedValue = visibleValue.trim();

    if (normalizedValue === "") {
      onChange({
        addressId: "",
        inputValue: "",
        isNewAddress: false,
      });

      return;
    }

    const matchingAddress = findMatchingAddress(
      addressOptions,
      normalizedValue,
    );

    if (matchingAddress) {
      onChange({
        addressId: matchingAddress.address.id,
        inputValue: matchingAddress.displayValue,
        isNewAddress: false,
      });

      return;
    }

    /*
     * Свободно въведеният адрес остава в полето.
     * При Save API-то ще го създаде в Address.
     */
    onChange({
      addressId: "",
      inputValue: normalizedValue,
      isNewAddress: true,
    });
  }

  function handleClear(): void {
    onChange({
      addressId: "",
      inputValue: "",
      isNewAddress: false,
    });
  }

  return (
    <div className="relative">
      <input
        type="text"
        list={dataListId}
        value={visibleValue}
        title={visibleValue}
        autoComplete="off"
        placeholder={placeholder}
        aria-label={`${label}, ред ${rowNumber}`}
        onChange={(event) =>
          handleInputChange(event.target.value)
        }
        onBlur={handleBlur}
        className="h-10 w-full rounded border border-transparent bg-transparent px-2 pr-8 text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-200 focus:border-slate-400 focus:bg-white"
      />

      {visibleValue !== "" && (
        <button
          type="button"
          aria-label={`Изчисти ${label}, ред ${rowNumber}`}
          title="Изчисти адреса"
          onMouseDown={(event) => event.preventDefault()}
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-lg leading-none text-slate-400 hover:text-slate-700"
        >
          ×
        </button>
      )}

      <datalist id={dataListId}>
        {addressOptions.map(({ address, displayValue }) => (
          <option key={address.id} value={displayValue}>
            {address.name}
          </option>
        ))}
      </datalist>
    </div>
  );
}

function formatAddress(address: AddressOption): string {
  const cityLine = [
    address.postalCode,
    address.city,
  ]
    .filter(Boolean)
    .join(" ");

  const details = [
    address.street,
    cityLine,
    address.country,
  ].filter(Boolean);

  if (details.length === 0) {
    return address.name;
  }

  return `${address.name} — ${details.join(", ")}`;
}

function findMatchingAddress(
  addressOptions: readonly AddressWithLabel[],
  inputValue: string,
): AddressWithLabel | undefined {
  const normalizedInput = normalizeAddressText(inputValue);

  return addressOptions.find(
    (option) =>
      normalizeAddressText(option.displayValue) ===
      normalizedInput,
  );
}

function normalizeAddressText(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("bg-BG");
}