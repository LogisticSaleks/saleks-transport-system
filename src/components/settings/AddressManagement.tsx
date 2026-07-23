"use client";

import {
  type FormEvent,
  useMemo,
  useState,
} from "react";

const ADDRESS_TYPES = [
  "TERMINAL",
  "DEPOT",
  "CUSTOMER_SITE",
  "PORT",
  "OTHER",
] as const;

type AddressTypeValue =
  (typeof ADDRESS_TYPES)[number];

type ActiveFilter =
  | "active"
  | "inactive"
  | "all";

type SourceFilter =
  | "all"
  | "manual"
  | "auto"
  | "needs-review";

export type AddressManagementRow = {
  id: string;
  name: string;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  type: AddressTypeValue;
  portCode: string | null;
  terminalCode: string | null;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

type AddressFormState = {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: string;
  longitude: string;
  type: AddressTypeValue;
  portCode: string;
  terminalCode: string;
  isActive: string;
  notes: string;
};

type AddressApiResponse = {
  address?: AddressManagementRow;
  error?: string;
};

type AddressGeocodeApiResponse =
  AddressApiResponse & {
    geocoding?: {
      searchText?: string;
      formattedAddress?: string | null;
      latitude?: number;
      longitude?: number;
    };
  };

type AddressManagementProps = {
  initialAddresses: readonly AddressManagementRow[];
};

const EMPTY_FORM: AddressFormState = {
  name: "",
  street: "",
  city: "",
  postalCode: "",
  country: "NL",
  latitude: "",
  longitude: "",
  type: "OTHER",
  portCode: "",
  terminalCode: "",
  isActive: "true",
  notes: "",
};

const TYPE_LABELS: Record<
  AddressTypeValue,
  string
> = {
  TERMINAL: "Terminal",
  DEPOT: "Depot",
  CUSTOMER_SITE: "Customer site",
  PORT: "Port",
  OTHER: "Other",
};

export default function AddressManagement({
  initialAddresses,
}: AddressManagementProps) {
  const [
    addresses,
    setAddresses,
  ] = useState<AddressManagementRow[]>(
    [...initialAddresses],
  );

  const [form, setForm] =
    useState<AddressFormState>(
      EMPTY_FORM,
    );

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState<"" | AddressTypeValue>("");

  const [
    activeFilter,
    setActiveFilter,
  ] = useState<ActiveFilter>("active");

  const [
    sourceFilter,
    setSourceFilter,
  ] = useState<SourceFilter>("all");

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    geocodingAddressId,
    setGeocodingAddressId,
  ] = useState<string | null>(null);

  const [saveError, setSaveError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const visibleAddresses = useMemo(
    () =>
      addresses.filter((address) =>
        doesAddressMatchFilters(address, {
          searchQuery,
          typeFilter,
          activeFilter,
          sourceFilter,
        }),
      ),
    [
      addresses,
      searchQuery,
      typeFilter,
      activeFilter,
      sourceFilter,
    ],
  );

  const activeCount = addresses.filter(
    (address) => address.isActive,
  ).length;

  const inactiveCount =
    addresses.length - activeCount;

  const autoCreatedCount =
    addresses.filter(
      isAutoCreatedAddress,
    ).length;

  const needsReviewCount =
    addresses.filter(
      isAddressNeedsReview,
    ).length;

  const missingCoordinatesCount =
    addresses.filter(
      (address) =>
        !hasCoordinates(address),
    ).length;

  const isEditing = editingId !== null;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setIsSaving(true);
    setSaveError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        "/api/addresses",
        {
          method: isEditing
            ? "PATCH"
            : "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            isEditing
              ? {
                  id: editingId,
                  ...createAddressPayload(
                    form,
                  ),
                }
              : createAddressPayload(
                  form,
                ),
          ),
        },
      );

      const data =
        (await response.json()) as AddressApiResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Address could not be saved.",
        );
      }

      if (!data.address) {
        throw new Error(
          "Address response is missing.",
        );
      }

      setAddresses((currentAddresses) =>
        upsertAddress(
          currentAddresses,
          data.address!,
        ),
      );

      setForm(EMPTY_FORM);
      setEditingId(null);
      setSuccessMessage(
        isEditing
          ? "Адресът е обновен."
          : "Адресът е добавен.",
      );
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Address could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(
    address: AddressManagementRow,
  ) {
    setSaveError("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        "/api/addresses",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: address.id,
            isActive:
              !address.isActive,
          }),
        },
      );

      const data =
        (await response.json()) as AddressApiResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Address status could not be updated.",
        );
      }

      if (!data.address) {
        throw new Error(
          "Address response is missing.",
        );
      }

      setAddresses((currentAddresses) =>
        upsertAddress(
          currentAddresses,
          data.address!,
        ),
      );

      setSuccessMessage(
        data.address.isActive
          ? "Адресът е активиран."
          : "Адресът е деактивиран.",
      );

      if (editingId === address.id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Address status could not be updated.",
      );
    }
  }

  async function handleFindCoordinates(
    address: AddressManagementRow,
  ): Promise<void> {
    setSaveError("");
    setSuccessMessage("");
    setGeocodingAddressId(address.id);

    try {
      const response = await fetch(
        "/api/addresses/geocode",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: address.id,
          }),
        },
      );

      const data =
        (await response.json()) as AddressGeocodeApiResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Coordinates could not be found.",
        );
      }

      if (!data.address) {
        throw new Error(
          "Address response is missing.",
        );
      }

      setAddresses((currentAddresses) =>
        upsertAddress(
          currentAddresses,
          data.address!,
        ),
      );

      if (editingId === address.id) {
        setForm(
          addressToForm(data.address),
        );
      }

      setSuccessMessage(
        data.geocoding?.formattedAddress
          ? `Координатите са добавени: ${data.geocoding.formattedAddress}`
          : "Координатите са добавени.",
      );
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Coordinates could not be found.",
      );
    } finally {
      setGeocodingAddressId(null);
    }
  }

  function handleEdit(
    address: AddressManagementRow,
  ): void {
    setEditingId(address.id);
    setSaveError("");
    setSuccessMessage("");
    setForm(addressToForm(address));
  }

  function handleCancelEdit(): void {
    setEditingId(null);
    setSaveError("");
    setSuccessMessage("");
    setForm(EMPTY_FORM);
  }

  function updateFormField(
    field: keyof AddressFormState,
    value: string,
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <SummaryCard
          label="Всички адреси"
          value={String(addresses.length)}
        />

        <SummaryCard
          label="Активни"
          value={String(activeCount)}
          tone="positive"
        />

        <SummaryCard
          label="Неактивни"
          value={String(inactiveCount)}
          tone={
            inactiveCount > 0
              ? "muted"
              : "default"
          }
        />

        <SummaryCard
          label="Auto-created"
          value={String(autoCreatedCount)}
          tone={
            autoCreatedCount > 0
              ? "warning"
              : "default"
          }
        />

        <SummaryCard
          label="Needs review"
          value={String(needsReviewCount)}
          tone={
            needsReviewCount > 0
              ? "warning"
              : "positive"
          }
        />

        <SummaryCard
          label="Без координати"
          value={String(
            missingCoordinatesCount,
          )}
          tone={
            missingCoordinatesCount > 0
              ? "warning"
              : "positive"
          }
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEditing
              ? "Edit address"
              : "Add address"}
          </h2>

          <p className="text-sm text-slate-500">
            Запази терминали, депа и клиентски адреси с координати за PTV route calculation.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid gap-4"
        >
          <div className="grid gap-4 lg:grid-cols-4">
            <TextField
              label="Име"
              value={form.name}
              required
              placeholder="RWG Container Terminal"
              onChange={(value) =>
                updateFormField(
                  "name",
                  value,
                )
              }
            />

            <SelectField
              label="Тип"
              value={form.type}
              onChange={(value) =>
                updateFormField(
                  "type",
                  value,
                )
              }
              options={ADDRESS_TYPES.map(
                (type) => ({
                  value: type,
                  label:
                    TYPE_LABELS[type],
                }),
              )}
            />

            <TextField
              label="Държава"
              value={form.country}
              required
              placeholder="NL"
              maxLength={3}
              onChange={(value) =>
                updateFormField(
                  "country",
                  value.toUpperCase(),
                )
              }
            />

            <SelectField
              label="Статус"
              value={form.isActive}
              onChange={(value) =>
                updateFormField(
                  "isActive",
                  value,
                )
              }
              options={[
                {
                  value: "true",
                  label: "Active",
                },
                {
                  value: "false",
                  label: "Inactive",
                },
              ]}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <TextField
              label="Улица / адрес"
              value={form.street}
              placeholder="Europaweg 875"
              onChange={(value) =>
                updateFormField(
                  "street",
                  value,
                )
              }
            />

            <TextField
              label="Пощенски код"
              value={form.postalCode}
              placeholder="3199 LD"
              onChange={(value) =>
                updateFormField(
                  "postalCode",
                  value,
                )
              }
            />

            <TextField
              label="Град"
              value={form.city}
              placeholder="Maasvlakte Rotterdam"
              onChange={(value) =>
                updateFormField(
                  "city",
                  value,
                )
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <TextField
              label="Latitude"
              value={form.latitude}
              placeholder="51.9500000"
              inputMode="decimal"
              onChange={(value) =>
                updateFormField(
                  "latitude",
                  value,
                )
              }
            />

            <TextField
              label="Longitude"
              value={form.longitude}
              placeholder="4.0500000"
              inputMode="decimal"
              onChange={(value) =>
                updateFormField(
                  "longitude",
                  value,
                )
              }
            />

            <TextField
              label="Port code"
              value={form.portCode}
              placeholder="RTM"
              onChange={(value) =>
                updateFormField(
                  "portCode",
                  value,
                )
              }
            />

            <TextField
              label="Terminal code"
              value={form.terminalCode}
              placeholder="RWG"
              onChange={(value) =>
                updateFormField(
                  "terminalCode",
                  value,
                )
              }
            />
          </div>

          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Notes
            <textarea
              value={form.notes}
              rows={3}
              onChange={(event) =>
                updateFormField(
                  "notes",
                  event.target.value,
                )
              }
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              placeholder="Internal notes for this address"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSaving
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Add address"}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Cancel
              </button>
            )}

            {successMessage && (
              <span className="text-sm font-medium text-emerald-700">
                {successMessage}
              </span>
            )}

            {saveError && (
              <span className="text-sm font-medium text-red-700">
                {saveError}
              </span>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Saved addresses
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Search, edit and deactivate addresses without deleting historical course data.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <TextField
                label="Search"
                value={searchQuery}
                placeholder="RWG, Moerdijk, 3199..."
                onChange={setSearchQuery}
              />

              <SelectField
                label="Type"
                value={typeFilter}
                onChange={(value) =>
                  setTypeFilter(
                    value as
                      | ""
                      | AddressTypeValue,
                  )
                }
                options={[
                  {
                    value: "",
                    label: "All types",
                  },
                  ...ADDRESS_TYPES.map(
                    (type) => ({
                      value: type,
                      label:
                        TYPE_LABELS[type],
                    }),
                  ),
                ]}
              />

              <SelectField
                label="Status"
                value={activeFilter}
                onChange={(value) =>
                  setActiveFilter(
                    value as ActiveFilter,
                  )
                }
                options={[
                  {
                    value: "active",
                    label: "Active",
                  },
                  {
                    value: "inactive",
                    label: "Inactive",
                  },
                  {
                    value: "all",
                    label: "All",
                  },
                ]}
              />

              <SelectField
                label="Source"
                value={sourceFilter}
                onChange={(value) =>
                  setSourceFilter(
                    value as SourceFilter,
                  )
                }
                options={[
                  {
                    value: "all",
                    label: "All sources",
                  },
                  {
                    value: "auto",
                    label: "Auto-created",
                  },
                  {
                    value: "needs-review",
                    label: "Needs review",
                  },
                  {
                    value: "manual",
                    label: "Manual",
                  },
                ]}
              />
            </div>
          </div>
        </div>

        <AddressTable
          addresses={visibleAddresses}
          geocodingAddressId={
            geocodingAddressId
          }
          onEdit={handleEdit}
          onToggleActive={
            handleToggleActive
          }
          onFindCoordinates={
            handleFindCoordinates
          }
        />
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?:
    | "default"
    | "positive"
    | "warning"
    | "muted";
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-2xl font-semibold",
          tone === "positive"
            ? "text-emerald-700"
            : tone === "warning"
              ? "text-amber-700"
              : tone === "muted"
                ? "text-slate-500"
                : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </p>
    </article>
  );
}

