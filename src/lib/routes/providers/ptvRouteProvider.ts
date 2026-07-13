import "server-only";

import type {
  RouteCoordinate,
  RouteCountryBreakdown,
  RouteProvider,
  RouteProviderResult,
  RouteRequest,
  RouteStop,
  RouteVehicleProfile,
} from "../routeService";

const DEFAULT_GEOCODING_ENDPOINT =
  "https://api.myptv.com/geocoding/v1/locations/by-text";

const DEFAULT_ROUTING_ENDPOINT =
  "https://api.myptv.com/routing/v1/routes";

const DEFAULT_PROFILE =
  "EUR_TRAILER_TRUCK";

type PtvRouteProviderOptions = {
  apiKey: string;
  geocodingEndpoint?: string;
  routingEndpoint?: string;
  profile?: string;
};

type PtvPosition = {
  latitude: number;
  longitude: number;
};

type PtvGeocodedLocation = {
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

type PtvGeocodingResponse = {
  locations?: PtvGeocodedLocation[];
  warnings?: PtvApiWarning[];
};

type PtvTollPrice = {
  price?: number;
  currency?: string;
};

type PtvTollCountry = {
  countryCode?: string;
  price?: PtvTollPrice;
  convertedPrice?: PtvTollPrice;
};

type PtvRoutingResponse = {
  distance?: number;
  travelTime?: number;
  violated?: boolean;

  toll?: {
    costs?: {
      prices?: PtvTollPrice[];
      convertedPrice?: PtvTollPrice;
      countries?: PtvTollCountry[];
      containsApproximatedSections?: boolean;
    };
  };

  warnings?: PtvApiWarning[];
};

type PtvApiWarning = {
  warningCode?: string;
  description?: string;
};

type PtvErrorResponse = {
  description?: string;
  errorCode?: string;
  traceId?: string;
  causes?: Array<{
    description?: string;
    errorCode?: string;
    parameter?: string;
  }>;
};

type ResolvedPtvStop = {
  stop: RouteStop;
  referencePosition: PtvPosition;
  roadAccessPosition: PtvPosition | null;
  formattedAddress: string | null;
  wasGeocoded: boolean;
};

export class PtvRouteProvider
  implements RouteProvider
{
  readonly id = "ptv";
  readonly name =
    "PTV / myPTV Route Provider";

  private readonly apiKey: string;
  private readonly geocodingEndpoint: string;
  private readonly routingEndpoint: string;
  private readonly profile: string;

  constructor({
    apiKey,
    geocodingEndpoint =
      DEFAULT_GEOCODING_ENDPOINT,
    routingEndpoint =
      DEFAULT_ROUTING_ENDPOINT,
    profile = DEFAULT_PROFILE,
  }: PtvRouteProviderOptions) {
    this.apiKey = apiKey.trim();
    this.geocodingEndpoint =
      geocodingEndpoint;
    this.routingEndpoint =
      routingEndpoint;
    this.profile = profile;
  }

  async calculateRoute(
    request: RouteRequest,
  ): Promise<RouteProviderResult> {
    this.validateConfiguration();
    validateRequest(request);

    const resolvedStops:
      ResolvedPtvStop[] = [];

    /*
     * Sequential geocoding keeps the request rate
     * predictable for development subscriptions.
     */
    for (const stop of request.stops) {
      resolvedStops.push(
        await this.resolveStop(stop),
      );
    }

    const routeResponse =
      await this.requestRoute(
        request,
        resolvedStops,
      );

    const warnings =
      formatWarnings(
        routeResponse.warnings,
      );

    if (routeResponse.violated) {
      warnings.push(
        "PTV върна нарушен маршрут: използван е път, който е ограничен за подадения truck profile.",
      );
    }

    if (
      routeResponse.toll?.costs
        ?.containsApproximatedSections
    ) {
      warnings.push(
        "Част от PTV toll резултата е приблизителна, защото waypoint попада в toll section.",
      );
    }

    if (
      request.vehicle?.isAdr === true
    ) {
      warnings.push(
        "ADR сертификатът не е изпратен като hazardous cargo, защото сертификацията не означава, че в курса се превозват опасни товари.",
      );
    }

    const currency =
      request.currency ?? "EUR";

    const tollCost =
      readTollCost(
        routeResponse,
        currency,
      );

    const countryBreakdown =
      buildCountryBreakdown(
        routeResponse,
        currency,
      );

    if (
      request.includeCountryBreakdown &&
      countryBreakdown.length > 0
    ) {
      warnings.push(
        "PTV TOLL_COSTS връща toll по държави, но не и пълното route distance по държави; distanceKm в тази разбивка е 0.",
      );
    }

    const geocodedCount =
      resolvedStops.filter(
        (resolvedStop) =>
          resolvedStop.wasGeocoded,
      ).length;

    return {
      providerId: this.id,

      distanceKm:
        roundRouteValue(
          requireNonNegativeNumber(
            routeResponse.distance,
            "PTV route distance",
          ) / 1000,
        ),

      durationMinutes:
        roundRouteValue(
          requireNonNegativeNumber(
            routeResponse.travelTime,
            "PTV route travelTime",
          ) / 60,
        ),

      tollCost:
        roundMoney(tollCost),

      currency,
      countryBreakdown,

      calculatedAt:
        new Date().toISOString(),

      warnings,

      notes:
        `PTV profile: ${this.profile}. ` +
        `Geocoded stops: ${geocodedCount}/${resolvedStops.length}.`,
    };
  }

  private validateConfiguration(): void {
    if (this.apiKey === "") {
      throw new PtvRouteProviderError(
        "MYPTV_API_KEY липсва или е празен.",
      );
    }
  }

  private async resolveStop(
    stop: RouteStop,
  ): Promise<ResolvedPtvStop> {
    if (stop.coordinate) {
      validateCoordinate(
        stop.coordinate,
        stop.label,
      );

      return {
        stop,
        referencePosition:
          stop.coordinate,
        roadAccessPosition: null,
        formattedAddress:
          stop.label.trim(),
        wasGeocoded: false,
      };
    }

    return this.geocodeStop(stop);
  }

  private async geocodeStop(
    stop: RouteStop,
  ): Promise<ResolvedPtvStop> {
    const url = new URL(
      this.geocodingEndpoint,
    );

    url.searchParams.set(
      "searchText",
      stop.label.trim(),
    );

    const response =
      await this.fetchJson<PtvGeocodingResponse>(
        url,
        "PTV geocoding",
      );

    const location =
      response.locations?.[0];

    if (!location?.referencePosition) {
      throw new PtvRouteProviderError(
        `PTV не намери координати за адрес: ${stop.label}`,
      );
    }

    validateCoordinate(
      location.referencePosition,
      stop.label,
    );

    if (location.roadAccessPosition) {
      validateCoordinate(
        location.roadAccessPosition,
        `${stop.label} road access`,
      );
    }

    return {
      stop,
      referencePosition:
        location.referencePosition,
      roadAccessPosition:
        location.roadAccessPosition ??
        null,
      formattedAddress:
        location.formattedAddress ??
        formatGeocodedAddress(
          location,
        ),
      wasGeocoded: true,
    };
  }

  private async requestRoute(
    request: RouteRequest,
    resolvedStops:
      readonly ResolvedPtvStop[],
  ): Promise<PtvRoutingResponse> {
    const url = new URL(
      this.routingEndpoint,
    );

    for (
      let index = 0;
      index < resolvedStops.length;
      index += 1
    ) {
      const resolvedStop =
        resolvedStops[index];

      if (!resolvedStop) {
        throw new PtvRouteProviderError(
          `Липсва PTV waypoint на позиция ${index}.`,
        );
      }

      url.searchParams.append(
        "waypoints",
        buildWaypoint(
          resolvedStop,
          index,
        ),
      );
    }

    url.searchParams.set(
      "profile",
      this.profile,
    );

    url.searchParams.set(
      "results",
      "TOLL_COSTS",
    );

    url.searchParams.set(
      "options[currency]",
      request.currency ?? "EUR",
    );

    url.searchParams.set(
      "options[trafficMode]",
      request.departureTime
        ? "REALISTIC"
        : "AVERAGE",
    );

    if (request.departureTime) {
      const departureDate =
        new Date(
          request.departureTime,
        );

      if (
        Number.isNaN(
          departureDate.getTime(),
        )
      ) {
        throw new PtvRouteProviderError(
          "departureTime трябва да бъде валидна ISO дата.",
        );
      }

      url.searchParams.set(
        "options[startTime]",
        departureDate.toISOString(),
      );
    }

    addVehicleParameters(
      url,
      request.vehicle,
    );

    return this.fetchJson<PtvRoutingResponse>(
      url,
      "PTV routing",
    );
  }

  private async fetchJson<T>(
    url: URL,
    operationName: string,
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(url, {
        method: "GET",
        headers: {
          ApiKey: this.apiKey,
          Accept: "application/json",
        },
        cache: "no-store",
      });
    } catch {
      throw new PtvRouteProviderError(
        `${operationName} request не можа да бъде изпратен.`,
      );
    }

    const responseText =
      await response.text();

    const responseData =
      parseJsonSafely(responseText);

    if (!response.ok) {
      throw new PtvRouteProviderError(
        buildPtvErrorMessage(
          operationName,
          response.status,
          responseData,
        ),
      );
    }

    if (
      typeof responseData !==
        "object" ||
      responseData === null
    ) {
      throw new PtvRouteProviderError(
        `${operationName} върна невалиден JSON резултат.`,
      );
    }

    return responseData as T;
  }
}

