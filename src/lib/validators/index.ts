import { z } from "zod";

// =============================================
// DELEGACIONES
// =============================================
export const createDelegacionSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(150),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().max(50).optional().or(z.literal("")),
  direccion: z.string().optional().or(z.literal("")),
});

export const updateDelegacionSchema = createDelegacionSchema.partial().extend({
  id: z.number(),
  activa: z.boolean().optional(),
});

// =============================================
// TITULARES
// =============================================
export const createTitularSchema = z.object({
  razonSocial: z.string().min(2, "La razón social debe tener al menos 2 caracteres").max(255),
  cuit: z
    .string()
    .regex(/^\d{2}-\d{8}-\d{1}$/, "Formato de CUIT inválido. Usar XX-XXXXXXXX-X"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefono: z.string().max(50).optional().or(z.literal("")),
  direccion: z.string().optional().or(z.literal("")),
});

export const updateTitularSchema = createTitularSchema.partial().extend({
  id: z.number(),
  activo: z.boolean().optional(),
});

// =============================================
// GUÍAS
// =============================================
export const createGuiaSchema = z.object({
  nrguia: z.number().int().positive("El número de guía debe ser positivo"),
  tipo: z.enum(["normal", "deposito"]).default("normal"),
  delegacionId: z.number().int().optional().nullable(),
  titularId: z.number().int().optional().nullable(),
  destino: z.string().max(255).optional().or(z.literal("")),
  fechaEmision: z.string().optional().or(z.literal("")),
  fechaVencimiento: z.string().optional().or(z.literal("")),
  observaciones: z.string().optional().or(z.literal("")),
});

export const createGuiasBulkSchema = z.object({
  desde: z.number().int().positive("El número inicial debe ser positivo"),
  hasta: z.number().int().positive("El número final debe ser positivo"),
  delegacionId: z.number().int().optional().nullable(),
}).refine((data) => data.hasta >= data.desde, {
  message: "El número final debe ser mayor o igual al inicial",
  path: ["hasta"],
}).refine((data) => data.hasta - data.desde < 500, {
  message: "No se pueden crear más de 500 guías a la vez",
  path: ["hasta"],
});

export const updateGuiaSchema = z.object({
  id: z.number(),
  tipo: z.enum(["normal", "deposito"]).optional(),
  estado: z.enum(["en_blanco", "asignada", "emitida", "vigente", "vencida", "finalizada", "intervenida", "anulada"]).optional(),
  delegacionId: z.number().int().optional().nullable(),
  titularId: z.number().int().optional().nullable(),
  destino: z.string().max(255).optional().nullable(),
  fechaEmision: z.string().optional().nullable(),
  fechaVencimiento: z.string().optional().nullable(),
  fechaEntrega: z.string().optional().nullable(),
  deposito: z.boolean().optional(),
  devuelto: z.boolean().optional(),
  observaciones: z.string().optional().nullable(),
});

// =============================================
// REMITOS
// =============================================
export const createRemitoSchema = z.object({
  nrremito: z.number().int().positive("El número de remito debe ser positivo"),
  guiaId: z.number().int().optional().nullable(),
  delegacionId: z.number().int().optional().nullable(),
  observaciones: z.string().optional().or(z.literal("")),
});

export const createRemitosBulkSchema = z.object({
  desde: z.number().int().positive("El número inicial debe ser positivo"),
  hasta: z.number().int().positive("El número final debe ser positivo"),
  delegacionId: z.number().int().optional().nullable(),
}).refine((data) => data.hasta >= data.desde, {
  message: "El número final debe ser mayor o igual al inicial",
  path: ["hasta"],
}).refine((data) => data.hasta - data.desde < 500, {
  message: "No se pueden crear más de 500 remitos a la vez",
  path: ["hasta"],
});

export const updateRemitoSchema = z.object({
  id: z.number(),
  estado: z.enum(["disponible", "vinculado", "en_transito", "entregado", "devuelto", "anulado"]).optional(),
  guiaId: z.number().int().optional().nullable(),
  delegacionId: z.number().int().optional().nullable(),
  devuelto: z.boolean().optional(),
  observaciones: z.string().optional().nullable(),
});

// =============================================
// FILTERS (shared)
// =============================================
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
