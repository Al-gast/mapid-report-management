import { Router } from "express";

import {
  requireAuth,
  requireRole,
} from "../../middleware/auth.middleware.js";

import {
  createReportSchema,
  updateReportSchema,
  reportParamsSchema,
  listReportsSchema,
} from "./reports.schema.js";

import {
  createReport,
  getReportById,
  listReports,
  updateReport,
} from "./reports.service.js";

import {
  updateStatusSchema,
  approvalHistoryQuerySchema,
} from "./approvals.schema.js";

import {
  changeReportStatus,
  getApprovalHistory,
} from "./approvals.service.js";

export const reportsRouter = Router();

// Semua report endpoint memerlukan authentication
reportsRouter.use(requireAuth);

// GET /api/reports
reportsRouter.get("/", async (req, res) => {
  const validation = listReportsSchema.safeParse(
    req.query
  );

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid query parameters",
    });
  }

  const result = await listReports(
    req.authUser!,
    validation.data
  );

  return res.status(200).json({
    success: true,
    data: result,
  });
});

// POST /api/reports
reportsRouter.post(
  "/",
  requireRole("pelapor"),
  async (req, res) => {
    const validation = createReportSchema.safeParse(
      req.body
    );

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const report = await createReport(
      validation.data,
      req.authUser!.id
    );

    return res.status(201).json({
      success: true,
      message: "Report created successfully",
      data: { report },
    });
  }
);

// GET /api/reports/:id
reportsRouter.get("/:id", async (req, res) => {
  const validation = reportParamsSchema.safeParse(
    req.params
  );

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid report ID",
    });
  }

  const report = await getReportById(
    validation.data.id,
    req.authUser!
  );

  if (!report) {
    return res.status(404).json({
      success: false,
      message: "Report not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: { report },
  });
});

// PATCH /api/reports/:id
reportsRouter.patch(
  "/:id",
  requireRole("pelapor"),
  async (req, res) => {
    const paramsValidation =
      reportParamsSchema.safeParse(req.params);

    if (!paramsValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const bodyValidation =
      updateReportSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: bodyValidation.error.issues.map(
          (issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })
        ),
      });
    }

    const result = await updateReport(
      paramsValidation.data.id,
      req.authUser!.id,
      bodyValidation.data
    );

    if (result.kind === "not_found") {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    if (result.kind === "not_pending") {
      return res.status(409).json({
        success: false,
        message: "Only pending reports can be edited",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Report updated successfully",
      data: { report: result.report },
    });
  }
);

// PATCH /api/reports/:id/status
reportsRouter.patch(
  "/:id/status",
  requireRole("approver"),
  async (req, res) => {
    const paramsValidation =
      reportParamsSchema.safeParse(req.params);

    if (!paramsValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid report ID",
      });
    }

    const bodyValidation =
      updateStatusSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const result = await changeReportStatus(
      paramsValidation.data.id,
      req.authUser!.id,
      bodyValidation.data.status
    );

    if (result.kind === "not_found") {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    if (result.kind === "unchanged") {
      return res.status(409).json({
        success: false,
        message: "Report already has this status",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Report status updated successfully",
      data: {
        report: result.report,
        approval: result.approval,
      },
    });
  }
);

// GET /api/reports/:id/history
reportsRouter.get("/:id/history", async (req, res) => {
  const paramsValidation =
    reportParamsSchema.safeParse(req.params);

  if (!paramsValidation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid report ID",
    });
  }

  const queryValidation =
    approvalHistoryQuerySchema.safeParse(req.query);

  if (!queryValidation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid query parameters",
    });
  }

  const result = await getApprovalHistory(
    paramsValidation.data.id,
    req.authUser!,
    queryValidation.data
  );

  if (!result) {
    return res.status(404).json({
      success: false,
      message: "Report not found",
    });
  }

  return res.status(200).json({
    success: true,
    data: result,
  });
});