export class PtvRouteProviderError
  extends Error
{
  constructor(message: string) {
    super(message);
    this.name =
      "PtvRouteProviderError";
  }
}

function validateRequest(
  request: RouteRequest,
): void {
  if (request.stops.length < 2) {
    throw new PtvRouteProviderError(
      "PTV route request изисква поне from и to адрес.",
    );
  }

  for (
    let index = 0;
    index < request.stops.length;
    index += 1
  ) {
    const stop = request.stops[index];

    if (!stop) {
      throw new PtvRouteProviderError(
        `Липсва stop на позиция ${index}.`,
      );
    }

    if (stop.label.trim() === "") {
      throw new PtvRouteProviderError(
        `Stop ${index + 1} няма адрес или label.`,
      );
    }
  }

  validateVehicleProfile(
    request.vehicle,
  );
}

function validateVehicleProfile(
  vehicle:
    | RouteVehicleProfile
    | null
    | undefined,
): void {
  if (!vehicle) {
    return;
  }

  validateOptionalPositiveNumber(
    vehicle.grossWeightKg,
    "vehicle.grossWeightKg",
  );

  validateOptionalPositiveNumber(
    vehicle.totalTechnicallyPermittedWeightKg,
    "vehicle.totalTechnicallyPermittedWeightKg",
  );

  validateOptionalPositiveNumber(
    vehicle.axleWeightKg,
    "vehicle.axleWeightKg",
  );

  validateOptionalPositiveNumber(
    vehicle.heightMeters,
    "vehicle.heightMeters",
  );

  validateOptionalPositiveNumber(
    vehicle.widthMeters,
    "vehicle.widthMeters",
  );

  validateOptionalPositiveNumber(
    vehicle.lengthMeters,
    "vehicle.lengthMeters",
  );

  validateOptionalPositiveNumber(
    vehicle.axleCount,
    "vehicle.axleCount",
  );

  if (
    vehicle.co2EmissionClass !==
      null &&
    vehicle.co2EmissionClass !==
      undefined &&
    (
      !Number.isInteger(
        vehicle.co2EmissionClass,
      ) ||
      vehicle.co2EmissionClass < 1 ||
      vehicle.co2EmissionClass > 5
    )
  ) {
    throw new PtvRouteProviderError(
      "vehicle.co2EmissionClass трябва да бъде цяло число между 1 и 5.",
    );
  }
}

