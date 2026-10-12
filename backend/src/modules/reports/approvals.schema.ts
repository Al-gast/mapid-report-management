import { z } from "zod";

export const updateStatusSchema = z
  .strictObject({
    status: z.enum(["approved", "rejected"]),

    reason: z
      .string()
      .trim()
      .min(1)
      .max(1000)
      .optional(),
  })
  .refine(
    (data) =>
      data.status !== "rejected" ||
      Boolean(data.reason),
    {
      path: ["reason"],
      message: "Alasan wajib diisi saat reject",
    }
  );

export const approvalHistoryQuerySchema = z.strictObject({
  page: z.coerce.number()
    .int().min(1).max(100000).default(1),

  limit: z.coerce.number()
    .int().min(1).max(50).default(20),
});

export type ApprovalDecision =
  z.infer<typeof updateStatusSchema>["status"];

export type ApprovalHistoryQuery =
  z.infer<typeof approvalHistoryQuerySchema>;
