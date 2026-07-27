import "server-only";

import { prisma } from "@/lib/prisma";

export type CompanyStatusValue =
  | "ACTIVE"
  | "INACTIVE";

export type CompanySettings = {
  id: string | null;
  name: string;
  legalName: string;
  vatNumber: string;
  registrationNumber: string;
  email: string;
  phone: string;
  website: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  status: CompanyStatusValue;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type CompanySettingsWriteData = {
  name: string;
  legalName: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  status: CompanyStatusValue;
  notes: string | null;
};

const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  id: null,
  name: "Saleks",
  legalName: "",
  vatNumber: "",
  registrationNumber: "",
  email: "",
  phone: "",
  website: "",
  street: "",
  city: "",
  postalCode: "",
  country: "BG",
  status: "ACTIVE",
  notes: "",
  createdAt: null,
  updatedAt: null,
};

export async function loadCompanySettingsFromDb(): Promise<CompanySettings> {
  const company = await prisma.company.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!company) {
    return DEFAULT_COMPANY_SETTINGS;
  }

  return serializeCompany(company);
}

export async function saveCompanySettingsToDb(
  payload: unknown,
): Promise<CompanySettings> {
  const parsedPayload =
    parseCompanySettingsPayload(payload);

  const writeData = buildCompanyWriteData(
    parsedPayload,
  );

  const existingCompany = parsedPayload.id
    ? await prisma.company.findUnique({
        where: {
          id: parsedPayload.id,
        },
        select: {
          id: true,
        },
      })
    : await prisma.company.findFirst({
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
        },
      });

  const company = existingCompany
    ? await prisma.company.update({
        where: {
          id: existingCompany.id,
        },
        data: writeData,
      })
    : await prisma.company.create({
        data: writeData,
      });

  return serializeCompany(company);
}

export function parseCompanySettingsPayload(
  payload: unknown,
): CompanySettings {
  if (!isObjectRecord(payload)) {
    throw new Error(
      "Company settings payload must be an object.",
    );
  }

  return normalizeCompanySettings({
    id: readOptionalText(payload.id),
    name: readRequiredText(payload.name, "name"),
    legalName: readOptionalText(payload.legalName),
    vatNumber: readOptionalText(payload.vatNumber),
    registrationNumber: readOptionalText(
      payload.registrationNumber,
    ),
    email: readOptionalText(payload.email),
    phone: readOptionalText(payload.phone),
    website: readOptionalText(payload.website),
    street: readOptionalText(payload.street),
    city: readOptionalText(payload.city),
    postalCode: readOptionalText(payload.postalCode),
    country:
      readOptionalText(payload.country) ||
      DEFAULT_COMPANY_SETTINGS.country,
    status: readCompanyStatus(payload.status),
    notes: readOptionalText(payload.notes),
    createdAt: null,
    updatedAt: null,
  });
}

function normalizeCompanySettings(
  settings: CompanySettings,
): CompanySettings {
  return {
    id: normalizeNullableText(settings.id),
    name: normalizeRequiredText(settings.name, "name"),
    legalName: normalizeText(settings.legalName),
    vatNumber: normalizeText(settings.vatNumber),
    registrationNumber: normalizeText(
      settings.registrationNumber,
    ),
    email: normalizeText(settings.email),
    phone: normalizeText(settings.phone),
    website: normalizeText(settings.website),
    street: normalizeText(settings.street),
    city: normalizeText(settings.city),
    postalCode: normalizeText(settings.postalCode),
    country:
      normalizeText(settings.country).toUpperCase() ||
      DEFAULT_COMPANY_SETTINGS.country,
    status: isCompanyStatus(settings.status)
      ? settings.status
      : DEFAULT_COMPANY_SETTINGS.status,
    notes: normalizeText(settings.notes),
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}

function buildCompanyWriteData(
  settings: CompanySettings,
): CompanySettingsWriteData {
  return {
    name: settings.name,
    legalName: toNullableText(settings.legalName),
    vatNumber: toNullableText(settings.vatNumber),
    registrationNumber: toNullableText(
      settings.registrationNumber,
    ),
    email: toNullableText(settings.email),
    phone: toNullableText(settings.phone),
    website: toNullableText(settings.website),
    street: toNullableText(settings.street),
    city: toNullableText(settings.city),
    postalCode: toNullableText(settings.postalCode),
    country: settings.country,
    status: settings.status,
    notes: toNullableText(settings.notes),
  };
}

function serializeCompany(company: {
  id: string;
  name: string;
  legalName: string | null;
  vatNumber: string | null;
  registrationNumber: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  status: CompanyStatusValue;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CompanySettings {
  return {
    id: company.id,
    name: company.name,
    legalName: company.legalName ?? "",
    vatNumber: company.vatNumber ?? "",
    registrationNumber:
      company.registrationNumber ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    website: company.website ?? "",
    street: company.street ?? "",
    city: company.city ?? "",
    postalCode: company.postalCode ?? "",
    country: company.country,
    status: company.status,
    notes: company.notes ?? "",
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  };
}

function readRequiredText(
  value: unknown,
  fieldName: string,
): string {
  const normalizedValue = normalizeTextValue(value);

  if (normalizedValue === "") {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;
}

function readOptionalText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return normalizeTextValue(value);
}

function readCompanyStatus(
  value: unknown,
): CompanyStatusValue {
  if (value === null || value === undefined || value === "") {
    return DEFAULT_COMPANY_SETTINGS.status;
  }

  if (typeof value !== "string") {
    throw new Error(
      "Company status must be ACTIVE or INACTIVE.",
    );
  }

  const normalizedValue =
    value.trim().toUpperCase();

  if (!isCompanyStatus(normalizedValue)) {
    throw new Error(
      "Company status must be ACTIVE or INACTIVE.",
    );
  }

  return normalizedValue;
}

function normalizeRequiredText(
  value: string,
  fieldName: string,
): string {
  const normalizedValue = normalizeText(value);

  if (normalizedValue === "") {
    throw new Error(`${fieldName} is required.`);
  }

  return normalizedValue;
}

function normalizeTextValue(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error(
      "Company settings text fields must be strings.",
    );
  }

  return normalizeText(value);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeNullableText(
  value: string | null,
): string | null {
  if (value === null) {
    return null;
  }

  const normalizedValue = normalizeText(value);

  return normalizedValue === ""
    ? null
    : normalizedValue;
}

function toNullableText(
  value: string,
): string | null {
  const normalizedValue = normalizeText(value);

  return normalizedValue === ""
    ? null
    : normalizedValue;
}

function isCompanyStatus(
  value: string,
): value is CompanyStatusValue {
  return value === "ACTIVE" || value === "INACTIVE";
}

function isObjectRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}