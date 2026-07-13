import { createHash } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

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

export type RouteProviderResult = {
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

export type RouteCacheMetadata = {
  hit: boolean;
  key: string | null;
  expiresAt: string | null;
};

export type RouteResult =
  RouteProviderResult & {
    cache: RouteCacheMetadata;
  };

export interface RouteProvider {
  readonly id: RouteProviderId;
  readonly name: string;

  calculateRoute(
    request: RouteRequest,
  ): Promise<RouteProviderResult>;
}

export type RouteCacheWriteInput = {
  cacheKey: string;
  providerId: string;
  request: RouteRequest;
  result: RouteProviderResult;
  expiresAt: Date;
};

export type RouteCachedValue = {
  result: RouteProviderResult;
  expiresAt: Date;
};

export interface RouteCacheStore {
  get(
    cacheKey: string,
  ): Promise<RouteCachedValue | null>;

  set(
    input: RouteCacheWriteInput,
  ): Promise<void>;
}

export type RouteCalculationOptions = {
  skipCache?: boolean;
};

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
  readonly name =
    "Manual Route Provider";

  async calculateRoute(
    request: RouteRequest,
  ): Promise<RouteProviderResult> {
    validateRouteStops(request.stops);

    const manualValues =
      request.manual;

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
      manualValues.durationMinutes ===
        null ||
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

export class PrismaRouteCacheStore
  implements RouteCacheStore
{
  async get(
    cacheKey: string,
  ): Promise<RouteCachedValue | null> {
    const cachedRecord =
      await prisma.routeCache.findUnique({
        where: {
          cacheKey,
        },
        select: {
          resultJson: true,
          expiresAt: true,
        },
      });

    if (!cachedRecord) {
      return null;
    }

    if (
      cachedRecord.expiresAt.getTime() <=
      Date.now()
    ) {
      await prisma.routeCache.deleteMany({
        where: {
          cacheKey,
        },
      });

      return null;
    }

    return {
      result:
        cachedRecord.resultJson as unknown as RouteProviderResult,
      expiresAt:
        cachedRecord.expiresAt,
    };
  }

  async set(
    input: RouteCacheWriteInput,
  ): Promise<void> {
    await prisma.routeCache.upsert({
      where: {
        cacheKey: input.cacheKey,
      },

      create: {
        cacheKey: input.cacheKey,
        providerId: input.providerId,
        requestJson:
          toPrismaJson(input.request),
        resultJson:
          toPrismaJson(input.result),
        expiresAt: input.expiresAt,
      },

      update: {
        providerId: input.providerId,
        requestJson:
          toPrismaJson(input.request),
        resultJson:
          toPrismaJson(input.result),
        expiresAt: input.expiresAt,
      },
    });
  }
}

type RouteServiceOptions = {
  providers?: readonly RouteProvider[];
  defaultProviderId?: RouteProviderId;
  cacheStore?: RouteCacheStore | null;
  cacheTtlSeconds?: number;
};

export class RouteService {
  private readonly providers =
    new Map<string, RouteProvider>();

  private defaultProviderId: string;

  private readonly cacheStore:
    | RouteCacheStore
    | null;

  private readonly cacheTtlSeconds:
    number;

  constructor({
    providers = [
      new ManualRouteProvider(),
    ],
    defaultProviderId = "manual",
    cacheStore = null,
    cacheTtlSeconds = 86_400,
  }: RouteServiceOptions = {}) {
    for (const provider of providers) {
      this.registerProvider(provider);
    }

    this.defaultProviderId =
      defaultProviderId;

    this.cacheStore = cacheStore;

    validatePositiveNumber(
      cacheTtlSeconds,
      "cacheTtlSeconds",
    );

    this.cacheTtlSeconds =
      cacheTtlSeconds;

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
    options: RouteCalculationOptions = {},
  ): Promise<RouteResult> {
    const provider =
      this.providers.get(providerId);

    if (!provider) {
      throw new RouteServiceError(
        `Route provider "${providerId}" не е регистриран.`,
      );
    }

    const shouldUseCache =
      this.cacheStore !== null &&
      options.skipCache !== true;

    const cacheKey = shouldUseCache
      ? createRouteCacheKey(
          provider.id,
          request,
        )
      : null;

    const cacheWarnings: string[] = [];

    if (
      shouldUseCache &&
      cacheKey &&
      this.cacheStore
    ) {
      try {
        const cachedValue =
          await this.cacheStore.get(
            cacheKey,
          );

        if (cachedValue) {
          return {
            ...cachedValue.result,
            cache: {
              hit: true,
              key: cacheKey,
              expiresAt:
                cachedValue.expiresAt.toISOString(),
            },
          };
        }
      } catch (error) {
        console.error(
          "Route cache read error:",
          error,
        );

        cacheWarnings.push(
          "Route cache не можа да бъде прочетен. Използвано е ново изчисление.",
        );
      }
    }

    const providerResult =
      await provider.calculateRoute(
        request,
      );

    const normalizedResult:
      RouteProviderResult = {
      ...providerResult,
      providerId: provider.id,
      warnings: [
        ...providerResult.warnings,
        ...cacheWarnings,
      ],
    };

    let cacheExpiresAt:
      | Date
      | null = null;

    if (
      shouldUseCache &&
      cacheKey &&
      this.cacheStore
    ) {
      const expiresAt = new Date(
        Date.now() +
          this.cacheTtlSeconds * 1000,
      );

      try {
        await this.cacheStore.set({
          cacheKey,
          providerId: provider.id,
          request,
          result: normalizedResult,
          expiresAt,
        });

        cacheExpiresAt = expiresAt;
      } catch (error) {
        console.error(
          "Route cache write error:",
          error,
        );

        normalizedResult.warnings.push(
          "Новото route изчисление не можа да бъде записано в cache.",
        );
      }
    }

    return {
      ...normalizedResult,
      cache: {
        hit: false,
        key: cacheKey,
        expiresAt:
          cacheExpiresAt?.toISOString() ??
          null,
      },
    };
  }
}

export const manualRouteProvider =
  new ManualRouteProvider();

export const routeCacheStore =
  new PrismaRouteCacheStore();

export const routeService =
  new RouteService({
    providers: [
      manualRouteProvider,
    ],
    defaultProviderId: "manual",
    cacheStore: routeCacheStore,

    /*
     * 24 часа. По-късно може да се премести
     * в AppSetting или environment variable.
     */
    cacheTtlSeconds: 86_400,
  });

export function createRouteCacheKey(
  providerId: RouteProviderId,
  request: RouteRequest,
): string {
  const serializedRequest =
    stableStringify({
      providerId,
      request,
    });

  return createHash("sha256")
    .update(serializedRequest)
    .digest("hex");
}

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

function validatePositiveNumber(
  value: number,
  fieldName: string,
): void {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new RouteServiceError(
      `${fieldName} трябва да бъде положително число.`,
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

function stableStringify(
  value: unknown,
): string {
  return JSON.stringify(
    sortJsonValue(value),
  );
}

function sortJsonValue(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      sortJsonValue(item),
    );
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    return Object.fromEntries(
      Object.entries(
        value as Record<
          string,
          unknown
        >,
      )
        .filter(
          ([, nestedValue]) =>
            nestedValue !== undefined,
        )
        .sort(
          ([firstKey], [secondKey]) =>
            firstKey.localeCompare(
              secondKey,
            ),
        )
        .map(
          ([key, nestedValue]) => [
            key,
            sortJsonValue(
              nestedValue,
            ),
          ],
        ),
    );
  }

  return value;
}

function toPrismaJson(
  value: unknown,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value),
  ) as Prisma.InputJsonValue;
}