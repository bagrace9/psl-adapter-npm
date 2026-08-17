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

export type NpmDnsNameConfig = {
  id: string;
  serverId: string;
  hostname: string;
  targetHost: string;
  targetPort: number;
  protocol?: "http" | "https";
  enabled?: boolean;
  ssl?: boolean;
  description?: string;
};

export type NpmUiConfig = {
  servers: NpmServerConfig[];
  dnsNames: NpmDnsNameConfig[];
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
  dnsNames?: NpmDnsNameConfig[];
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
  configSchema?: ReadonlyArray<any>;
  defaultConfig?: Record<string, any>;
  // Whether the app should allow saving more than one named configuration of this adapter.
  // Adapters that only ever talk to a single destination should set this to false.
  supportsMultiple?: boolean;
  testConnection?: (config: Record<string, any>) => Promise<boolean>;
  sync?: (apps: any[], config: Record<string, any>) => Promise<any>;
}

export const npmDefaultConfig: NpmUiConfig = {
  servers: [],
  dnsNames: [],
};

export const npmConfigSchema = [
  {
    key: "servers",
    label: "NPM Servers",
    type: "array",
    description: "Manage one or more Nginx Proxy Manager servers.",
    defaultValue: [],
    itemSchema: [
      { key: "id", label: "ID", type: "text", placeholder: "npm-1" },
      { key: "name", label: "Server Name", type: "text", placeholder: "Home NPM" },
      { key: "url", label: "Base URL", type: "text", placeholder: "https://npm.example.com" },
      { key: "apiKey", label: "API Key", type: "password", placeholder: "Optional API key" },
      { key: "username", label: "Username", type: "text", placeholder: "Optional username" },
      { key: "password", label: "Password", type: "password", placeholder: "Optional password" },
      { key: "ssl", label: "SSL Enabled", type: "boolean", defaultValue: false },
      { key: "verifyTls", label: "Verify TLS", type: "boolean", defaultValue: false },
    ],
  },
  {
    key: "dnsNames",
    label: "DNS Names",
    type: "array",
    description: "Manage the hostnames and internal targets that should be proxied through each NPM server.",
    defaultValue: [],
    itemSchema: [
      { key: "id", label: "ID", type: "text", placeholder: "dns-1" },
      { key: "serverId", label: "Server", type: "select", placeholder: "Select server", optionsKey: "servers" },
      { key: "hostname", label: "Hostname", type: "text", placeholder: "app.example.com" },
      { key: "targetHost", label: "Target Host", type: "text", placeholder: "10.0.0.21" },
      { key: "targetPort", label: "Target Port", type: "number", placeholder: "3000" },
      { key: "protocol", label: "Protocol", type: "select", defaultValue: "http", options: ["http", "https"] },
      { key: "enabled", label: "Enabled", type: "boolean", defaultValue: true },
      { key: "ssl", label: "SSL on Proxy", type: "boolean", defaultValue: false },
      { key: "description", label: "Description", type: "text", placeholder: "Optional notes" },
    ],
  },
];

