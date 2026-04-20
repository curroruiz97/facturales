import { getCurrentUserId, getSupabaseClient } from "../supabase/client";
import { fail, ok, type ServiceResult } from "../../shared/types/service-result";

export type SupportPriority = "low" | "medium" | "high";

export interface SupportTicketInput {
  subject: string;
  message: string;
  priority: SupportPriority;
}

export interface SupportTicketResponse {
  ticketId: string | null;
}

export interface SupportTicketService {
  submitTicket(input: SupportTicketInput): Promise<ServiceResult<SupportTicketResponse>>;
}

const SUPPORT_SUBJECT_MAX = 180;
const SUPPORT_MESSAGE_MIN = 20;
const SUPPORT_MESSAGE_MAX = 6000;

function sanitizeText(value: string): string {
  return value
    .trim()
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ");
}

export class DefaultSupportTicketService implements SupportTicketService {
  async submitTicket(input: SupportTicketInput): Promise<ServiceResult<SupportTicketResponse>> {
    try {
      const subject = sanitizeText(input.subject);
      const message = sanitizeText(input.message);
      if (!subject) return fail("El asunto es obligatorio.", "VALIDATION_SUPPORT_SUBJECT_REQUIRED");
      if (!message) return fail("El mensaje es obligatorio.", "VALIDATION_SUPPORT_MESSAGE_REQUIRED");
      if (subject.length > SUPPORT_SUBJECT_MAX) {
        return fail(`El asunto no puede superar ${SUPPORT_SUBJECT_MAX} caracteres.`, "VALIDATION_SUPPORT_SUBJECT_TOO_LONG");
      }
      if (message.length < SUPPORT_MESSAGE_MIN) {
        return fail(`El mensaje debe tener al menos ${SUPPORT_MESSAGE_MIN} caracteres.`, "VALIDATION_SUPPORT_MESSAGE_TOO_SHORT");
      }
      if (message.length > SUPPORT_MESSAGE_MAX) {
        return fail(`El mensaje no puede superar ${SUPPORT_MESSAGE_MAX} caracteres.`, "VALIDATION_SUPPORT_MESSAGE_TOO_LONG");
      }

      const userId = await getCurrentUserId();
      if (!userId) return fail("Usuario no autenticado.", "AUTH_REQUIRED");

      const supabase = getSupabaseClient();
      const payload = {
        user_id: userId,
        subject,
        message,
        priority: input.priority,
      };

      const edgeResponse = await supabase.functions.invoke("send-support-ticket", { body: payload });
      if (!edgeResponse.error) {
        const ticketId = (edgeResponse.data as { ticket_id?: string } | null)?.ticket_id ?? null;
        return ok({ ticketId });
      }

      const { data, error } = await supabase
        .from("support_tickets")
        .insert([payload])
        .select("id")
        .single();
      if (error) return fail(error.message, error.code, error);
      return ok({ ticketId: (data as { id?: string } | null)?.id ?? null });
    } catch (error) {
      return fail("No se pudo enviar el ticket.", "SUPPORT_TICKET_SUBMIT_ERROR", error);
    }
  }
}

export const supportTicketService = new DefaultSupportTicketService();
