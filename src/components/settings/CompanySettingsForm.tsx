"use client";

import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type HTMLAttributes,
} from "react";

import { useCan } from "@/components/auth/AuthContext";
import type {
  CompanySettings,
  CompanyStatusValue,
} from "@/lib/settings/companySettings";

type CompanySettingsFormProps = {
  initialCompany: CompanySettings;
};

type EditableCompanyField =
  | "name"
  | "legalName"
  | "vatNumber"
  | "registrationNumber"
  | "email"
  | "phone"
  | "website"
  | "street"
  | "city"
  | "postalCode"
  | "country"
  | "notes";

type CompanySettingsApiResponse = {
  company?: CompanySettings;
  error?: string;
};

const COMPANY_STATUSES: readonly {
  value: CompanyStatusValue;
  label: string;
}[] = [
  {
    value: "ACTIVE",
    label: "Active",
  },
  {
    value: "INACTIVE",
    label: "Inactive",
  },
];

export default function CompanySettingsForm({
  initialCompany,
}: CompanySettingsFormProps) {
  const canManageSettings = useCan("settings:manage");
  const [formState, setFormState] =
    useState<CompanySettings>(initialCompany);

  const [isSaving, setIsSaving] =
    useState(false);

  const [saveError, setSaveError] =
    useState<string | null>(null);

  const [saveMessage, setSaveMessage] =
    useState<string | null>(null);

  const hasCompanyRecord =
    formState.id !== null;

  const lastUpdatedLabel = useMemo(
    () =>
      formState.updatedAt
        ? formatDateTime(formState.updatedAt)
        : "Not saved yet",
    [formState.updatedAt],
  );

  function handleFieldChange(
    field: EditableCompanyField,
    value: string,
  ): void {
    if (!canManageSettings) {
      return;
    }

    setFormState((currentState) => ({
      ...currentState,
      [field]: value,
    }));

    setSaveError(null);
    setSaveMessage(null);
  }

  function handleStatusChange(
    event: ChangeEvent<HTMLSelectElement>,
  ): void {
    if (!canManageSettings) {
      return;
    }

    const value = event.target.value;

    setFormState((currentState) => ({
      ...currentState,
      status:
        value === "INACTIVE"
          ? "INACTIVE"
          : "ACTIVE",
    }));

    setSaveError(null);
    setSaveMessage(null);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!canManageSettings) {
      setSaveError("Твоята роля няма право да променя company settings.");
      setSaveMessage(null);
      return;
    }

    const validationError =
      validateCompanySettings(formState);

    if (validationError) {
      setSaveError(validationError);
      setSaveMessage(null);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const response = await fetch(
        "/api/settings/company",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formState),
        },
      );

      const responseData =
        (await response
          .json()
          .catch(() => null)) as
          | CompanySettingsApiResponse
          | null;

      if (!response.ok) {
        throw new Error(
          responseData?.error ??
            "Company settings could not be saved.",
        );
      }

      if (!responseData?.company) {
        throw new Error(
          "API did not return the saved company settings.",
        );
      }

      setFormState(responseData.company);
      setSaveMessage("Company settings saved.");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Company settings could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      {!canManageSettings && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800 shadow-sm">
          Твоята роля е read-only за company settings. Можеш да преглеждаш фирмените данни, но не можеш да ги променяш.
        </section>
      )}

      <fieldset disabled={!canManageSettings} className="contents">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Company profile
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Main company identity and administrative details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <StatusBadge status={formState.status} />

            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
              {hasCompanyRecord ? "Saved record" : "New record"}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TextField
            label="Company name"
            value={formState.name}
            required
            onChange={(value) =>
              handleFieldChange("name", value)
            }
          />

          <TextField
            label="Legal name"
            value={formState.legalName}
            onChange={(value) =>
              handleFieldChange("legalName", value)
            }
          />

          <TextField
            label="VAT number"
            value={formState.vatNumber}
            placeholder="BG..."
            onChange={(value) =>
              handleFieldChange("vatNumber", value)
            }
          />

          <TextField
            label="Registration number"
            value={formState.registrationNumber}
            onChange={(value) =>
              handleFieldChange(
                "registrationNumber",
                value,
              )
            }
          />

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800">
            Status
            <select
              value={formState.status}
              disabled={!canManageSettings}
              onChange={handleStatusChange}
              className="h-10 rounded-md border border-slate-400 bg-white px-3 text-sm text-slate-950 outline-none transition hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            >
              {COMPANY_STATUSES.map((status) => (
                <option
                  key={status.value}
                  value={status.value}
                >
                  {status.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Contact details
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TextField
            label="Email"
            value={formState.email}
            inputMode="email"
            placeholder="office@example.com"
            onChange={(value) =>
              handleFieldChange("email", value)
            }
          />

          <TextField
            label="Phone"
            value={formState.phone}
            inputMode="tel"
            onChange={(value) =>
              handleFieldChange("phone", value)
            }
          />

          <TextField
            label="Website"
            value={formState.website}
            inputMode="url"
            placeholder="https://..."
            onChange={(value) =>
              handleFieldChange("website", value)
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">
          Address
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TextField
            label="Street"
            value={formState.street}
            className="xl:col-span-2"
            onChange={(value) =>
              handleFieldChange("street", value)
            }
          />

          <TextField
            label="Postal code"
            value={formState.postalCode}
            onChange={(value) =>
              handleFieldChange("postalCode", value)
            }
          />

          <TextField
            label="City"
            value={formState.city}
            onChange={(value) =>
              handleFieldChange("city", value)
            }
          />

          <TextField
            label="Country"
            value={formState.country}
            placeholder="BG"
            maxLength={2}
            onChange={(value) =>
              handleFieldChange(
                "country",
                value.toUpperCase(),
              )
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-slate-800">
          Notes
          <textarea
            value={formState.notes}
            rows={5}
            readOnly={!canManageSettings}
            onChange={(event) =>
              handleFieldChange(
                "notes",
                event.target.value,
              )
            }
            placeholder="Internal company notes"
            className="rounded-md border border-slate-400 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 read-only:cursor-not-allowed read-only:bg-slate-100 read-only:text-slate-500"
          />
        </label>
      </section>

      </fieldset>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">
          <div>
            Last updated:{" "}
            <span className="font-semibold text-slate-900">
              {lastUpdatedLabel}
            </span>
          </div>

          {saveError && (
            <div
              role="alert"
              className="mt-2 font-medium text-red-700"
            >
              {saveError}
            </div>
          )}

          {saveMessage && (
            <div className="mt-2 font-medium text-emerald-700">
              {saveMessage}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSaving || !canManageSettings}
          aria-busy={isSaving}
          className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save company settings"}
        </button>
      </section>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  inputMode,
  maxLength,
  className = "",
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
  className?: string;
  readOnly?: boolean;
}) {
  return (
    <label
      className={[
        "flex flex-col gap-1.5 text-sm font-semibold text-slate-800",
        className,
      ].join(" ")}
    >
      {label}
      <input
        type="text"
        value={value}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        readOnly={readOnly}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-10 rounded-md border border-slate-400 bg-white px-3 text-sm text-slate-950 outline-none transition hover:border-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 read-only:cursor-not-allowed read-only:bg-slate-100 read-only:text-slate-500"
      />
    </label>
  );
}

function StatusBadge({
  status,
}: {
  status: CompanyStatusValue;
}) {
  const className =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span
      className={[
        "rounded-full px-3 py-1 font-semibold",
        className,
      ].join(" ")}
    >
      {status === "ACTIVE" ? "Active" : "Inactive"}
    </span>
  );
}

function validateCompanySettings(
  company: CompanySettings,
): string | null {
  if (company.name.trim() === "") {
    return "Company name is required.";
  }

  if (
    company.country.trim() !== "" &&
    company.country.trim().length !== 2
  ) {
    return "Country must be a 2-letter country code, for example BG or NL.";
  }

  return null;
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}