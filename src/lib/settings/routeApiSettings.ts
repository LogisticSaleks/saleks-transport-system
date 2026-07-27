import "server-only";

import { prisma } from "@/lib/prisma";
import { routeService } from "@/lib/routes/routeService";

export type RouteApiCheckStatus =
  | "OK"
  | "WARNING"
  | "ERROR";

export type RouteApiHealthCheck = {
  key: string;
  label: string;
  status: RouteApiCheckStatus;
  message: string;
};

export type RouteApiSettingsStatus = {
  generatedAt: string;
  providers: {
    registeredProviderIds: string[];
    serviceDefaultProviderId: string;
    courseDefaultProviderId: string;
    ptvProviderRegistered: boolean;
    ptvApiKeyConfigured: boolean;
  };
  cache: {
    ttlSeconds: number;
    ttlHours: number;
    totalEntries: number;
    activeEntries: number;
    expiredEntries: number;
    latestCreatedAt: string | null;
    latestExpiresAt: string | null;
  };
  defaults: {
    currency: "EUR";
    includeCountryBreakdown: boolean;
    vehicle: {
      grossWeightKg: number;
      axleCount: number;
      euroClass: string;
    };
  };
  checks: RouteApiHealthCheck[];
};

const SERVICE_DEFAULT_PROVIDER_ID = "manual";
const COURSE_DEFAULT_PROVIDER_ID = "ptv";
const ROUTE_CACHE_TTL_SECONDS = 86_400;

const DEFAULT_ROUTE_VEHICLE = {
  grossWeightKg: 40_000,
  axleCount: 5,
  euroClass: "EURO_6",
} as const;

export async function loadRouteApiSettingsStatus(): Promise<RouteApiSettingsStatus> {
  const registeredProviderIds =
    routeService.getProviderIds();

  const ptvProviderRegistered =
    routeService.hasProvider("ptv");

  const ptvApiKeyConfigured =
    isPtvApiKeyConfigured();

  const cache = await loadRouteCacheStatus();

  return {
    generatedAt: new Date().toISOString(),

    providers: {
      registeredProviderIds,
      serviceDefaultProviderId:
        SERVICE_DEFAULT_PROVIDER_ID,
      courseDefaultProviderId:
        COURSE_DEFAULT_PROVIDER_ID,
      ptvProviderRegistered,
      ptvApiKeyConfigured,
    },

    cache,

    defaults: {
      currency: "EUR",
      includeCountryBreakdown: true,
      vehicle: {
        ...DEFAULT_ROUTE_VEHICLE,
      },
    },

    checks: buildHealthChecks({
      registeredProviderIds,
      ptvProviderRegistered,
      ptvApiKeyConfigured,
      cache,
    }),
  };
}

async function loadRouteCacheStatus(): Promise<
  RouteApiSettingsStatus["cache"]
> {
  const now = new Date();

  const [
    totalEntries,
    activeEntries,
    expiredEntries,
    latestCreatedRecord,
    latestExpiresRecord,
  ] = await Promise.all([
    prisma.routeCache.count(),

    prisma.routeCache.count({
      where: {
        expiresAt: {
          gt: now,
        },
      },
    }),

    prisma.routeCache.count({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    }),

    prisma.routeCache.findFirst({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        createdAt: true,
      },
    }),

    prisma.routeCache.findFirst({
      orderBy: {
        expiresAt: "desc",
      },
      select: {
        expiresAt: true,
      },
    }),
  ]);

  return {
    ttlSeconds: ROUTE_CACHE_TTL_SECONDS,
    ttlHours:
      Math.round(
        (ROUTE_CACHE_TTL_SECONDS / 3_600) * 100,
      ) / 100,
    totalEntries,
    activeEntries,
    expiredEntries,
    latestCreatedAt:
      latestCreatedRecord?.createdAt.toISOString() ?? null,
    latestExpiresAt:
      latestExpiresRecord?.expiresAt.toISOString() ?? null,
  };
}

function buildHealthChecks({
  registeredProviderIds,
  ptvProviderRegistered,
  ptvApiKeyConfigured,
  cache,
}: {
  registeredProviderIds: readonly string[];
  ptvProviderRegistered: boolean;
  ptvApiKeyConfigured: boolean;
  cache: RouteApiSettingsStatus["cache"];
}): RouteApiHealthCheck[] {
  return [
    {
      key: "providers",
      label: "Route providers",
      status:
        registeredProviderIds.length >= 2
          ? "OK"
          : "WARNING",
      message:
        registeredProviderIds.length >= 2
          ? `Registered providers: ${registeredProviderIds.join(
              ", ",
            )}.`
          : `Only ${registeredProviderIds.length} provider is registered.`,
    },
    {
      key: "ptv-provider",
      label: "PTV provider",
      status: ptvProviderRegistered
        ? "OK"
        : "ERROR",
      message: ptvProviderRegistered
        ? "PTV provider is registered in RouteService."
        : "PTV provider is not registered in RouteService.",
    },
    {
      key: "ptv-api-key",
      label: "MYPTV_API_KEY",
      status: ptvApiKeyConfigured
        ? "OK"
        : "WARNING",
      message: ptvApiKeyConfigured
        ? "MYPTV_API_KEY is configured. The key is not displayed."
        : "MYPTV_API_KEY is missing. PTV route calculation and geocoding will fail until it is configured.",
    },
    {
      key: "route-cache",
      label: "Route cache",
      status: "OK",
      message: `${cache.activeEntries} active cache entries, ${cache.expiredEntries} expired entries, ${cache.totalEntries} total entries.`,
    },
  ];
}

function isPtvApiKeyConfigured(): boolean {
  return Boolean(process.env.MYPTV_API_KEY?.trim());
}