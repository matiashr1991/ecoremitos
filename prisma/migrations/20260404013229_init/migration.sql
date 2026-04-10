-- CreateEnum
CREATE TYPE "GuiaEstado" AS ENUM ('en_blanco', 'asignada', 'emitida', 'vigente', 'vencida', 'finalizada', 'intervenida', 'anulada');

-- CreateEnum
CREATE TYPE "RemitoEstado" AS ENUM ('disponible', 'vinculado', 'en_transito', 'entregado', 'devuelto', 'anulado');

-- CreateEnum
CREATE TYPE "GuiaTipo" AS ENUM ('normal', 'deposito');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'central', 'delegacion', 'control', 'auditor', 'recaudacion', 'fiscalizador');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'control',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "delegacionId" INTEGER,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegaciones" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255),
    "telefono" VARCHAR(50),
    "direccion" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "delegaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "titulares" (
    "id" SERIAL NOT NULL,
    "razon_social" VARCHAR(255) NOT NULL,
    "cuit" VARCHAR(13) NOT NULL,
    "email" VARCHAR(255),
    "telefono" VARCHAR(50),
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "titulares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guias" (
    "id" SERIAL NOT NULL,
    "nrguia" INTEGER NOT NULL,
    "tipo" "GuiaTipo" NOT NULL DEFAULT 'normal',
    "estado" "GuiaEstado" NOT NULL DEFAULT 'en_blanco',
    "delegacion_id" INTEGER,
    "titular_id" INTEGER,
    "destino" VARCHAR(255),
    "fecha_carga" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_emision" DATE,
    "fecha_vencimiento" DATE,
    "fecha_entrega" DATE,
    "deposito" BOOLEAN NOT NULL DEFAULT false,
    "devuelto" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "guias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remitos" (
    "id" SERIAL NOT NULL,
    "nrremito" INTEGER NOT NULL,
    "estado" "RemitoEstado" NOT NULL DEFAULT 'disponible',
    "guia_id" INTEGER,
    "delegacion_id" INTEGER,
    "fecha_carga" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "devuelto" BOOLEAN NOT NULL DEFAULT false,
    "observaciones" TEXT,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "remitos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "imagenes" (
    "id" SERIAL NOT NULL,
    "guia_id" INTEGER,
    "remito_id" INTEGER,
    "filename" VARCHAR(255) NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "content_type" VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
    "size_bytes" INTEGER,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imagenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "user_id" TEXT,
    "user_email" VARCHAR(255),
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "delegaciones_nombre_key" ON "delegaciones"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "titulares_cuit_key" ON "titulares"("cuit");

-- CreateIndex
CREATE UNIQUE INDEX "guias_nrguia_key" ON "guias"("nrguia");

-- CreateIndex
CREATE INDEX "guias_estado_idx" ON "guias"("estado");

-- CreateIndex
CREATE INDEX "guias_delegacion_id_idx" ON "guias"("delegacion_id");

-- CreateIndex
CREATE INDEX "guias_titular_id_idx" ON "guias"("titular_id");

-- CreateIndex
CREATE INDEX "guias_fecha_emision_idx" ON "guias"("fecha_emision");

-- CreateIndex
CREATE UNIQUE INDEX "remitos_nrremito_key" ON "remitos"("nrremito");

-- CreateIndex
CREATE INDEX "remitos_guia_id_idx" ON "remitos"("guia_id");

-- CreateIndex
CREATE INDEX "remitos_estado_idx" ON "remitos"("estado");

-- CreateIndex
CREATE INDEX "audit_log_user_id_idx" ON "audit_log"("user_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_delegacionId_fkey" FOREIGN KEY ("delegacionId") REFERENCES "delegaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guias" ADD CONSTRAINT "guias_delegacion_id_fkey" FOREIGN KEY ("delegacion_id") REFERENCES "delegaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guias" ADD CONSTRAINT "guias_titular_id_fkey" FOREIGN KEY ("titular_id") REFERENCES "titulares"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remitos" ADD CONSTRAINT "remitos_guia_id_fkey" FOREIGN KEY ("guia_id") REFERENCES "guias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remitos" ADD CONSTRAINT "remitos_delegacion_id_fkey" FOREIGN KEY ("delegacion_id") REFERENCES "delegaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagenes" ADD CONSTRAINT "imagenes_guia_id_fkey" FOREIGN KEY ("guia_id") REFERENCES "guias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imagenes" ADD CONSTRAINT "imagenes_remito_id_fkey" FOREIGN KEY ("remito_id") REFERENCES "remitos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