function AddressTable({
  addresses,
  geocodingAddressId,
  onEdit,
  onToggleActive,
  onFindCoordinates,
}: {
  addresses: readonly AddressManagementRow[];
  geocodingAddressId: string | null;
  onEdit: (
    address: AddressManagementRow,
  ) => void;
  onToggleActive: (
    address: AddressManagementRow,
  ) => void;
  onFindCoordinates: (
    address: AddressManagementRow,
  ) => void;
}) {
  if (addresses.length === 0) {
    return (
      <p className="px-5 py-8 text-sm text-slate-500">
        Няма адреси по избраните филтри.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1360px] border-collapse text-sm">
        <thead className="bg-slate-50">
          <tr>
            <HeaderCell>Име</HeaderCell>
            <HeaderCell>Тип</HeaderCell>
            <HeaderCell>Адрес</HeaderCell>
            <HeaderCell>Кодове</HeaderCell>
            <HeaderCell>
              Координати
            </HeaderCell>
            <HeaderCell>Статус</HeaderCell>
            <HeaderCell align="right">
              Действия
            </HeaderCell>
          </tr>
        </thead>

        <tbody>
          {addresses.map((address) => (
            <tr
              key={address.id}
              className="border-t border-slate-100 hover:bg-slate-50"
            >
              <DataCell>
                <div>
                  <p className="font-semibold text-slate-900">
                    {address.name}
                  </p>

                  <AddressSourceBadges
                    address={address}
                  />

                  {address.notes && (
                    <p className="mt-1 max-w-[280px] truncate text-xs text-slate-500">
                      {address.notes}
                    </p>
                  )}
                </div>
              </DataCell>

              <DataCell>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {
                    TYPE_LABELS[
                      address.type
                    ]
                  }
                </span>
              </DataCell>

              <DataCell>
                <div className="max-w-[360px] whitespace-normal leading-5">
                  <p className="text-slate-800">
                    {formatAddressLine(
                      address,
                    )}
                  </p>

                  <p className="text-xs text-slate-500">
                    {[
                      address.postalCode,
                      address.city,
                      address.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              </DataCell>

              <DataCell>
                <div className="space-y-1 text-xs text-slate-600">
                  <p>
                    Port:{" "}
                    <span className="font-medium text-slate-800">
                      {address.portCode ||
                        "—"}
                    </span>
                  </p>

                  <p>
                    Terminal:{" "}
                    <span className="font-medium text-slate-800">
                      {address.terminalCode ||
                        "—"}
                    </span>
                  </p>
                </div>
              </DataCell>

              <DataCell>
                {hasCoordinates(address) ? (
                  <span className="text-xs font-medium text-emerald-700">
                    {formatCoordinate(
                      address.latitude,
                    )}
                    ,{" "}
                    {formatCoordinate(
                      address.longitude,
                    )}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                    Missing
                  </span>
                )}
              </DataCell>

              <DataCell>
                <span
                  className={[
                    "rounded-full px-2 py-1 text-xs font-semibold",
                    address.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500",
                  ].join(" ")}
                >
                  {address.isActive
                    ? "Active"
                    : "Inactive"}
                </span>
              </DataCell>

              <DataCell align="right">
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onEdit(address)
                    }
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Edit
                  </button>

                  {!hasCoordinates(address) && (
                    <button
                      type="button"
                      onClick={() =>
                        onFindCoordinates(address)
                      }
                      disabled={
                        geocodingAddressId !== null
                      }
                      className="rounded-md border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {geocodingAddressId ===
                      address.id
                        ? "Finding..."
                        : "Find coordinates"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      onToggleActive(address)
                    }
                    className={[
                      "rounded-md border px-3 py-1.5 text-xs font-semibold transition",
                      address.isActive
                        ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                    ].join(" ")}
                  >
                    {address.isActive
                      ? "Deactivate"
                      : "Activate"}
                  </button>
                </div>
              </DataCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddressSourceBadges({
  address,
}: {
  address: AddressManagementRow;
}) {
  const isAutoCreated =
    isAutoCreatedAddress(address);

  const needsReview =
    isAddressNeedsReview(address);

  if (
    !isAutoCreated &&
    !needsReview
  ) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {isAutoCreated && (
        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
          Auto-created
        </span>
      )}

      {needsReview && (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          Needs review
        </span>
      )}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  inputMode?:
    | "text"
    | "decimal"
    | "numeric";
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <input
        type="text"
        value={value}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly {
    value: string;
    label: string;
  }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function HeaderCell({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={[
        "whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600",
        align === "right"
          ? "text-right"
          : "text-left",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function DataCell({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={[
        "whitespace-nowrap px-4 py-3 align-top text-slate-700",
        align === "right"
          ? "text-right"
          : "text-left",
      ].join(" ")}
    >
      {children}
    </td>
  );
}

function addressToForm(
  address: AddressManagementRow,
): AddressFormState {
  return {
    name: address.name,
    street: address.street ?? "",
    city: address.city ?? "",
    postalCode:
      address.postalCode ?? "",
    country: address.country,
    latitude:
      address.latitude === null
        ? ""
        : String(address.latitude),
    longitude:
      address.longitude === null
        ? ""
        : String(address.longitude),
    type: address.type,
    portCode: address.portCode ?? "",
    terminalCode:
      address.terminalCode ?? "",
    isActive: String(
      address.isActive,
    ),
    notes: address.notes,
  };
}

function createAddressPayload(
  form: AddressFormState,
) {
  return {
    name: form.name,
    street: form.street,
    city: form.city,
    postalCode: form.postalCode,
    country: form.country,
    latitude: form.latitude,
    longitude: form.longitude,
    type: form.type,
    portCode: form.portCode,
    terminalCode:
      form.terminalCode,
    isActive:
      form.isActive === "true",
    notes: form.notes,
  };
}

function upsertAddress(
  addresses: readonly AddressManagementRow[],
  address: AddressManagementRow,
): AddressManagementRow[] {
  const hasAddress = addresses.some(
    (existingAddress) =>
      existingAddress.id === address.id,
  );

  if (!hasAddress) {
    return sortAddresses([
      address,
      ...addresses,
    ]);
  }

  return sortAddresses(
    addresses.map((existingAddress) =>
      existingAddress.id ===
      address.id
        ? address
        : existingAddress,
    ),
  );
}

function sortAddresses(
  addresses: readonly AddressManagementRow[],
): AddressManagementRow[] {
  return [...addresses].sort(
    (firstAddress, secondAddress) => {
      if (
        firstAddress.isActive !==
        secondAddress.isActive
      ) {
        return firstAddress.isActive
          ? -1
          : 1;
      }

      const nameCompare =
        firstAddress.name.localeCompare(
          secondAddress.name,
          "bg-BG",
        );

      if (nameCompare !== 0) {
        return nameCompare;
      }

      return (
        firstAddress.city ?? ""
      ).localeCompare(
        secondAddress.city ?? "",
        "bg-BG",
      );
    },
  );
}

function doesAddressMatchFilters(
  address: AddressManagementRow,
  {
    searchQuery,
    typeFilter,
    activeFilter,
    sourceFilter,
  }: {
    searchQuery: string;
    typeFilter: "" | AddressTypeValue;
    activeFilter: ActiveFilter;
    sourceFilter: SourceFilter;
  },
): boolean {
  if (
    activeFilter === "active" &&
    !address.isActive
  ) {
    return false;
  }

  if (
    activeFilter === "inactive" &&
    address.isActive
  ) {
    return false;
  }

  if (
    typeFilter !== "" &&
    address.type !== typeFilter
  ) {
    return false;
  }

  if (
    sourceFilter === "auto" &&
    !isAutoCreatedAddress(address)
  ) {
    return false;
  }

  if (
    sourceFilter === "manual" &&
    isAutoCreatedAddress(address)
  ) {
    return false;
  }

  if (
    sourceFilter === "needs-review" &&
    !isAddressNeedsReview(address)
  ) {
    return false;
  }

  const normalizedQuery =
    normalizeSearchText(searchQuery);

  if (normalizedQuery === "") {
    return true;
  }

  return [
    address.name,
    address.street,
    address.city,
    address.postalCode,
    address.country,
    address.portCode,
    address.terminalCode,
    address.notes,
  ]
    .filter(Boolean)
    .some((value) =>
      normalizeSearchText(
        String(value),
      ).includes(normalizedQuery),
    );
}

function isAutoCreatedAddress(
  address: Pick<
    AddressManagementRow,
    "notes"
  >,
): boolean {
  const notes = address.notes;
  const normalizedNotes =
    notes.toLocaleLowerCase("bg-BG");

  return (
    notes.includes(
      "SOURCE:COURSE_AUTO_ADDRESS",
    ) ||
    normalizedNotes.includes(
      "създаден автоматично от курс",
    ) ||
    normalizedNotes.includes(
      "auto-created from course",
    )
  );
}

function isAddressNeedsReview(
  address: AddressManagementRow,
): boolean {
  return (
    isAutoCreatedAddress(address) &&
    (address.type === "OTHER" ||
      !hasCoordinates(address))
  );
}

function formatAddressLine(
  address: AddressManagementRow,
): string {
  return address.street || "—";
}

function hasCoordinates(
  address: Pick<
    AddressManagementRow,
    "latitude" | "longitude"
  >,
): boolean {
  return (
    address.latitude !== null &&
    address.longitude !== null
  );
}

function formatCoordinate(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return value.toFixed(7);
}

function normalizeSearchText(
  value: string,
): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("bg-BG");
}