function addVehicleParameters(
  url: URL,
  vehicle:
    | RouteVehicleProfile
    | null
    | undefined,
): void {
  if (!vehicle) {
    return;
  }

  setIntegerParameter(
    url,
    "vehicle[totalPermittedWeight]",
    vehicle.grossWeightKg,
  );

  setIntegerParameter(
    url,
    "vehicle[totalTechnicallyPermittedWeight]",
    vehicle.totalTechnicallyPermittedWeightKg ??
      vehicle.grossWeightKg,
  );

  setIntegerParameter(
    url,
    "vehicle[axleWeight]",
    vehicle.axleWeightKg,
  );

  setIntegerParameter(
    url,
    "vehicle[numberOfAxles]",
    vehicle.axleCount,
  );

  setIntegerParameter(
    url,
    "vehicle[height]",
    metersToCentimeters(
      vehicle.heightMeters,
    ),
  );

  setIntegerParameter(
    url,
    "vehicle[width]",
    metersToCentimeters(
      vehicle.widthMeters,
    ),
  );

  setIntegerParameter(
    url,
    "vehicle[length]",
    metersToCentimeters(
      vehicle.lengthMeters,
    ),
  );

  const emissionStandard =
    normalizeEmissionStandard(
      vehicle.euroClass,
    );

  if (emissionStandard) {
    url.searchParams.set(
      "vehicle[emissionStandard]",
      emissionStandard,
    );
  }

  setIntegerParameter(
    url,
    "vehicle[co2EmissionClass]",
    vehicle.co2EmissionClass,
  );
}

