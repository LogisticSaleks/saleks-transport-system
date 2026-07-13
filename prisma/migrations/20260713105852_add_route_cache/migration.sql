-- CreateTable
CREATE TABLE "route_cache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "requestJson" JSONB NOT NULL,
    "resultJson" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "route_cache_cacheKey_key" ON "route_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "route_cache_providerId_idx" ON "route_cache"("providerId");

-- CreateIndex
CREATE INDEX "route_cache_expiresAt_idx" ON "route_cache"("expiresAt");
