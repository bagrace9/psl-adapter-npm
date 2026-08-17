import { randomUUID } from "crypto";

export type NpmServerConfig = {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  verifyTls?: boolean;
};

export type NpmHost = {
  id: number;
  domain_names?: string[];
  name?: string;
  forward_host?: string;
  forward_port?: number;
  protocol?: "http" | "https";
  enabled?: boolean;
  certificate_id?: number;
  [key: string]: unknown;
};

export type PslService = {
  id: string;
  name: string;
  description?: string;
  url?: string;
  ip?: string;
  port?: number;
  status?: string;
  healthCheck?: {
    type?: string;
    path?: string;
    port?: number;
  };
  [key: string]: unknown;
};

export type NpmProxyCreateRequest = {
  domain_names: string[];
  forward_host: string;
  forward_port: number;
  protocol?: "http" | "https";
  enabled?: boolean;
  certificate_id?: number;
  ssl?: boolean;
  access_list_id?: number;
  http2_support?: boolean;
  custom_locations?: Array<{
    path: string;
    forward_host: string;
    forward_port: number;
    protocol?: "http" | "https";
    ssl?: boolean;
  }>;
};

export type NpmAdapterOptions = {
  servers: NpmServerConfig[];
  services?: PslService[];
  defaultProtocol?: "http" | "https";
  defaultEnabled?: boolean;
  verifyTls?: boolean;
};

export type NpmCreateResult = {
  serverId: string;
  serverName: string;
  proxyId?: number;
  host?: string;
  domain: string;
  created: boolean;
  status: "created" | "exists" | "error";
  message: string;
};

// Adapter interface
export interface PslAdapter {
  id: string;
  displayName: string;
  configSchema?: any[];
  testConnection?: (config: Record<string, any>) => Promise<boolean>;
  sync?: (apps: any[], config: Record<string, any>) => Promise<any>;
}

const DEFAULT_TIMEOUT_MS = 15000;

function normalizeBaseUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("NPM server URL is required.");
  }

  return trimmed.replace(/\/+$/, "");
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);

    promise
      .then((value) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(error);
      });
  });
}

async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await withTimeout(fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  }));

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`NPM request failed (${response.status}): ${text || response.statusText || "Unknown error"}`);
  }

  return (await response.json()) as T;
}

export function createNpmServerConfig(input: Partial<NpmServerConfig> & Pick<NpmServerConfig, "id" | "name" | "url">): NpmServerConfig {
  return {
    id: input.id,
    name: input.name,
    url: normalizeBaseUrl(input.url),
    apiKey: input.apiKey,
    username: input.username,
    password: input.password,
    ssl: input.ssl ?? false,
    verifyTls: input.verifyTls ?? true,
  };
}

export function getNpmApiHeaders(server: NpmServerConfig): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (server.apiKey) {
    headers["X-API-Key"] = server.apiKey;
  }

  return headers;
}

export async function listNpmHosts(server: NpmServerConfig): Promise<NpmHost[]> {
  const baseUrl = normalizeBaseUrl(server.url);
  const url = `${baseUrl}/api/nginx/proxy-hosts`;
  const data = await fetchJson<{ data?: NpmHost[] }>(url, {
    method: "GET",
    headers: getNpmApiHeaders(server),
  });

  return data.data ?? [];
}

