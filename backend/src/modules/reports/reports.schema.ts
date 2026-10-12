import { z } from "zod";

const reportName = z
  .string()
  .trim()
  .min(1, "Report name is required")
  .max(255, "Report name is too long");

const reportDescription = z
  .string()
  .trim()
  .min(1, "Description is required")
  .max(5000, "Description is too long");

export const createReportSchema = z.strictObject({
  name: reportName,
  description: reportDescription,
});

export const updateReportSchema = createReportSchema
  .partial()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined,
    {
      message: "At least one field is required",
    }
  );

export const reportParamsSchema = z.strictObject({
  id: z.uuid(),
});

export const listReportsSchema = z.strictObject({
  page: z.coerce.number()
    .int().min(1).max(100000).default(1),

  limit: z.coerce.number()
    .int().min(1).max(50).default(10),

  status: z.enum([
    "pending",
    "approved",
    "rejected",
  ]).optional(),

  sort: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateReportInput =
  z.infer<typeof createReportSchema>;

export type UpdateReportInput =
  z.infer<typeof updateReportSchema>;

export type ListReportsInput =
  z.infer<typeof listReportsSchema>;