
import { apiRequest } from "../../lib/api";

export type ReportStatus =
  | "pending"
  | "approved"
  | "rejected";

export type Report = {
  id: string;
  reporter_id: string;
  name: string;
  description: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
};

export type ReportInput = {
  name: string;
  description: string;
};

export type ReportListFilters = {
  page: number;
  limit: number;
  status?: ReportStatus;
  sort: "asc" | "desc";
};

export type ReportListData = {
  reports: Report[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ReportListResponse = {
  success: boolean;
  data: ReportListData;
};

type ReportResponse = {
  success: boolean;
  message?: string;
  data: {
    report: Report;
  };
};

export const reportsApi = {
  async list(filters: ReportListFilters) {
    const params = new URLSearchParams({
      page: String(filters.page),
      limit: String(filters.limit),
      sort: filters.sort,
    });

    if (filters.status) {
      params.set("status", filters.status);
    }

    const response = await apiRequest<ReportListResponse>(
      `/api/reports?${params.toString()}`
    );

    return response.data;
  },

  async detail(id: string): Promise<Report> {
    const response = await apiRequest<ReportResponse>(
      `/api/reports/${encodeURIComponent(id)}`
    );

    return response.data.report;
  },

  async create(input: ReportInput): Promise<Report> {
    const response = await apiRequest<ReportResponse>(
      "/api/reports",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );

    return response.data.report;
  },

  async update(
    id: string,
    input: Partial<ReportInput>
  ): Promise<Report> {
    const response = await apiRequest<ReportResponse>(
      `/api/reports/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      }
    );

    return response.data.report;
  },
};
