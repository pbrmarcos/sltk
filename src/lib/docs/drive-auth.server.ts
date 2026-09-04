/**
 * Resolve autenticação e base URL para chamadas à API do Google Drive,
 * preferindo a conta de serviço direta (`GOOGLE_SERVICE_ACCOUNT_EMAIL` +
 * `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`) e caindo para o connector gateway
 * da Lovable (`LOVABLE_API_KEY` + `GOOGLE_DRIVE_API_KEY`) só quando a conta
 * de serviço não estiver configurada. Usado por `drive.server.ts` e pelos
 * módulos de anexos que ainda montam suas próprias chamadas à API do Drive.
 */
import { getGoogleAccessToken, serviceAccountConfigured } from "@/lib/google-service-account.server";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const DIRECT_BASE = "https://www.googleapis.com";
const GATEWAY_BASE = "https://connector-gateway.lovable.dev/google_drive";

export function driveConfigured(): boolean {
  return serviceAccountConfigured() || !!(process.env.LOVABLE_API_KEY && process.env.GOOGLE_DRIVE_API_KEY);
}

export interface DriveAuth {
  baseUrl: string;
  headers: Record<string, string>;
}

export async function driveAuth(): Promise<DriveAuth> {
  const token = await getGoogleAccessToken(DRIVE_SCOPE);
  if (token) {
    return { baseUrl: DIRECT_BASE, headers: { Authorization: `Bearer ${token}` } };
  }

  const lov = process.env.LOVABLE_API_KEY;
  const drv = process.env.GOOGLE_DRIVE_API_KEY;
  if (!lov || !drv) {
    const err = new Error(
      "Google Drive indisponível — a integração não está configurada. Os documentos continuam sendo gerados e podem ser baixados normalmente.",
    );
    err.name = "CapabilityUnavailableError";
    throw err;
  }
  return {
    baseUrl: GATEWAY_BASE,
    headers: { Authorization: `Bearer ${lov}`, "X-Connection-Api-Key": drv },
  };
}
