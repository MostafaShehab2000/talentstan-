-- CreateEnum
CREATE TYPE "OtherRequestType" AS ENUM ('hr_letter', 'experience_letter', 'mobile_line', 'salary_certificate', 'bank_letter', 'other');

-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "destination" TEXT,
ADD COLUMN     "missionAllowance" DECIMAL(65,30),
ADD COLUMN     "purpose" TEXT;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "commentsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "permission_policies" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "maxHoursPerMonth" DECIMAL(65,30) NOT NULL DEFAULT 4,
    "maxTimesPerMonth" INTEGER NOT NULL DEFAULT 4,
    "monthStartDay" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "other_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "OtherRequestType" NOT NULL,
    "details" TEXT,
    "copies" INTEGER NOT NULL DEFAULT 1,
    "status" "RequestStatus" NOT NULL DEFAULT 'submitted',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "other_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permission_policies_tenantId_key" ON "permission_policies"("tenantId");

-- AddForeignKey
ALTER TABLE "permission_policies" ADD CONSTRAINT "permission_policies_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "other_requests" ADD CONSTRAINT "other_requests_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "other_requests" ADD CONSTRAINT "other_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
