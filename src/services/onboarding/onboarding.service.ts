import type { OnboardingProgress } from "../../shared/types/domain";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";
import { getCurrentUserId, getSupabaseClient } from "../supabase/client";

export interface ProgressSummary {
  completed: number;
  total: number;
  percentage: number;
}

export interface OnboardingService {
  getUserProgress(userId?: string): Promise<ServiceResult<OnboardingProgress | null>>;
  createUserProgress(userId?: string): Promise<ServiceResult<OnboardingProgress>>;
  updateStep(userId: string, stepNumber: 1 | 2 | 3 | 4, completed?: boolean): Promise<ServiceResult<OnboardingProgress>>;
  checkUserHasClients(userId: string): Promise<ServiceResult<boolean>>;
  checkUserHasCustomizedInvoice(userId: string): Promise<ServiceResult<boolean>>;
  checkUserHasIssuedInvoice(userId: string): Promise<ServiceResult<boolean>>;
  calculateProgress(progress: OnboardingProgress | null): ProgressSummary;
}

type OnboardingStepColumn =
  | "step1_business_info"
  | "step2_first_client"
  | "step3_customize_invoice"
  | "step4_first_invoice";

const STEP_COLUMN_BY_NUMBER: Record<1 | 2 | 3 | 4, OnboardingStepColumn> = {
  1: "step1_business_info",
  2: "step2_first_client",
  3: "step3_customize_invoice",
  4: "step4_first_invoice",
};

function mapProgressRow(row: Record<string, unknown>): OnboardingProgress {
  return {
    userId: String(row.user_id ?? ""),
    step1BusinessInfo: Boolean(row.step1_business_info),
    step2FirstClient: Boolean(row.step2_first_client),
    step3CustomizeInvoice: Boolean(row.step3_customize_invoice),
    step4FirstInvoice: Boolean(row.step4_first_invoice),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function calculateSummary(progressData: OnboardingProgress | null): ProgressSummary {
  if (!progressData) {
    return { completed: 0, total: 4, percentage: 0 };
  }

  const steps = [
    progressData.step1BusinessInfo,
    progressData.step2FirstClient,
    progressData.step3CustomizeInvoice,
    progressData.step4FirstInvoice,
  ];
  const completed = steps.filter(Boolean).length;
  const total = steps.length;
  const percentage = Math.round((completed / total) * 100);
  return { completed, total, percentage };
}

async function resolveUserId(optionalUserId?: string): Promise<string | null> {
  if (optionalUserId) {
    return optionalUserId;
  }
  return getCurrentUserId();
}

async function checkUserHasBusinessInfo(userId: string): Promise<ServiceResult<boolean>> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("business_info")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return fail(error.message, error.code, error);
    }

    return ok(Boolean(data));
  } catch (error) {
    return fail("No se pudo validar datos de negocio", "ONBOARDING_CHECK_BUSINESS_INFO_ERROR", error);
  }
}

