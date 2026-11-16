/**
 * Task 38.1: Validate a PTV geocoding response before coordinates can be saved.
 * Pure validation: this module never reads or writes the database.
 */

export type AddressForGeocoding = {
  name: string;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
};

export type PtvPosition = {
  latitude: number;
  longitude: number;
};

export type PtvGeocodedLocation = {
  referencePosition?: PtvPosition;
  roadAccessPosition?: PtvPosition;
  formattedAddress?: string;
  address?: {
    countryName?: string;
    postalCode?: string;
    city?: string;
    street?: string;
    houseNumber?: string;
    countryCode?: string;
  };
};

type SelectionResult =
  | {
      kind: "match";
      location: PtvGeocodedLocation;
      position: PtvPosition;
    }
  | {
      kind: "error";
      status: 404 | 409 | 422 | 502;
      message: string;
    };

const COUNTRY_ALIASES: Record<string, string> = {
  nl: "NL", nld: "NL", netherlands: "NL", thenetherlands: "NL",
  nederland: "NL", niederlande: "NL", paysbas: "NL",
  be: "BE", bel: "BE", belgium: "BE", belgie: "BE",
  belgique: "BE", belgien: "BE",
  de: "DE", deu: "DE", germany: "DE", deutschland: "DE",
  allemagne: "DE", duitsland: "DE",
  fr: "FR", fra: "FR", france: "FR", frankrijk: "FR",
  frankreich: "FR",
  lu: "LU", lux: "LU", luxembourg: "LU", luxemburg: "LU",
  pl: "PL", pol: "PL", poland: "PL", polska: "PL",
  at: "AT", aut: "AT", austria: "AT", osterreich: "AT",
  cz: "CZ", cze: "CZ", czechia: "CZ", czechrepublic: "CZ",
  gb: "GB", gbr: "GB", uk: "GB", unitedkingdom: "GB",
};

const CITY_ALIASES: Record<string, string> = {
  denhaag: "den haag",
  sgravenhage: "den haag",
  thehague: "den haag",
  antwerp: "antwerpen",
  antwerpen: "antwerpen",
  liege: "liege",
  luik: "liege",
  aachen: "aachen",
  aixlachapelle: "aachen",
  denbosch: "s hertogenbosch",
  shertogenbosch: "s hertogenbosch",
};

function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeCountry(value: string): string | null {
  const key = normalizeText(value).replace(/\s+/g, "");
  return COUNTRY_ALIASES[key] ?? (key.length === 2 ? key.toUpperCase() : null);
}

function normalizePostalCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeCity(value: string): string {
  const normalized = normalizeText(value);
  return CITY_ALIASES[normalized.replace(/\s+/g, "")] ?? normalized;
}

function citiesMatch(expected: string, actual: string): boolean {
  const left = normalizeCity(expected);
  const right = normalizeCity(actual);
  return left === right || left.endsWith(` ${right}`) || right.endsWith(` ${left}`);
}

function separateHouseNumber(input: string): { street: string; houseNumber: string | null } {
  const trimmed = input.trim();
  const trailing = trimmed.match(/^(.*?)\s+(\d+\s*[A-Za-z]?(?:\s*[-/]\s*\d+\s*[A-Za-z]?)?)$/);
  if (trailing && trailing[1].trim()) {
    return { street: trailing[1].trim(), houseNumber: trailing[2] };
  }
  const leading = trimmed.match(/^(\d+\s*[A-Za-z]?)\s+(.+)$/);
  if (leading) {
    return { street: leading[2].trim(), houseNumber: leading[1] };
  }
  return { street: trimmed, houseNumber: null };
}

function normalizeHouseNumber(value: string): string {
  return value.toUpperCase().replace(/\s+/g, "");
}

