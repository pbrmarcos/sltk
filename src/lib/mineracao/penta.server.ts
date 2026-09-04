/**
 * Cliente server-only da API Penta-Transaction (api-v2).
 *
 * Regras da especificação implementadas aqui:
 *  - todo endpoint recebe o header `Key` derivado da data UTC atual;
 *  - autenticação Bearer com o token obtido no /login;
 *  - intervalo mínimo entre chamadas (>= 500 ms), configurável;
 *  - o formato de resposta é sempre { success, error, data }.
 */

/** Chave externa fornecida pelo provedor; pode ser sobrescrita por variável de ambiente. */
function externalKey(): string {
  return process.env["PENTA_EXTERNAL_KEY"] || "ext$rn4_K$y!";
}

/** Log de diagnóstico (nunca inclui a senha). */
function logCall(url: string, headers: Record<string, string>, body?: unknown) {
  const safeBody =
    body && typeof body === "object"
      ? JSON.stringify({ ...(body as Record<string, unknown>), password: "***" })
      : undefined;
  console.info(
    `[penta] ${url} headers=${JSON.stringify({ ...headers, Authorization: headers["Authorization"] ? "Bearer ***" : undefined })}` +
      (safeBody ? ` body=${safeBody}` : ""),
  );
}

export type PentaCredentials = {
  baseUrl: string;
  usuario: string;
  senha: string;
  delayMs: number;
};

export type PentaBase = {
  keyCountry: { key: string; value: string };
  keyOperation: string;
  keyVersion: number;
  title: string;
  hasTariffCodes: boolean;
  hasCompanies: boolean;
  updatedDate: string;
  startDate: string;
  active: boolean;
  underMaintenance: boolean;
  enabled: boolean;
  queryLimit: number;
  parameters?: Array<{
    name: string;
    title: string;
    type: "text" | "number" | "keyValue";
    multiple: boolean;
  }>;
};

export type PentaRestrictions = {
  name: string;
  email: string;
  totalCountriesAllowed: number;
  totalTariffCodesAllowed: number;
  totalCompaniesAllowed: number;
  startDate: string;
  endDate: string;
  serviceState: string;
  basesQueried: string[];
  tariffCodesQueried: string[];
  companiesQueried: Array<{
    companyKey: number;
    companyName: string;
    keyCountry: string;
    keyOperation: string;
    keyVersion: number;
  }>;
};

export type PentaOperations = {
  columns: Array<{ name: string; title: string; type: string; positionInRow: number }>;
  rows: Array<{ values: Array<string | number | null> }>;
};

/** Header `Key`: base64( (dia + mês + ano + hora, em UTC) + chave externa ). */
export function buildKeyHeader(now = new Date()): string {
  const keyNumber =
    now.getUTCDate() + (now.getUTCMonth() + 1) + now.getUTCFullYear() + now.getUTCHours();
  const raw = `${keyNumber}${externalKey()}`;
  return Buffer.from(raw, "utf-8").toString("base64");
}

/** O provedor devolve `error` ora como texto, ora como objeto { message }. */
/** Extrai o texto bruto do erro devolvido pelo provedor. */
function rawErrorText(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error.trim() || null;
  const e = error as {
    message?: string;
    exceptionMessage?: string;
    description?: string;
    detail?: string;
    name?: string;
    code?: string | number;
    errors?: unknown;
  };
  const partes = [e.message, e.exceptionMessage, e.description, e.detail, e.name]
    .filter((t): t is string => typeof t === "string" && t.trim() !== "");
  if (partes.length) return partes.join(" — ");
  if (Array.isArray(e.errors) && e.errors.length) {
    return e.errors.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("; ");
  }
  try {
    const s = JSON.stringify(error);
    return s && s !== "{}" ? s.slice(0, 300) : null;
  } catch {
    return null;
  }
}

/**
 * Traduz a recusa do provedor em uma mensagem clara, dizendo o que aconteceu
 * e o que o usuário pode fazer. Mantém o texto original entre parênteses para
 * suporte quando não reconhecemos o caso.
 */