class OnboardingServiceImpl implements OnboardingService {
  async getUserProgress(userId?: string): Promise<ServiceResult<OnboardingProgress | null>> {
    try {
      const resolvedUserId = await resolveUserId(userId);
      if (!resolvedUserId) {
        return ok(null);
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", resolvedUserId)
        .maybeSingle();

      if (error) {
        return fail(error.message, error.code, error);
      }

      return ok(data ? mapProgressRow(data) : null);
    } catch (error) {
      return fail("No se pudo obtener progreso de onboarding", "ONBOARDING_GET_PROGRESS_ERROR", error);
    }
  }

  async createUserProgress(userId?: string): Promise<ServiceResult<OnboardingProgress>> {
    try {
      const resolvedUserId = await resolveUserId(userId);
      if (!resolvedUserId) {
        return fail("Usuario no autenticado", "AUTH_REQUIRED");
      }

      const [hasBusinessInfoResult, hasClientsResult, hasCustomizedResult, hasIssuedInvoiceResult] = await Promise.all([
        checkUserHasBusinessInfo(resolvedUserId),
        this.checkUserHasClients(resolvedUserId),
        this.checkUserHasCustomizedInvoice(resolvedUserId),
        this.checkUserHasIssuedInvoice(resolvedUserId),
      ]);

      if (!hasBusinessInfoResult.success) {
        return fail(hasBusinessInfoResult.error.message, hasBusinessInfoResult.error.code, hasBusinessInfoResult.error.cause);
      }
      if (!hasClientsResult.success) {
        return fail(hasClientsResult.error.message, hasClientsResult.error.code, hasClientsResult.error.cause);
      }
      if (!hasCustomizedResult.success) {
        return fail(hasCustomizedResult.error.message, hasCustomizedResult.error.code, hasCustomizedResult.error.cause);
      }
      if (!hasIssuedInvoiceResult.success) {
        return fail(hasIssuedInvoiceResult.error.message, hasIssuedInvoiceResult.error.code, hasIssuedInvoiceResult.error.cause);
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("user_progress")
        .insert([
          {
            user_id: resolvedUserId,
            step1_business_info: hasBusinessInfoResult.data,
            step2_first_client: hasClientsResult.data,
            step3_customize_invoice: hasCustomizedResult.data,
            step4_first_invoice: hasIssuedInvoiceResult.data,
          },
        ])
        .select("*")
        .single();

      if (error) {
        return fail(error.message, error.code, error);
      }

      return ok(mapProgressRow(data));
    } catch (error) {
      return fail("No se pudo crear progreso de onboarding", "ONBOARDING_CREATE_PROGRESS_ERROR", error);
    }
  }

  async updateStep(userId: string, stepNumber: 1 | 2 | 3 | 4, completed = true): Promise<ServiceResult<OnboardingProgress>> {
    try {
      if (!userId) {
        return fail("ID de usuario obligatorio", "VALIDATION_USER_ID_REQUIRED");
      }
      const current = await this.getUserProgress(userId);
      if (!current.success) {
        return fail(current.error.message, current.error.code, current.error.cause);
      }
      if (!current.data) {
        const created = await this.createUserProgress(userId);
        if (!created.success) {
          return fail(created.error.message, created.error.code, created.error.cause);
        }
      }

      const supabase = getSupabaseClient();
      const columnName = STEP_COLUMN_BY_NUMBER[stepNumber];
      const { data, error } = await supabase
        .from("user_progress")
        .update({ [columnName]: completed })
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error) {
        return fail(error.message, error.code, error);
      }

      return ok(mapProgressRow(data));
    } catch (error) {
      return fail("No se pudo actualizar paso de onboarding", "ONBOARDING_UPDATE_STEP_ERROR", error);
    }
  }

  async checkUserHasClients(userId: string): Promise<ServiceResult<boolean>> {
    try {
      const supabase = getSupabaseClient();
      const { count, error } = await supabase.from("clientes").select("id", { count: "exact", head: true }).eq("user_id", userId);

      if (error) {
        return fail(error.message, error.code, error);
      }

      return ok((count ?? 0) > 0);
    } catch (error) {
      return fail("No se pudo validar clientes del usuario", "ONBOARDING_CHECK_CLIENTS_ERROR", error);
    }
  }

  async checkUserHasCustomizedInvoice(userId: string): Promise<ServiceResult<boolean>> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("business_info")
        .select("brand_color, invoice_image_url")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        return fail(error.message, error.code, error);
      }

      if (!data) {
        return ok(false);
      }

      const hasLogo = Boolean(data.invoice_image_url);
      const hasCustomColor = Boolean(data.brand_color) && String(data.brand_color).toUpperCase() !== "#000000";
      return ok(hasLogo || hasCustomColor);
    } catch (error) {
      return fail("No se pudo validar personalizacion de factura", "ONBOARDING_CHECK_CUSTOM_INVOICE_ERROR", error);
    }
  }

  async checkUserHasIssuedInvoice(userId: string): Promise<ServiceResult<boolean>> {
    try {
      const supabase = getSupabaseClient();
      const { count, error } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "issued");

      if (error) {
        return fail(error.message, error.code, error);
      }

      return ok((count ?? 0) > 0);
    } catch (error) {
      return fail("No se pudo validar facturas emitidas", "ONBOARDING_CHECK_ISSUED_INVOICES_ERROR", error);
    }
  }

  calculateProgress(progress: OnboardingProgress | null): ProgressSummary {
    return calculateSummary(progress);
  }
}

export const onboardingService = new OnboardingServiceImpl();
