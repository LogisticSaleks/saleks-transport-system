/**
 * Task 38.2 — Pure helpers for NEW addresses only.
 * Never changes or merges an existing address.
 */
export type AddressIdentity = {
  name: string;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
};

export type ExistingAddress = AddressIdentity & { id: string };

export type AddressDuplicate = {
  address: ExistingAddress;
  kind: "exact" | "possible";
};

export class AutoAddressParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AutoAddressParsingError";
  }
}

const POSTAL_REGEX = /\b(?:\d{4}\s?[A-Z]{2}|\d{2}-\d{3}|\d{5}|\d{4})\b/i;
const HOUSE_NUMBER_REGEX = /(?:^|\s)\d{1,4}[A-Z]?(?:\s?[-/]\s?\d{1,4}[A-Z]?)?\b/i;
const COUNTRY_SUFFIX = /(?:,\s*|\s+)(NL|BE|DE|FR|BG|PL)\s*$/i;
// Known historical wrong-NL cities: require explicit country, never infer silently.
const REQUIRE_COUNTRY_FOR_CITY = new Set([
  "duisburg", "mainz", "raunheim", "antwerpen", "antwerp",
]);

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ").replace(/\s+,/g, ",").replace(/,\s+/g, ", ");
}

function normalized(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\s,.;#]+/g, "")
    .trim();
}

function normalizedPostal(value: string | null | undefined): string {
  return normalized(value).replace(/-/g, "");
}

/**
 * Parses common comma-separated freight addresses without guessing a foreign
 * country from a city name or an ambiguous 4/5-digit postal code.
 * The existing NL fallback is retained for compatibility with local shorthand.
 */
export function parseAutoCreatedAddressText(input: string): AddressIdentity {
  const source = clean(input);
  if (!source) {
    throw new AutoAddressParsingError("Въведи адрес за спирката.");
  }

  const namedSeparator = source.match(/\s+[—–-]\s+/);
  const explicitName = namedSeparator?.index === undefined
    ? null
    : source.slice(0, namedSeparator.index).trim();
  const details = namedSeparator?.index === undefined
    ? source
    : source.slice(namedSeparator.index + namedSeparator[0].length).trim();

  const countrySuffix = details.match(COUNTRY_SUFFIX);
  const explicitCountry = countrySuffix?.[1]?.toUpperCase() ?? null;
  const withoutCountry = countrySuffix
    ? details.slice(0, countrySuffix.index).replace(/[,;\s]+$/, "")
    : details;

  const parts = withoutCountry.split(",").map(clean).filter(Boolean);
  let name = explicitName;
  let streetIndex = parts.findIndex((part) => {
    const noPostal = part.replace(POSTAL_REGEX, "");
    return HOUSE_NUMBER_REGEX.test(noPostal);
  });

  // A named depot followed by a numbered street, e.g. "A15 Depot, Columbusstraat 17, ...".
  if (!name && streetIndex === 1 && parts.length >= 3) {
    name = parts[0];
  }

  let street: string | null = streetIndex >= 0 ? parts[streetIndex] : null;
  let postalCode: string | null = null;
  let city: string | null = null;
  let postalIndex = -1;

  for (let index = 0; index < parts.length; index++) {
    const match = parts[index].match(POSTAL_REGEX);
    if (!match) continue;
    postalIndex = index;
    postalCode = match[0].toUpperCase().replace(/\s+/g, "");
    const dutch = postalCode.match(/^(\d{4})([A-Z]{2})$/);
    if (dutch) postalCode = `${dutch[1]} ${dutch[2]}`;

    const before = clean(parts[index].slice(0, match.index).replace(/[,;]+$/, ""));
    const after = clean(parts[index].slice((match.index ?? 0) + match[0].length));
    if (index === streetIndex) {
      if (before) street = before;
      if (after) city = after;
    } else {
      city = clean([before, after].filter(Boolean).join(" ")) || null;
    }
    break;
  }

  if (!city) {
    city = parts.find((part, index) =>
      index !== streetIndex && index !== postalIndex &&
      !(name && index === 0 && streetIndex === 1),
    ) ?? null;
  }
  if (streetIndex < 0 && !city && parts.length === 1 && postalIndex < 0) {
    city = parts[0];
  }

  const unambiguousCountry = postalCode && /^\d{4} [A-Z]{2}$/.test(postalCode)
    ? "NL"
    : postalCode && /^\d{2}-\d{3}$/.test(postalCode)
      ? "PL" : null;
  if (explicitCountry && unambiguousCountry && explicitCountry !== unambiguousCountry) {
    throw new AutoAddressParsingError(
      `Пощенският код ${postalCode} не съответства на държава ${explicitCountry}.`,
    );
  }
  if (!explicitCountry && postalCode && /^\d{5}$/.test(postalCode)) {
    throw new AutoAddressParsingError(
      `Уточни държавата след адреса (например ", DE" или ", FR") за пощенски код ${postalCode}.`,
    );
  }
  if (!explicitCountry && !unambiguousCountry && city &&
      REQUIRE_COUNTRY_FOR_CITY.has(city.toLocaleLowerCase("en-US"))) {
    throw new AutoAddressParsingError(
      `Уточни държавата на ${city} в края на адреса (например ", DE" или ", BE").`,
    );
  }

  const country = explicitCountry ?? unambiguousCountry ?? "NL";
  return {
    name: name || (city && postalCode ? `${city} ${postalCode}` : street || city || source),
    street,
    city,
    postalCode,
    country,
  };
}

/**
 * "exact": all persisted address fields match (safe to reuse one ID).
 * "possible": same physical street + postal code, but a different name/city;
 *             never auto-link these, as separate customers can share a site.
 */
export function findAddressDuplicates(
  incoming: AddressIdentity,
  addresses: readonly ExistingAddress[],
): AddressDuplicate[] {
  return addresses.flatMap<AddressDuplicate>((address) => {
    if (normalized(incoming.country) !== normalized(address.country)) return [];

    const allEqual = normalized(incoming.name) === normalized(address.name) &&
      normalized(incoming.street) === normalized(address.street) &&
      normalized(incoming.city) === normalized(address.city) &&
      normalizedPostal(incoming.postalCode) === normalizedPostal(address.postalCode);
    if (allEqual) return [{ address, kind: "exact" as const }];

    const sameLocation = Boolean(
      incoming.street && address.street && incoming.postalCode && address.postalCode &&
      normalized(incoming.street) === normalized(address.street) &&
      normalizedPostal(incoming.postalCode) === normalizedPostal(address.postalCode),
    );
    if (sameLocation) return [{ address, kind: "possible" as const }];

    // Legacy auto-created addresses often have only a name, or stored their
    // entire input in "street". Warn instead of generating a second weak entry.
    const sameName = normalized(incoming.name) === normalized(address.name);
    const compatiblePostal = !incoming.postalCode || !address.postalCode ||
      normalizedPostal(incoming.postalCode) === normalizedPostal(address.postalCode);
    const compatibleStreet = !incoming.street || !address.street ||
      normalized(incoming.street) === normalized(address.street);
    const compatibleCity = !incoming.city || !address.city ||
      normalized(incoming.city) === normalized(address.city);
    if (sameName && compatiblePostal && compatibleStreet && compatibleCity) {
      return [{ address, kind: "possible" as const }];
    }
    return [];
  });
}