function buildWaypoint(
  resolvedStop: ResolvedPtvStop,
  index: number,
): string {
  const reference =
    resolvedStop.referencePosition;

  const parts = [
    `${formatCoordinate(reference.latitude)},${formatCoordinate(reference.longitude)}`,
  ];

  if (
    resolvedStop.roadAccessPosition
  ) {
    const roadAccess =
      resolvedStop.roadAccessPosition;

    parts.push(
      `roadAccess=${formatCoordinate(roadAccess.latitude)},${formatCoordinate(roadAccess.longitude)}`,
    );
  } else if (
    resolvedStop.wasGeocoded
  ) {
    parts.push(
      "includeLastMeters",
    );
  }

  parts.push(
    `name=stop-${index + 1}`,
  );

  return parts.join(";");
}

function readTollCost(
  response: PtvRoutingResponse,
  currency: string,
): number {
  const normalizedCurrency =
    currency.trim().toUpperCase();

  const costs =
    response.toll?.costs;

  if (!costs) {
    return 0;
  }

  if (
    costs.convertedPrice &&
    normalizeCurrency(
      costs.convertedPrice.currency,
    ) === normalizedCurrency
  ) {
    return readOptionalPrice(
      costs.convertedPrice,
    );
  }

  const matchingPrice =
    costs.prices?.find(
      (price) =>
        normalizeCurrency(
          price.currency,
        ) === normalizedCurrency,
    );

  if (matchingPrice) {
    return readOptionalPrice(
      matchingPrice,
    );
  }

  return (
    costs.prices?.reduce(
      (sum, price) =>
        sum +
        readOptionalPrice(price),
      0,
    ) ?? 0
  );
}

function buildCountryBreakdown(
  response: PtvRoutingResponse,
  currency: string,
): RouteCountryBreakdown[] {
  const normalizedCurrency =
    currency.trim().toUpperCase();

  const countries =
    response.toll?.costs?.countries;

  if (!countries) {
    return [];
  }

  return countries
    .map((country) => {
      const countryCode =
        country.countryCode
          ?.trim()
          .toUpperCase();

      if (!countryCode) {
        return null;
      }

      const preferredPrice =
        country.convertedPrice &&
        normalizeCurrency(
          country.convertedPrice
            .currency,
        ) === normalizedCurrency
          ? country.convertedPrice
          : country.price;

      return {
        countryCode,
        distanceKm: 0,
        tollCost: roundMoney(
          readOptionalPrice(
            preferredPrice,
          ),
        ),
      };
    })
    .filter(
      (
        country,
      ): country is RouteCountryBreakdown =>
        country !== null,
    );
}

function readOptionalPrice(
  price:
    | PtvTollPrice
    | null
    | undefined,
): number {
  if (
    !price ||
    typeof price.price !== "number" ||
    !Number.isFinite(price.price) ||
    price.price < 0
  ) {
    return 0;
  }

  return price.price;
}

function normalizeCurrency(
  value:
    | string
    | null
    | undefined,
): string {
  return (
    value?.trim().toUpperCase() ??
    ""
  );
}