export const npmFormDefinition = {
  title: "Nginx Proxy Manager",
  description: "Manage one or more NPM servers and the DNS hostnames that should be proxied to local services.",
  testAction: {
    label: "Test Connection",
    mode: "draft",
    target: "currentForm",
    description: "Tests the unsaved server draft before it is saved.",
  },
  sections: [
    {
      key: "servers",
      title: "NPM Servers",
      type: "list",
      description: "Add the base URLs for each NPM instance that should receive proxied services.",
      formMode: "create-edit",
      actions: [
        { id: "test-connection", label: "Test Connection", mode: "draft", target: "currentForm" },
        { id: "save-server", label: "Save", mode: "save" },
      ],
      fields: [
        { key: "name", label: "Server Name", type: "text", required: true, placeholder: "Home NPM" },
        { key: "url", label: "Base URL", type: "url", required: true, placeholder: "https://npm.example.com" },
        { key: "apiKey", label: "API Key", type: "password", placeholder: "Optional API key" },
        { key: "username", label: "Username", type: "text", placeholder: "Optional username" },
        { key: "password", label: "Password", type: "password", placeholder: "Optional password" },
        { key: "ssl", label: "SSL Enabled", type: "checkbox", defaultValue: false },
        { key: "verifyTls", label: "Verify TLS", type: "checkbox", defaultValue: false },
      ],
    },
    {
      key: "dnsNames",
      title: "DNS Names",
      type: "list",
      description: "Assign public hostnames to the internal service target for each server.",
      formMode: "create-edit",
      actions: [
        { id: "test-connection", label: "Test Connection", mode: "draft", target: "currentForm" },
        { id: "save-dns-name", label: "Save", mode: "save" },
      ],
      fields: [
        { key: "serverId", label: "NPM Server", type: "select", required: true, source: "servers", valueKey: "id", labelKey: "name" },
        { key: "hostname", label: "Hostname", type: "text", required: true, placeholder: "app.example.com" },
        { key: "targetHost", label: "Target Host", type: "text", required: true, placeholder: "10.0.0.21" },
        { key: "targetPort", label: "Target Port", type: "number", required: true, placeholder: "3000" },
        { key: "protocol", label: "Protocol", type: "select", defaultValue: "http", options: ["http", "https"] },
        { key: "enabled", label: "Enabled", type: "checkbox", defaultValue: true },
        { key: "ssl", label: "SSL on Proxy", type: "checkbox", defaultValue: false },
        { key: "description", label: "Description", type: "text", placeholder: "Optional notes" },
      ],
    },
  ],
};

const DEFAULT_TIMEOUT_MS = 15000;

// Unchecked checkboxes can arrive as false, null, "false", 0, or be absent entirely.
function resolveVerifyTls(value: unknown): boolean {
  if (value === false || value === "false" || value === 0 || value === "0" || value === null || value === undefined || value === "") return false;
  return true;
}

function normalizeBaseUrl(rawUrl: string, sslEnabled = false): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("NPM server URL is required.");
  }

  const normalized = trimmed.replace(/\/+$/, "");

  if (!/^https?:\/\//i.test(normalized)) {
    return `${sslEnabled ? "https" : "http"}://${normalized}`;
  }

  if (sslEnabled && /^http:\/\//i.test(normalized)) {
    return normalized.replace(/^http:\/\//i, "https://");
  }

  return normalized;
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

async function fetchJson<T>(url: string, init: RequestInit = {}, verifyTls = false): Promise<T> {
  // Temporarily bypass TLS verification for self-signed certs when verifyTls is false.
  // process.env is restored immediately after the request to limit global impact.
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  if (!verifyTls) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  try {
    const response = await withTimeout(fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(init.headers ? (init.headers instanceof Headers
          ? Object.fromEntries(init.headers.entries())
          : init.headers as Record<string, string>) : {}),
      },
    }));

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`NPM request failed (${response.status}): ${text || response.statusText || "Unknown error"}`);
    }

    const text = await response.text();
    if (!text.trim()) return {} as T;
    return JSON.parse(text) as T;
  } finally {
    if (!verifyTls) {
      if (prev === undefined) {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      } else {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
      }
    }
  }
}

export function createNpmServerConfig(input: Partial<NpmServerConfig> & Pick<NpmServerConfig, "id" | "name" | "url">): NpmServerConfig {
  return {
    id: input.id,
    name: input.name,
    url: normalizeBaseUrl(input.url, input.ssl ?? false),
    apiKey: input.apiKey,
    username: input.username,
    password: input.password,
    ssl: input.ssl ?? false,
    verifyTls: input.verifyTls ?? false,
  };
}

