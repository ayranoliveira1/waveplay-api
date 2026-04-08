-- CreateTable
CREATE TABLE "stream_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "tmdb_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3) NOT NULL,
    "duration_seconds" INTEGER NOT NULL,

    CONSTRAINT "stream_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stream_sessions_user_id_idx" ON "stream_sessions"("user_id");

-- CreateIndex
CREATE INDEX "stream_sessions_started_at_idx" ON "stream_sessions"("started_at");

-- CreateIndex
CREATE INDEX "stream_sessions_ended_at_idx" ON "stream_sessions"("ended_at");

-- AddForeignKey
ALTER TABLE "stream_sessions" ADD CONSTRAINT "stream_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_sessions" ADD CONSTRAINT "stream_sessions_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
