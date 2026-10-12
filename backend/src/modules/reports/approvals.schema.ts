import { z } from "zod";

export const updateStatusSchema = z.strictObject({
  status: z.enum(["approved", "rejected"]),
});

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
