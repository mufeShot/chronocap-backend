-- CreateEnum
CREATE TYPE "public"."MailType" AS ENUM ('EMAIL_VERIFICATION');

-- CreateEnum
CREATE TYPE "public"."MailStatus" AS ENUM ('PENDING', 'SENT', 'RECEIVED', 'DELIVERED', 'FAILED', 'CONFIRMED');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."MailLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "public"."MailType" NOT NULL,
    "status" "public"."MailStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "token" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MailLog_providerMessageId_key" ON "public"."MailLog"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "MailLog_token_key" ON "public"."MailLog"("token");

-- CreateIndex
CREATE INDEX "MailLog_userId_type_idx" ON "public"."MailLog"("userId", "type");

-- CreateIndex
CREATE INDEX "MailLog_status_idx" ON "public"."MailLog"("status");

-- AddForeignKey
ALTER TABLE "public"."MailLog" ADD CONSTRAINT "MailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