function buildProxyHostFromService(service: PslService): NpmProxyCreateRequest {
  const domain = (service.url ?? service.name ?? "localhost")
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .split(/[\/\?#]/)[0]
    .trim();

  const forwardHost = service.ip ?? "127.0.0.1";
  const forwardPort = service.port ?? service.healthCheck?.port ?? 80;

  return {
    domain_names: [domain],
    forward_host: forwardHost,
    forward_port: forwardPort,
    protocol: "http",
    enabled: true,
    ssl: false,
    http2_support: true,
    custom_locations: [],
  };
}

async function isHostPresent(server: NpmServerConfig, domain: string): Promise<boolean> {
  const hosts = await listNpmHosts(server);
  return hosts.some((host) => {
    const names = (host.domain_names ?? []).map((item) => String(item).toLowerCase());
    const name = String(host.name ?? "").toLowerCase();
    return names.includes(domain.toLowerCase()) || name === domain.toLowerCase();
  });
}

export async function connectNpmServer(serverConfig: NpmServerConfig): Promise<{ ok: boolean; server: NpmServerConfig; message: string; }> {
  const baseUrl = normalizeBaseUrl(serverConfig.url);

  try {
    await fetchJson<{ status?: string }>(`${baseUrl}/api/tokens`, {
      method: "GET",
      headers: getNpmApiHeaders(serverConfig),
    });
    return { ok: true, server: serverConfig, message: `Connected to NPM server ${serverConfig.name}.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { ok: false, server: serverConfig, message: `Unable to connect to NPM server ${serverConfig.name}: ${message}` };
  }
}

export async function discoverNpmServices(server: NpmServerConfig): Promise<PslService[]> {
  const hosts = await listNpmHosts(server);

  return hosts
    .filter((host) => host.enabled !== false)
    .map((host) => ({
      id: String(host.id ?? host.name ?? host.domain_names?.[0] ?? randomUUID()),
      name: host.name ?? host.domain_names?.[0] ?? "npm-host",
      description: "Managed by Nginx Proxy Manager",
      url: host.domain_names?.[0],
      ip: host.forward_host,
      port: host.forward_port,
      status: host.enabled ? "enabled" : "disabled",
      healthCheck: {
        type: "http",
        path: "/",
        port: host.forward_port,
      },
    }));
}

export async function createNpmProxyForService(server: NpmServerConfig, service: PslService): Promise<NpmCreateResult> {
  const domain = (service.url ?? service.name ?? "localhost")
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "")
    .split(/[\/\?#]/)[0]
    .trim();

  if (!domain) {
    return {
      serverId: server.id,
      serverName: server.name,
      domain: "",
      created: false,
      status: "error",
      message: "Service URL or name is required to create an NPM proxy.",
    };
  }

  const existing = await isHostPresent(server, domain);
  if (existing) {
    return {
      serverId: server.id,
      serverName: server.name,
      domain,
      created: false,
      status: "exists",
      message: `Proxy for ${domain} already exists on ${server.name}.`,
    };
  }

  const payload = buildProxyHostFromService(service);
  payload.domain_names = [domain];

  const baseUrl = normalizeBaseUrl(server.url);

  try {
    const response = await fetchJson<{ id?: number; host?: { name?: string } }>(`${baseUrl}/api/nginx/proxy-hosts`, {
      method: "POST",
      headers: getNpmApiHeaders(server),
      body: JSON.stringify(payload),
    });

    return {
      serverId: server.id,
      serverName: server.name,
      proxyId: response.id,
      host: response.host?.name,
      domain,
      created: true,
      status: "created",
      message: `Created proxy for ${domain} on ${server.name}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      serverId: server.id,
      serverName: server.name,
      domain,
      created: false,
      status: "error",
      message: `Failed to create proxy for ${domain} on ${server.name}: ${message}`,
    };
  }
}

export async function syncPslServicesToNpm(options: NpmAdapterOptions): Promise<NpmCreateResult[]> {
  const results: NpmCreateResult[] = [];

  for (const server of options.servers) {
    for (const service of options.services ?? []) {
      const result = await createNpmProxyForService(server, service);
      results.push(result);
    }
  }

  return results;
}

export default {
  id: "psl-adapter-npm",
  displayName: "Nginx Proxy Manager",
  configSchema: [
    {
      name: "servers",
      type: "array",
      description: "NPM servers to manage",
      required: true,
    },
  ],
  async testConnection(config: Record<string, any>): Promise<boolean> {
    try {
      const servers = config.servers as NpmServerConfig[] | undefined;
      if (!servers || !Array.isArray(servers) || servers.length === 0) {
        throw new Error("No servers configured");
      }
      const result = await connectNpmServer(servers[0]);
      return result.ok;
    } catch (error) {
      console.error("NPM test connection failed:", error);
      return false;
    }
  },
  async sync(apps: any[], config: Record<string, any>): Promise<any> {
    try {
      const servers = config.servers as NpmServerConfig[] | undefined;
      if (!servers || !Array.isArray(servers)) {
        return { error: "No servers configured" };
      }
      const services: PslService[] = apps.map((app: any) => ({
        id: String(app.id),
        name: app.name,
        description: app.description,
        url: app.host ? `http://${app.host}:${app.port || 80}` : undefined,
        ip: app.host,
        port: app.port,
      }));
      const results = await syncPslServicesToNpm({ servers, services });
      return { synced: results.length, results };
    } catch (error) {
      console.error("NPM sync failed:", error);
      return { error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
} as PslAdapter;
