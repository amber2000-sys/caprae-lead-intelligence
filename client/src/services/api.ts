/**
 * API client.
 *
 * One place that knows the response envelope, so every component handles
 * exactly one error shape. Requests go to a relative /api path, proxied to the
 * Express server by Vite in development — the client never needs to know the
 * backend's host, and there is no base-URL environment variable to misconfigure.
 */

import type {
  Lead, LeadDetail, BuyBox, LeadFilters, Pagination, LeadSummary,
  FilterOptions, Analytics, Dashboard, SavedLead, ScoringModel,
} from '../types';

const BASE = '/api';

/** Error carrying the server's own message, so the UI can show something useful. */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly details?: string[];

  constructor(message: string, status: number, details?: string[]) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.details = details;
  }
}

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: { message: string; details?: string[] };
  pagination?: Pagination;
  summary?: LeadSummary;
  message?: string;
  total?: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  let response: Response;

  try {
    response = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
  } catch {
    // A network-level failure is the most common local-setup problem, so it
    // gets its own message rather than a generic one.
    throw new ApiRequestError(
      'Could not reach the API. Is the server running on port 5000?',
      0
    );
  }

  let body: Envelope<T> | null = null;
  try {
    body = (await response.json()) as Envelope<T>;
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success) {
    throw new ApiRequestError(
      body?.error?.message || `Request failed (${response.status})`,
      response.status,
      body?.error?.details
    );
  }

  return body;
}

/** Drop empty values so the query string only carries filters the user actually set. */
function toQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export interface LeadsResponse {
  leads: Lead[];
  pagination: Pagination;
  summary: LeadSummary;
}

export const api = {
  async getLeads(
    filters: LeadFilters,
    options: { page?: number; limit?: number; sortBy?: string; sortOrder?: string } = {}
  ): Promise<LeadsResponse> {
    const body = await request<Lead[]>(`/leads${toQuery({ ...filters, ...options })}`);
    return {
      leads: body.data,
      pagination: body.pagination ?? { page: 1, limit: 20, total: body.data.length, totalPages: 1, hasNextPage: false, hasPrevPage: false },
      summary: body.summary ?? { total: body.data.length, high: 0, medium: 0, low: 0, averageFitScore: 0, averageDataQuality: 0 },
    };
  },

  async getLead(id: string): Promise<LeadDetail> {
    return (await request<LeadDetail>(`/leads/${id}`)).data;
  },

  async getFilterOptions(): Promise<FilterOptions> {
    return (await request<FilterOptions>('/leads/filters/options')).data;
  },

  async getBuyBox(): Promise<BuyBox> {
    return (await request<BuyBox>('/buy-box')).data;
  },

  async saveBuyBox(payload: Partial<BuyBox>): Promise<{ buyBox: BuyBox; message: string }> {
    const body = await request<BuyBox>('/buy-box', { method: 'POST', body: JSON.stringify(payload) });
    return { buyBox: body.data, message: body.message ?? 'Buy Box saved.' };
  },

  async resetBuyBox(): Promise<BuyBox> {
    return (await request<BuyBox>('/buy-box/reset', { method: 'POST' })).data;
  },

  async getScoringModel(): Promise<ScoringModel> {
    return (await request<ScoringModel>('/buy-box/model')).data;
  },

  async getDashboard(): Promise<Dashboard> {
    return (await request<Dashboard>('/analytics/dashboard')).data;
  },

  async getAnalytics(): Promise<Analytics> {
    return (await request<Analytics>('/analytics')).data;
  },

  async saveLead(id: string, note?: string): Promise<string> {
    const body = await request<unknown>(`/leads/${id}/save`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
    return body.message ?? 'Saved to your pipeline.';
  },

  async getSavedLeads(): Promise<SavedLead[]> {
    return (await request<SavedLead[]>('/saved-leads')).data;
  },

  async updateSavedLead(id: string, payload: { note?: string; status?: string }): Promise<void> {
    await request(`/saved-leads/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },

  async deleteSavedLead(id: string): Promise<void> {
    await request(`/saved-leads/${id}`, { method: 'DELETE' });
  },

  /**
   * Trigger a CSV download.
   *
   * Done with fetch + an object URL rather than pointing the browser at the
   * endpoint, so an error response renders as a toast instead of replacing the
   * app with a JSON error page.
   */
  async exportLeads(params: { ids?: string[]; filters?: LeadFilters; sortBy?: string; sortOrder?: string }): Promise<number> {
    const response = await fetch(`${BASE}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: params.ids ?? [],
        ...(params.filters ?? {}),
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new ApiRequestError(body?.error?.message || 'Export failed', response.status);
    }

    const rowCount = Number(response.headers.get('X-Export-Row-Count')) || 0;
    const disposition = response.headers.get('Content-Disposition') || '';
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'caprae-leads.csv';

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    return rowCount;
  },
};
