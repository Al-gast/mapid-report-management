import { apiRequest } from "../../lib/api";

import type {
  Report,
  ReportStatus,
} from "./reports.api";

export type ApprovalDecision =
  | "approved"
  | "rejected";

export type ApprovalRecord = {
  id: string;
  report_id: string;
  approver_id: string;
  previous_status: ReportStatus;
  new_status: ApprovalDecision;
  decided_at: string;
};

export type ApprovalHistoryItem = ApprovalRecord & {
  approver_name: string;
};

export type ApprovalHistoryData = {
  history: ApprovalHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ChangeStatusResponse = {
  success: boolean;
  message: string;
  data: {
    report: Report;
    approval: ApprovalRecord;
  };
};

type ApprovalHistoryResponse = {
  success: boolean;
  data: ApprovalHistoryData;
};

export const approvalsApi = {
  async changeStatus(
    reportId: string,
    status: ApprovalDecision
  ): Promise<Report> {
    const response =
      await apiRequest<ChangeStatusResponse>(
        `/api/reports/${encodeURIComponent(reportId)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );

    return response.data.report;
  },

  async history(
    reportId: string,
    page = 1,
    limit = 10
  ): Promise<ApprovalHistoryData> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    const response =
      await apiRequest<ApprovalHistoryResponse>(
        `/api/reports/${encodeURIComponent(reportId)}/history?${params.toString()}`
      );

    return response.data;
  },
};
