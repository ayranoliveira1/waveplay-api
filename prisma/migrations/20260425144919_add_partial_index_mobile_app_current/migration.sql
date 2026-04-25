-- CreateTable
CREATE TABLE "mobile_app_versions" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "download_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "release_notes" TEXT,
    "force_update" BOOLEAN NOT NULL DEFAULT false,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "published_by" TEXT NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mobile_app_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mobile_app_versions_version_key" ON "mobile_app_versions"("version");

-- CreateIndex
CREATE INDEX "mobile_app_versions_version_idx" ON "mobile_app_versions"("version");
