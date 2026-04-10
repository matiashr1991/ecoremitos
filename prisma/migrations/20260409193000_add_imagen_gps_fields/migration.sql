-- Add GPS metadata to image records
ALTER TABLE "imagenes"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "gps_accuracy" DOUBLE PRECISION,
ADD COLUMN "gps_captured_at" TIMESTAMP(3);