function pentaErrorMessage(error: unknown, status?: number): string | null {
  let texto = rawErrorText(error);
  // O provedor às vezes prefixa o tipo interno ("Async") ao motivo real.
  if (texto) texto = texto.replace(/^\s*async\s*[—\-:]\s*/i, "").trim() || null;

  const detalhe = texto ? ` (detalhe do provedor: ${texto.slice(0, 200)})` : "";

  if (texto) {
    // Consulta grande demais para o modo síncrono.
    if (/^\s*async\s*$/i.test(texto) || /asynchron/i.test(texto)) {
      return (
        "Consulta grande demais para o provedor responder na hora. " +
        "Reduza o período (ex.: 1 a 3 meses), use menos NCMs por busca ou aplique filtros adicionais."
      );
    }
    if (/fora do intervalo|per[ií]odo|rango de fecha|date range/i.test(texto)) {
      return (
        "O período consultado está fora da vigência desta base. " +
        "Ajuste as datas de início e fim para o intervalo disponível da base." + detalhe
      );
    }
    if (/limit|quota|exceed|excedid|cota/i.test(texto)) {
      return (
        "Limite do contrato com o provedor atingido (consultas, bases, NCMs ou empresas). " +
        "Clique em “Atualizar” nos indicadores para ver o consumo real do plano." + detalhe
      );
    }
    if (/maintenance|manuten/i.test(texto)) {
      return "Esta base está em manutenção no provedor. Tente outra base ou repita mais tarde." + detalhe;
    }
    if (/not\s*found|inexist|no data|sem dados/i.test(texto)) {
      return "O provedor não encontrou dados para esses filtros. Revise base, período e NCM." + detalhe;
    }
    if (/permission|not allowed|unauthorized|forbidden|acesso/i.test(texto)) {
      return (
        "O contrato atual não dá acesso a esta base ou a estes campos. " +
        "Escolha outra base ou fale com a administração." + detalhe
      );
    }
    if (/invalid|inválid|required|obrigat|format/i.test(texto)) {
      return "O provedor recusou os parâmetros da busca. Confira base, período (início/fim) e o código NCM." + detalhe;
    }
    if (/timeout|time out|tempo/i.test(texto)) {
      return "O provedor demorou demais para responder. Reduza o período e tente novamente." + detalhe;
    }
  }

  if (status === 429) {
    return "Muitas consultas em sequência ao provedor. Aguarde alguns segundos e tente de novo." + detalhe;
  }
  if (status && status >= 500) {
    return "O serviço do provedor está instável no momento. Tente novamente em alguns minutos." + detalhe;
  }
  return texto;
}



export class PentaError extends Error {
  readonly status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "PentaError";
    this.status = status;
  }
}

const tokenCache = new Map<
  string,
  { token: string; refreshToken?: string; expiresAt: number }
>();
let lastCallAt = 0;

/**
 * Fila serial: qualquer chamada ao provedor entra numa única cadeia de
 * promessas, garantindo o intervalo mínimo entre requisições mesmo quando
 * vários NCMs/países são consultados na mesma busca.
 */
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(delayMs: number, task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(500, delayMs) - (Date.now() - lastCallAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCallAt = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

async function pentaFetch<T>(
  creds: PentaCredentials,
  path: string,
  init: { method?: "GET" | "POST"; body?: unknown; token?: string; query?: Record<string, string | undefined> },
  retried = false,
): Promise<T> {
  const url = new URL(`${creds.baseUrl.replace(/\/+$/, "")}${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Key: buildKeyHeader(),
  };
  if (init.token) headers["Authorization"] = `Bearer ${init.token}`;
  logCall(url.toString(), headers, init.body);

  let res: Response;
  try {
    res = await enqueue(creds.delayMs, () =>
      fetch(url.toString(), {
        method: init.method ?? "GET",
        headers,
        body: init.body ? JSON.stringify(init.body) : undefined,
      }),
    );
  } catch {
    throw new PentaError("Não foi possível falar com o provedor de mineração (sem resposta da rede). Verifique o endereço do serviço em Administração › Mineração ou tente novamente em instantes.", 503);
  }

  if (res.status === 401 || res.status === 403) {
    // Token expirado: tenta o refresh e, em último caso, novo login.
    if (!retried && init.token) {
      const token = await pentaRefreshOrLogin(creds);
      return pentaFetch<T>(creds, path, { ...init, token }, true);
    }
    throw new PentaError("O provedor recusou as credenciais da mineração (sessão expirada ou usuário/senha inválidos). Peça à administração para revisar e testar a conexão.", 401);
  }


  type Envelope = { success?: boolean; error?: unknown; data?: T };
  let json: Envelope | null;
  try {
    json = (await res.json()) as Envelope;
  } catch {
    throw new PentaError(`O provedor devolveu uma resposta em formato inesperado (código ${res.status}). Tente novamente em alguns minutos.`, 502);
  }
  if (!res.ok || !json || json.success !== true) {
    console.warn(`[penta] recusa ${res.status} ${path}: ${JSON.stringify(json?.error)?.slice(0, 500)}`);
    throw new PentaError(
      pentaErrorMessage(json?.error, res.status) ||
        `O provedor recusou a consulta (código ${res.status}). Revise base, período e NCM e tente novamente.`,
      502,
    );

  }

  return json.data as T;
}




/** Login tolerante ao formato de resposta (accessToken pode vir na raiz). */
export async function pentaLoginRaw(creds: PentaCredentials): Promise<string> {
  const cacheKey = `${creds.baseUrl}|${creds.usuario}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  let res: Response;
  const loginUrl = `${creds.baseUrl.replace(/\/+$/, "")}/login`;
  try {
    const loginHeaders = { "Content-Type": "application/json", Key: buildKeyHeader() };
    const loginBody = {
      username: creds.usuario,
      password: creds.senha,
      language: "pt",
      system: "penta",
    };
    logCall(loginUrl, loginHeaders, loginBody);
    res = await enqueue(creds.delayMs, () =>
      fetch(loginUrl, {
        method: "POST",
        headers: loginHeaders,
        body: JSON.stringify(loginBody),
      }),
    );
  } catch {
    throw new PentaError("Não foi possível falar com o provedor de mineração (sem resposta da rede). Verifique o endereço do serviço em Administração › Mineração ou tente novamente em instantes.", 503);
  }
  const json = (await res.json().catch(() => null)) as
    | {
        success?: boolean;
        error?: unknown;
        accessToken?: string;
        refreshToken?: string;
        data?: { accessToken?: string; refreshToken?: string };
      }
    | null;
  if (!res.ok || !json || json.success === false) {
    throw new PentaError(
      pentaErrorMessage(json?.error, res.status) ||
        "Usuário ou senha da mineração inválidos. Ajuste em Administração › Mineração e teste a conexão.",

      401,
    );
  }
  const token = json.accessToken ?? json.data?.accessToken;
  if (!token) throw new PentaError("O serviço de mineração não devolveu um token válido.", 502);
  const refreshToken = json.refreshToken ?? json.data?.refreshToken;
  tokenCache.set(cacheKey, {
    token,
    ...(refreshToken ? { refreshToken } : {}),
    expiresAt: Date.now() + 20 * 60 * 1000,
  });
  return token;
}

/**
 * Tenta renovar a sessão pelo refreshToken antes de refazer o login completo.
 * Se o provedor não expuser o endpoint de refresh, cai para o login.
 */
async function pentaRefreshOrLogin(creds: PentaCredentials): Promise<string> {
  const cacheKey = `${creds.baseUrl}|${creds.usuario}`;
  const cached = tokenCache.get(cacheKey);
  tokenCache.delete(cacheKey);

  if (cached?.refreshToken) {
    try {
      const url = `${creds.baseUrl.replace(/\/+$/, "")}/refresh-token`;
      const headers = { "Content-Type": "application/json", Key: buildKeyHeader() };
      const res = await enqueue(creds.delayMs, () =>
        fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ refreshToken: cached.refreshToken }),
        }),
      );
      const json = (await res.json().catch(() => null)) as
        | {
            success?: boolean;
            accessToken?: string;
            refreshToken?: string;
            data?: { accessToken?: string; refreshToken?: string };
          }
        | null;
      const token = json?.accessToken ?? json?.data?.accessToken;
      if (res.ok && json?.success !== false && token) {
        const refreshToken = json?.refreshToken ?? json?.data?.refreshToken ?? cached.refreshToken;
        tokenCache.set(cacheKey, {
          token,
          refreshToken,
          expiresAt: Date.now() + 20 * 60 * 1000,
        });
        return token;
      }
    } catch {
      // silencioso: cai para o login completo
    }
  }
  return pentaLoginRaw(creds);
}


