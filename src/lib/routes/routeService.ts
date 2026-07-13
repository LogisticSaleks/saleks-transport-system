export type RouteProviderId =
  | "manual"
  | "ptv"
  | (string & {});

export type RouteCurrency = "EUR";

export type RouteStopType =
  | "ORIGIN"
  | "VIA"
  | "DESTINATION";

export type RouteCoordinate = {
  latitude: number;
  longitude: number;
};

export type RouteStop = {
  type: RouteStopType;
  addressId?: string | null;
  label: string;
  coordinate?: RouteCoordinate | null;
};

export type RouteVehicleProfile = {
  grossWeightKg?: number | null;
  heightMeters?: number | null;
  widthMeters?: number | null;
  lengthMeters?: number | null;
  axleCount?: number | null;
  euroClass?: string | null;
  isAdr?: boolean;
};

export type RouteCountryBreakdown = {
  countryCode: string;
  distanceKm: number;
  tollCost: number;
};

export type ManualRouteValues = {
  distanceKm: number;
  durationMinutes?: number | null;
  tollCost?: number | null;
  countryBreakdown?:
    | readonly RouteCountryBreakdown[]
    | null;
  notes?: string | null;
};

export type RouteRequest = {
  stops: readonly RouteStop[];
  vehicle?: RouteVehicleProfile | null;
  departureTime?: string | null;
  currency?: RouteCurrency;
  includeCountryBreakdown?: boolean;

  /*
   * Използва се само от ManualRouteProvider.
   * Бъдещият PTV provider ще изчислява тези стойности.
   */
  manual?: ManualRouteValues | null;
};

export type RouteResult = {
  providerId: string;
  distanceKm: number;
  durationMinutes: number | null;
  tollCost: number;
  currency: RouteCurrency;
  countryBreakdown: RouteCountryBreakdown[];
  calculatedAt: string;
  warnings: string[];
  notes: string | null;
};

export interface RouteProvider {
  readonly id: RouteProviderId;
  readonly name: string;

  calculateRoute(
    request: RouteRequest,
  ): Promise<RouteResult>;
}

export class RouteServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RouteServiceError";
  }
}

export class ManualRouteProvider
  implements RouteProvider
{
  readonly id = "manual";
  readonly name = "Manual Route Provider";

  async calculateRoute(
    request: RouteRequest,
  ): Promise<RouteResult> {
    validateRouteStops(request.stops);

    const manualValues = request.manual;

    if (!manualValues) {
      throw new RouteServiceError(
        "Manual route provider изисква request.manual.",
      );
    }

    validateNonNegativeNumber(
      manualValues.distanceKm,
      "manual.distanceKm",
    );

    validateOptionalNonNegativeNumber(
      manualValues.durationMinutes,
      "manual.durationMinutes",
    );

    validateOptionalNonNegativeNumber(
      manualValues.tollCost,
      "manual.tollCost",
    );

    const countryBreakdown =
      normalizeCountryBreakdown(
        manualValues.countryBreakdown,
      );

    const warnings: string[] = [];

    if (
      manualValues.durationMinutes === null ||
      manualValues.durationMinutes ===
        undefined
    ) {
      warnings.push(
        "Продължителността не е въведена ръчно.",
      );
    }

    if (
      request.includeCountryBreakdown &&
      countryBreakdown.length === 0
    ) {
      warnings.push(
        "Липсва разбивка по държави.",
      );
    }

    return {
      providerId: this.id,
      distanceKm: roundRouteValue(
        manualValues.distanceKm,
      ),
      durationMinutes:
        manualValues.durationMinutes ===
          null ||
        manualValues.durationMinutes ===
          undefined
          ? null
          : roundRouteValue(
              manualValues.durationMinutes,
            ),
      tollCost: roundMoney(
        manualValues.tollCost ?? 0,
      ),
      currency:
        request.currency ?? "EUR",
      countryBreakdown,
      calculatedAt:
        new Date().toISOString(),
      warnings,
      notes:
        normalizeOptionalText(
          manualValues.notes,
        ),
    };
  }
}

type RouteServiceOptions = {
  providers?: readonly RouteProvider[];
  defaultProviderId?: RouteProviderId;
};

export class RouteService {
  private readonly providers =
    new Map<string, RouteProvider>();

  private defaultProviderId: string;

  constructor({
    providers = [
      new ManualRouteProvider(),
    ],
    defaultProviderId = "manual",
  }: RouteServiceOptions = {}) {
    for (const provider of providers) {
      this.registerProvider(provider);
    }

    this.defaultProviderId =
      defaultProviderId;

    if (
      !this.providers.has(
        this.defaultProviderId,
      )
    ) {
      throw new RouteServiceError(
        `Default route provider "${this.defaultProviderId}" не е регистриран.`,
      );
    }
  }