export function createNpmDnsNameConfig(input: Partial<NpmDnsNameConfig> & Pick<NpmDnsNameConfig, "serverId" | "hostname" | "targetHost" | "targetPort">): NpmDnsNameConfig {
  const hostname = input.hostname.trim();
  if (!hostname) {
    throw new Error("DNS hostname is required.");
  }

  return {
    id: input.id ?? randomUUID(),
    serverId: input.serverId,
    hostname: hostname.replace(/^https?:\/\//i, "").replace(/\/$/, ""),
    targetHost: input.targetHost.trim() || "127.0.0.1",
    targetPort: input.targetPort,
    protocol: input.protocol ?? "http",
    enabled: input.enabled ?? true,
    ssl: input.ssl ?? false,
    description: input.description,
  };
}

export function createNpmUiConfig(servers: NpmServerConfig[] = [], dnsNames: NpmDnsNameConfig[] = []): NpmUiConfig {
  return {
    servers,
    dnsNames,
  };
}

// Cache bearer tokens per server URL to avoid re-authenticating on every request
const tokenCache = new Map<string, { token: string; expires: number }>();

async function getBearerToken(server: NpmServerConfig): Promise<string | undefined> {
  if (server.apiKey) {
    return server.apiKey;
  }

  if (!server.username || !server.password) {
    return undefined;
  }

  const cacheKey = `${server.url}::${server.username}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expires) {
    return cached.token;
  }

  const baseUrl = normalizeBaseUrl(server.url, server.ssl ?? false);
  const payloads = [
    { identity: server.username, secret: server.password },
    { username: server.username, password: server.password },
    { email: server.username, password: server.password },
  ];

  let lastError: unknown;

  for (const payload of payloads) {
    try {
      const response = await fetchJson<{ token?: string; expires?: string; data?: { token?: string }; access_token?: string; jwt?: string; value?: string }>(`${baseUrl}/api/tokens`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }, resolveVerifyTls(server.verifyTls));

      const token = response.token ?? response.data?.token ?? response.access_token ?? response.jwt ?? response.value;
      if (token) {
        const expiresMs = response.expires ? new Date(response.expires).getTime() : Date.now() + 3_600_000;
        tokenCache.set(cacheKey, { token, expires: expiresMs - 60_000 });
        return token;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Username/password authentication did not return a token from NPMPlus.");
}

export async function getNpmApiHeaders(server: NpmServerConfig): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const token = await getBearerToken(server);
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
    headers["X-API-Key"] = token;
    headers["Authorization-Basic"] = Buffer.from(`${server.username ?? ""}:${server.password ?? ""}`).toString("base64");
  }

  return headers;
}

export async function listNpmHosts(server: NpmServerConfig): Promise<NpmHost[]> {
  const baseUrl = normalizeBaseUrl(server.url);
  const url = `${baseUrl}/api/nginx/proxy-hosts`;
  const data = await fetchJson<{ data?: NpmHost[] }>(url, {
    method: "GET",
    headers: await getNpmApiHeaders(server),
  }, resolveVerifyTls(server.verifyTls));

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
  const baseUrl = normalizeBaseUrl(serverConfig.url, serverConfig.ssl ?? false);

  try {
    const headers = await getNpmApiHeaders(serverConfig);
    // Verify connectivity by listing proxy hosts — auth + reachability in one call
    await fetchJson<unknown>(`${baseUrl}/api/nginx/proxy-hosts`, {
      method: "GET",
      headers,
    }, resolveVerifyTls(serverConfig.verifyTls));
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

  const baseUrl = normalizeBaseUrl(server.url, server.ssl ?? false);

  try {
    const response = await fetchJson<{ id?: number; host?: { name?: string } }>(`${baseUrl}/api/nginx/proxy-hosts`, {
      method: "POST",
      headers: await getNpmApiHeaders(server),
      body: JSON.stringify(payload),
    }, resolveVerifyTls(server.verifyTls));

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
  defaultConfig: npmDefaultConfig,
  configSchema: npmConfigSchema,
  formSchema: npmFormDefinition,
  // Each saved integration already manages its own list of NPM servers, so a
  // single configuration profile covers a whole environment.
  supportsMultiple: false,
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
      const dnsNames = (config.dnsNames as NpmDnsNameConfig[] | undefined) ?? [];

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

      const results = await syncPslServicesToNpm({ servers, dnsNames, services });
      return { synced: results.length, results };
    } catch (error) {
      console.error("NPM sync failed:", error);
      return { error: error instanceof Error ? error.message : "Unknown error" };
    }
  },
} as PslAdapter;
