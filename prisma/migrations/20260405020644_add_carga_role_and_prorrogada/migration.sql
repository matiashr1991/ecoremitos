-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'carga';

-- AlterTable
ALTER TABLE "guias" ADD COLUMN     "prorrogada" BOOLEAN NOT NULL DEFAULT false;
