export type RouteProvider = "PTV" | "HERE" | "GOOGLE" | "MANUAL"

export type RouteCalculationSource = "CACHE" | "API" | "MANUAL"

export type CourseType = "ROUND_TRIP" | "SHUNT"

export type RoutePointType =
  | "CONTAINER_PICKUP"
  | "LOADING_UNLOADING"
  | "EXTRA_STOP"
  | "CONTAINER_DROPOFF"
  | "SHUNT_PICKUP"
  | "SHUNT_DROPOFF"

export type RoutePoint = {
  id?: string
  type: RoutePointType
  name: string
  addressLine?: string | null
  city?: string | null
  postalCode?: string | null
  country?: string | null
  latitude?: number | null
  longitude?: number | null
}

export type TruckRouteProfile = {
  truckId?: string
  name?: string
  euroClass?: string | null
  fuelConsumptionL100km?: number | null
  maxWeightTons?: number | null
  axleCount?: number | null
  tollProfile?: string | null
}

export type RouteLegRequest = {
  legOrder: number
  from: RoutePoint
  to: RoutePoint
}

export type RouteCalculationRequest = {
  courseType: CourseType
  provider?: RouteProvider
  points: RoutePoint[]
  truckProfile: TruckRouteProfile
  forceRecalculate?: boolean
  manualTotalKm?: number
  manualTollCost?: number
}

export type RouteLegResult = {
  legOrder: number
  from: RoutePoint
  to: RoutePoint

  distanceKm: number
  drivingTimeMinutes?: number | null
  tollCost?: number | null

  countries?: string[]
  routeGeometry?: unknown

  isBillable?: boolean
  billableDistanceKm?: number
}

export type RouteCalculationResult = {
  source: RouteCalculationSource
  provider: RouteProvider

  legs: RouteLegResult[]

  totalKm: number
  tollCost: number
  drivingTimeMinutes?: number | null

  countries?: string[]
  routeGeometry?: unknown

  calculatedAt: string
  cachedUntil?: string | null

  warnings: string[]
}

export type RouteProviderContext = {
  apiKey?: string
}

export type RouteProviderAdapter = {
  provider: RouteProvider
  calculateRoute: (
    request: RouteCalculationRequest,
    context?: RouteProviderContext
  ) => Promise<RouteCalculationResult>
}