function normalizeEmissionStandard(
  value:
    | string
    | null
    | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const normalized =
    value
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

  const match =
    normalized.match(
      /^EURO_?([0-6])$/,
    );

  if (!match?.[1]) {
    throw new PtvRouteProviderError(
      `Неподдържан euroClass за PTV: ${value}.`,
    );
  }

  return `EURO_${match[1]}`;
}

function metersToCentimeters(
  value:
    | number
    | null
    | undefined,
): number | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return Math.round(value * 100);
}

function setIntegerParameter(
  url: URL,
  parameterName: string,
  value:
    | number
    | null
    | undefined,
): void {
  if (
    value === null ||
    value === undefined
  ) {
    return;
  }

  url.searchParams.set(
    parameterName,
    String(Math.round(value)),
  );
}

function validateOptionalPositiveNumber(
  value:
    | number
    | null
    | undefined,
  fieldName: string,
): void {
  if (
    value === null ||
    value === undefined
  ) {
    return;
  }

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new PtvRouteProviderError(
      `${fieldName} трябва да бъде положително число.`,
    );
  }
}

function validateCoordinate(
  coordinate: RouteCoordinate,
  label: string,
): void {
  if (
    !Number.isFinite(
      coordinate.latitude,
    ) ||
    coordinate.latitude < -90 ||
    coordinate.latitude > 90
  ) {
    throw new PtvRouteProviderError(
      `Невалидна latitude за ${label}.`,
    );
  }

  if (
    !Number.isFinite(
      coordinate.longitude,
    ) ||
    coordinate.longitude < -180 ||
    coordinate.longitude > 180
  ) {
    throw new PtvRouteProviderError(
      `Невалидна longitude за ${label}.`,
    );
  }
}

function requireNonNegativeNumber(
  value: unknown,
  fieldName: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new PtvRouteProviderError(
      `${fieldName} липсва или е невалидно.`,
    );
  }

  return value;
}

function formatWarnings(
  warnings:
    | readonly PtvApiWarning[]
    | null
    | undefined,
): string[] {
  if (!warnings) {
    return [];
  }

  return warnings.map((warning) => {
    const code =
      warning.warningCode?.trim();

    const description =
      warning.description?.trim();

    if (code && description) {
      return `${code}: ${description}`;
    }

    return (
      description ??
      code ??
      "PTV върна предупреждение без описание."
    );
  });
}

function formatGeocodedAddress(
  location: PtvGeocodedLocation,
): string | null {
  const address =
    location.address;

  if (!address) {
    return null;
  }

  const streetLine = [
    address.street,
    address.houseNumber,
  ]
    .filter(Boolean)
    .join(" ");

  const cityLine = [
    address.postalCode,
    address.city,
  ]
    .filter(Boolean)
    .join(" ");

  const formatted = [
    streetLine,
    cityLine,
    address.countryName ??
      address.countryCode,
  ]
    .filter(Boolean)
    .join(", ");

  return formatted || null;
}

function buildPtvErrorMessage(
  operationName: string,
  status: number,
  responseData: unknown,
): string {
  const errorData =
    isPtvErrorResponse(
      responseData,
    )
      ? responseData
      : null;

  const causes =
    errorData?.causes
      ?.map((cause) =>
        [
          cause.parameter,
          cause.description ??
            cause.errorCode,
        ]
          .filter(Boolean)
          .join(": "),
      )
      .filter(Boolean)
      .join("; ");

  const details = [
    errorData?.errorCode,
    errorData?.description,
    causes,
  ]
    .filter(Boolean)
    .join(" — ");

  return details
    ? `${operationName} върна HTTP ${status}: ${details}`
    : `${operationName} върна HTTP ${status}.`;
}

function isPtvErrorResponse(
  value: unknown,
): value is PtvErrorResponse {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function parseJsonSafely(
  value: string,
): unknown {
  if (value.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function formatCoordinate(
  value: number,
): string {
  return value.toFixed(7);
}

function roundRouteValue(
  value: number,
): number {
  return Math.round(value * 100) / 100;
}

function roundMoney(
  value: number,
): number {
  return Math.round(value * 100) / 100;
}