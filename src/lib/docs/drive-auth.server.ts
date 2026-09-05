/**
 * Resolve autenticação e base URL para chamadas à API do Google Drive via
 * conta de serviço direta (`GOOGLE_SERVICE_ACCOUNT_EMAIL` +
 * `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`). Usado por `drive.server.ts` e pelos
 * módulos de anexos que ainda montam suas próprias chamadas à API do Drive.
 */
import {
  getGoogleAccessToken,
  serviceAccountConfigured,
} from "@/lib/google-service-account.server";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const DIRECT_BASE = "https://www.googleapis.com";

export function driveConfigured(): boolean {
  return serviceAccountConfigured();
}

export interface DriveAuth {
  baseUrl: string;
  headers: Record<string, string>;
}

export async function driveAuth(): Promise<DriveAuth> {
  const token = await getGoogleAccessToken(DRIVE_SCOPE);
  if (!token) {
    const err = new Error(
      "Google Drive indisponível — a integração não está configurada. Os documentos continuam sendo gerados e podem ser baixados normalmente.",
    );
    err.name = "CapabilityUnavailableError";
    throw err;
  }
  return { baseUrl: DIRECT_BASE, headers: { Authorization: `Bearer ${token}` } };
}