/** Returns blocking mismatches; an absent PTV field never counts as a match. */
export function comparePtvAddress(
  saved: AddressForGeocoding,
  result: PtvGeocodedLocation["address"],
): string[] {
  const issues: string[] = [];

  // A country alone, or a city without street/postcode, is not an address fix.
  if (!saved.postalCode?.trim() && !(saved.city?.trim() && saved.street?.trim())) {
    issues.push("Not enough stored details (provide postal code or street and city)");
  }

  if (!result) {
    issues.push("PTV did not return structured address fields");
    return issues;
  }

  const savedCountry = normalizeCountry(saved.country);
  const ptvCountry = normalizeCountry(result.countryCode || result.countryName || "");
  if (!savedCountry || !ptvCountry || savedCountry !== ptvCountry) {
    issues.push(`Country mismatch (${saved.country} vs ${result.countryCode || result.countryName || "missing"})`);
  }

  if (saved.postalCode?.trim()) {
    if (!result.postalCode || normalizePostalCode(saved.postalCode) !== normalizePostalCode(result.postalCode)) {
      issues.push(`Postal code mismatch (${saved.postalCode} vs ${result.postalCode || "missing"})`);
    }
  }

  if (saved.city?.trim()) {
    if (!result.city || !citiesMatch(saved.city, result.city)) {
      issues.push(`City mismatch (${saved.city} vs ${result.city || "missing"})`);
    }
  }

  if (saved.street?.trim()) {
    const expected = separateHouseNumber(saved.street);
    if (!result.street || normalizeText(expected.street) !== normalizeText(result.street)) {
      issues.push(`Street mismatch (${expected.street} vs ${result.street || "missing"})`);
    }
    if (expected.houseNumber && (!result.houseNumber ||
      normalizeHouseNumber(expected.houseNumber) !== normalizeHouseNumber(result.houseNumber))) {
      issues.push(`House number mismatch (${expected.houseNumber} vs ${result.houseNumber || "missing"})`);
    }
  }

  return issues;
}

function validPosition(position: PtvPosition | undefined): position is PtvPosition {
  return !!position &&
    Number.isFinite(position.latitude) && position.latitude >= -90 && position.latitude <= 90 &&
    Number.isFinite(position.longitude) && position.longitude >= -180 && position.longitude <= 180;
}

function displayPtvAddress(location: PtvGeocodedLocation): string {
  if (location.formattedAddress) return location.formattedAddress;
  const address = location.address;
  if (!address) return "(not provided)";
  return [
    [address.street, address.houseNumber].filter(Boolean).join(" "),
    [address.postalCode, address.city].filter(Boolean).join(" "),
    address.countryCode || address.countryName,
  ].filter(Boolean).join(", ") || "(not provided)";
}

/** Select any verified PTV result, rather than blindly using the first one. */
export function selectPtvGeocodingLocation(
  saved: AddressForGeocoding,
  locations: readonly PtvGeocodedLocation[],
): SelectionResult {
  if (!locations.length) {
    return { kind: "error", status: 404, message: "PTV returned no geocoding results. No coordinates were saved." };
  }

  if (!saved.postalCode?.trim() && !(saved.city?.trim() && saved.street?.trim())) {
    return {
      kind: "error", status: 422,
      message: "Address needs a postal code or both street and city before PTV coordinates can be verified. No coordinates were saved.",
    };
  }

  const candidates = locations.map((location) => ({
    location,
    issues: comparePtvAddress(saved, location.address),
    position: location.roadAccessPosition ?? location.referencePosition,
  }));

  const verified = candidates.find((candidate) =>
    candidate.issues.length === 0 && validPosition(candidate.position),
  );
  if (verified && verified.position) {
    return { kind: "match", location: verified.location, position: verified.position };
  }

  if (candidates.some((candidate) => candidate.issues.length === 0)) {
    return { kind: "error", status: 502, message: "PTV matched the address, but returned invalid coordinates. No coordinates were saved." };
  }

  const bestCandidate = [...candidates].sort((a, b) => a.issues.length - b.issues.length)[0];
  const stored = [
    saved.name, saved.street,
    [saved.postalCode, saved.city].filter(Boolean).join(" "),
    saved.country,
  ].filter(Boolean).join(", ");
  return {
    kind: "error", status: 409,
    message: `PTV address mismatch. No coordinates were saved. ${bestCandidate.issues.join("; ")}. Stored: ${stored}. PTV: ${displayPtvAddress(bestCandidate.location)}.`,
  };
}