export async function pentaCountries(creds: PentaCredentials) {
  const token = await pentaLoginRaw(creds);
  return pentaFetch<Array<{ key: string; value: string }>>(
    creds,
    "/operatives/available-countries",
    { token },
  );
}

export async function pentaBases(creds: PentaCredentials, country?: string) {
  const token = await pentaLoginRaw(creds);
  return pentaFetch<PentaBase[]>(creds, "/operatives/available-bases", {
    token,
    query: { country },
  });
}

export async function pentaRestrictions(creds: PentaCredentials) {
  const token = await pentaLoginRaw(creds);
  return pentaFetch<PentaRestrictions>(creds, "/restrictions", { token });
}

export async function pentaParameterSupport(
  creds: PentaCredentials,
  args: {
    keyCountry: string;
    keyOperation: string;
    keyVersion: number;
    parameterName: string;
    filter: string;
    searchType?: "startsWith" | "contains";
  },
) {
  const token = await pentaLoginRaw(creds);
  const data = await pentaFetch<{ data: Array<{ key: string; value: string }> }>(
    creds,
    "/parameter-support",
    {
      token,
      query: {
        keyCountry: args.keyCountry,
        keyOperation: args.keyOperation,
        keyVersion: String(args.keyVersion),
        parameterName: args.parameterName,
        filter: args.filter,
        searchType: args.searchType ?? "contains",
      },
    },
  );
  return data?.data ?? [];
}

export async function pentaOperations(
  creds: PentaCredentials,
  body: {
    keyCountry: string;
    keyOperation: string;
    keyVersion: number;
    startDate: string;
    endDate: string;
    personalizedColumns?: string[];
    parameters: Array<{
      name: string;
      title?: string;
      value: unknown;
      value2?: unknown;
      type: string;
      multiple: boolean;
    }>;
  },
) {
  const token = await pentaLoginRaw(creds);
  return pentaFetch<PentaOperations>(creds, "/operations", {
    method: "POST",
    token,
    body: { value2: null, ...body },
  });
}