  registerProvider(
    provider: RouteProvider,
  ): void {
    const providerId =
      provider.id.trim();

    if (providerId === "") {
      throw new RouteServiceError(
        "Route provider id не може да бъде празно.",
      );
    }

    this.providers.set(
      providerId,
      provider,
    );
  }

  hasProvider(
    providerId: RouteProviderId,
  ): boolean {
    return this.providers.has(
      providerId,
    );
  }

  getProviderIds(): string[] {
    return Array.from(
      this.providers.keys(),
    );
  }

  setDefaultProvider(
    providerId: RouteProviderId,
  ): void {
    if (
      !this.providers.has(providerId)
    ) {
      throw new RouteServiceError(
        `Route provider "${providerId}" не е регистриран.`,
      );
    }

    this.defaultProviderId =
      providerId;
  }

  async calculateRoute(
    request: RouteRequest,
    providerId: RouteProviderId =
      this.defaultProviderId,
  ): Promise<RouteResult> {
    const provider =
      this.providers.get(providerId);

    if (!provider) {
      throw new RouteServiceError(
        `Route provider "${providerId}" не е регистриран.`,
      );
    }

    return provider.calculateRoute(
      request,
    );
  }
}

export const manualRouteProvider =
  new ManualRouteProvider();

export const routeService =
  new RouteService({
    providers: [
      manualRouteProvider,
    ],
    defaultProviderId: "manual",
  });

function validateRouteStops(
  stops: readonly RouteStop[],
): void {
  if (stops.length < 2) {
    throw new RouteServiceError(
      "Route request трябва да съдържа поне начална и крайна спирка.",
    );
  }

  for (
    let index = 0;
    index < stops.length;
    index += 1
  ) {
    const stop = stops[index];

    if (!stop) {
      throw new RouteServiceError(
        `Липсва route stop на позиция ${index}.`,
      );
    }

    if (stop.label.trim() === "") {
      throw new RouteServiceError(
        `Route stop ${index + 1} няма label.`,
      );
    }

    if (stop.coordinate) {
      validateCoordinate(
        stop.coordinate,
        index,
      );
    }
  }
}

function validateCoordinate(
  coordinate: RouteCoordinate,
  stopIndex: number,
): void {
  if (
    !Number.isFinite(
      coordinate.latitude,
    ) ||
    coordinate.latitude < -90 ||
    coordinate.latitude > 90
  ) {
    throw new RouteServiceError(
      `Route stop ${stopIndex + 1} има невалидна latitude.`,
    );
  }

  if (
    !Number.isFinite(
      coordinate.longitude,
    ) ||
    coordinate.longitude < -180 ||
    coordinate.longitude > 180
  ) {
    throw new RouteServiceError(
      `Route stop ${stopIndex + 1} има невалидна longitude.`,
    );
  }
}

function normalizeCountryBreakdown(
  values:
    | readonly RouteCountryBreakdown[]
    | null
    | undefined,
): RouteCountryBreakdown[] {
  if (!values) {
    return [];
  }

  return values.map(
    (value, index) => {
      const countryCode =
        value.countryCode
          .trim()
          .toUpperCase();

      if (
        !/^[A-Z]{2}$/.test(
          countryCode,
        )
      ) {
        throw new RouteServiceError(
          `countryBreakdown[${index}].countryCode трябва да бъде двубуквен код.`,
        );
      }

      validateNonNegativeNumber(
        value.distanceKm,
        `countryBreakdown[${index}].distanceKm`,
      );

      validateNonNegativeNumber(
        value.tollCost,
        `countryBreakdown[${index}].tollCost`,
      );

      return {
        countryCode,
        distanceKm:
          roundRouteValue(
            value.distanceKm,
          ),
        tollCost: roundMoney(
          value.tollCost,
        ),
      };
    },
  );
}

function validateOptionalNonNegativeNumber(
  value: number | null | undefined,
  fieldName: string,
): void {
  if (
    value === null ||
    value === undefined
  ) {
    return;
  }

  validateNonNegativeNumber(
    value,
    fieldName,
  );
}

function validateNonNegativeNumber(
  value: number,
  fieldName: string,
): void {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new RouteServiceError(
      `${fieldName} трябва да бъде неотрицателно число.`,
    );
  }
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue === ""
    ? null
    : normalizedValue;
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