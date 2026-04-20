import { getCurrentUserId, getSupabaseClient, waitForLegacySupabaseAuthReady } from "../supabase/client";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";

export interface AccessLogGeoData {
  ipAddress: string | null;
  city: string | null;
  country: string | null;
}

export interface LogAccessOutput {
  logged: boolean;
  skipped?: "already_logged" | "no_session";
}

export interface AccessLogEntry {
  id: string;
  email: string | null;
  ipAddress: string | null;
  city: string | null;
  country: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ListAccessLogsParams {
  page?: number;
  pageSize?: number;
}

export interface AccessLogsPage {
  items: AccessLogEntry[];
  page: number;
  pageSize: number;
  total: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface AccessLogService {
  logCurrentAccess(force?: boolean): Promise<ServiceResult<LogAccessOutput>>;
  getSessionFlagKey(): string;
  listMine(params?: ListAccessLogsParams): Promise<ServiceResult<AccessLogsPage>>;
}

declare global {
  interface Window {
    fetch?: typeof fetch;
  }
}

const DEFAULT_FLAG_KEY = "_access_logged";
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

async function resolveGeoData(): Promise<AccessLogGeoData> {
  try {
    const fetchOptions: RequestInit = {};
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      fetchOptions.signal = AbortSignal.timeout(5000);
    }

    const response = await fetch("https://ipapi.co/json/", fetchOptions);
    if (!response.ok) {
      return { ipAddress: null, city: null, country: null };
    }

    const geo = (await response.json()) as {
      ip?: string;
      city?: string;
      country_name?: string;
    };

    return {
      ipAddress: geo.ip ?? null,
      city: geo.city ?? null,
      country: geo.country_name ?? null,
    };
  } catch {
    return { ipAddress: null, city: null, country: null };
  }
}

export class LegacyCompatibleAccessLogService implements AccessLogService {
  constructor(private readonly logFlag = DEFAULT_FLAG_KEY) {}

  getSessionFlagKey(): string {
    return this.logFlag;
  }

  async logCurrentAccess(force = false): Promise<ServiceResult<LogAccessOutput>> {
    try {
      if (!force && sessionStorage.getItem(this.logFlag)) {
        return ok({ logged: false, skipped: "already_logged" });
      }

      await waitForLegacySupabaseAuthReady();
      const supabase = getSupabaseClient();
      const { data: sessionResult, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionResult.session?.user) {
        return ok({ logged: false, skipped: "no_session" });
      }

      const user = sessionResult.session.user;
      const geoData = await resolveGeoData();

      const { error } = await supabase.from("access_logs").insert([
        {
          user_id: user.id,
          email: user.email ?? null,
          ip_address: geoData.ipAddress,
          city: geoData.city,
          country: geoData.country,
          user_agent: navigator.userAgent ?? null,
        },
      ]);

      if (error) {
        return fail(error.message, error.code, error);
      }

      sessionStorage.setItem(this.logFlag, "1");
      return ok({ logged: true });
    } catch (error) {
      return fail("No se pudo registrar acceso", "ACCESS_LOG_ERROR", error);
    }
  }

  async listMine(params: ListAccessLogsParams = {}): Promise<ServiceResult<AccessLogsPage>> {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return fail("No autenticado.", "AUTH_REQUIRED");
      }

      const page = Math.max(0, Math.floor(params.page ?? 0));
      const pageSize = Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(params.pageSize ?? DEFAULT_PAGE_SIZE)));
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const supabase = getSupabaseClient();
      const { data, error, count } = await supabase
        .from("access_logs")
        .select("id, email, ip_address, city, country, user_agent, created_at", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        return fail(error.message, error.code, error);
      }

      const total = count ?? 0;
      const items = ((data as Array<Record<string, unknown>> | null) ?? []).map((row) => ({
        id: String(row.id ?? ""),
        email: (row.email as string | null) ?? null,
        ipAddress: (row.ip_address as string | null) ?? null,
        city: (row.city as string | null) ?? null,
        country: (row.country as string | null) ?? null,
        userAgent: (row.user_agent as string | null) ?? null,
        createdAt: String(row.created_at ?? ""),
      }));

      return ok({
        items,
        page,
        pageSize,
        total,
        hasPreviousPage: page > 0,
        hasNextPage: from + items.length < total,
      });
    } catch (error) {
      return fail("No se pudieron cargar los registros de acceso.", "ACCESS_LOG_LIST_ERROR", error);
    }
  }
}

export const accessLogService = new LegacyCompatibleAccessLogService();
