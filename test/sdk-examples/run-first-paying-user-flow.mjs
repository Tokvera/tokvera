import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseUrl = (process.env.TOKVERA_API_BASE_URL || "https://api.tokvera.org").replace(/\/$/, "");
const email = (process.env.TOKVERA_SMOKE_EMAIL || "").trim().toLowerCase();
const password = process.env.TOKVERA_SMOKE_PASSWORD || "";
const explicitTenantId = (process.env.TOKVERA_SMOKE_TENANT_ID || "").trim();
const explicitProjectId = (process.env.TOKVERA_SMOKE_PROJECT_ID || "").trim();
const projectName =
  process.env.TOKVERA_SMOKE_PROJECT_NAME || `smoke-first-paying-user-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const metricsTimeoutMs = Number(process.env.SMOKE_METRICS_TIMEOUT_SECONDS || 90) * 1000;
const metricsPollMs = Number(process.env.SMOKE_METRICS_POLL_SECONDS || 5) * 1000;
const enableCleanup = String(process.env.SMOKE_CLEANUP || "0") === "1";

if (!email || !password) {
  console.error("[first-paying-smoke] TOKVERA_SMOKE_EMAIL and TOKVERA_SMOKE_PASSWORD are required");
  process.exit(1);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      if (!options.silent) {
        process.stdout.write(text);
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      if (!options.silent) {
        process.stderr.write(text);
      }
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
      }
    });
  });
}

async function requestJson(url, options = {}) {
  const method = options.method || "GET";
  const headers = {
    ...(options.headers || {}),
  };

  const fetchOptions = {
    method,
    headers,
  };

  if (options.body !== undefined) {
    fetchOptions.body = JSON.stringify(options.body);
    if (!fetchOptions.headers["content-type"]) {
      fetchOptions.headers["content-type"] = "application/json";
    }
  }

  const res = await fetch(url, fetchOptions);
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const errorCode = data?.error?.code || `HTTP_${res.status}`;
    const errorMessage = data?.error?.message || JSON.stringify(data);
    throw new Error(`${method} ${url} failed (${errorCode}): ${errorMessage}`);
  }

  return data;
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

function withTenant(headers, tenantId) {
  return {
    ...headers,
    "x-tenant-id": tenantId,
  };
}

async function login() {
  const data = await requestJson(`${baseUrl}/v1/auth/login`, {
    method: "POST",
    body: {
      email,
      password,
    },
  });

  const sessionToken = data?.session?.token;
  if (!sessionToken) {
    throw new Error("Login succeeded but no session token returned.");
  }

  const memberships = Array.isArray(data.memberships) ? data.memberships : [];
  return {
    sessionToken,
    memberships,
    userId: data?.user?.id || null,
  };
}

function pickTenantId(memberships) {
  if (explicitTenantId) {
    const match = memberships.find((entry) => entry?.tenant_id === explicitTenantId);
    if (!match) {
      throw new Error(`TOKVERA_SMOKE_TENANT_ID not found in memberships: ${explicitTenantId}`);
    }
    return explicitTenantId;
  }

  if (memberships.length === 1) {
    return memberships[0].tenant_id;
  }

  if (memberships.length > 1) {
    throw new Error(
      "User belongs to multiple tenants. Set TOKVERA_SMOKE_TENANT_ID to select the target tenant."
    );
  }

  return "";
}

async function bootstrapOnboarding(sessionToken) {
  const data = await requestJson(`${baseUrl}/v1/onboarding/bootstrap`, {
    method: "POST",
    headers: bearer(sessionToken),
    body: {
      tenant_name: `Smoke Workspace ${new Date().toISOString().slice(0, 10)}`,
      project_name: projectName,
    },
  });

  const tenantId = data?.tenant?.id;
  const projectId = data?.project?.id;
  const apiKey = data?.api_key;
  if (!tenantId || !projectId || !apiKey) {
    throw new Error("Onboarding bootstrap response missing tenant/project/api_key.");
  }

  return {
    tenantId,
    projectId,
    apiKey,
    createdProject: true,
    createdKeyId: null,
    bootstrapped: true,
  };
}

async function ensureProject(sessionToken, tenantId) {
  if (explicitProjectId) {
    const list = await requestJson(`${baseUrl}/v1/projects`, {
      headers: withTenant(bearer(sessionToken), tenantId),
    });
    const found = (list.items || []).find((item) => item.id === explicitProjectId && item.is_active !== false);
    if (!found) {
      throw new Error(`TOKVERA_SMOKE_PROJECT_ID not found or inactive: ${explicitProjectId}`);
    }

    return {
      projectId: explicitProjectId,
      createdProject: false,
    };
  }

  const created = await requestJson(`${baseUrl}/v1/projects`, {
    method: "POST",
    headers: withTenant(bearer(sessionToken), tenantId),
    body: {
      name: projectName,
    },
  });

  const projectId = created?.project?.id;
  if (!projectId) {
    throw new Error("Project create response missing project.id.");
  }

  return {
    projectId,
    createdProject: true,
  };
}

async function createProjectKey(sessionToken, tenantId, projectId) {
  const data = await requestJson(`${baseUrl}/v1/projects/${projectId}/keys`, {
    method: "POST",
    headers: withTenant(bearer(sessionToken), tenantId),
  });

  const apiKey = data?.key?.api_key;
  const keyId = data?.key?.id;
  if (!apiKey || !keyId) {
    throw new Error("Project key response missing key.id or key.api_key.");
  }

  return { apiKey, keyId };
}

async function checkHealth() {
  const data = await requestJson(`${baseUrl}/health`);
  console.log(`[first-paying-smoke] health ok: ${JSON.stringify(data)}`);
}

async function runSdkSmoke(apiKey, nodeFeature, pythonFeature) {
  const scriptPath = path.join(__dirname, "run-production-smoke.mjs");

  await run(process.execPath, [scriptPath], {
    cwd: __dirname,
    env: {
      ...process.env,
      TOKVERA_API_BASE_URL: baseUrl,
      TOKVERA_API_KEY: apiKey,
      SMOKE_NODE_FEATURE: nodeFeature,
      SMOKE_PYTHON_FEATURE: pythonFeature,
      SMOKE_METRICS_TIMEOUT_SECONDS: String(metricsTimeoutMs / 1000),
      SMOKE_METRICS_POLL_SECONDS: String(metricsPollMs / 1000),
    },
  });
}

async function fetchBillingMetering(sessionToken, tenantId, projectId) {
  const url = `${baseUrl}/v1/billing/metering?project_id=${encodeURIComponent(projectId)}`;
  return requestJson(url, {
    headers: withTenant(bearer(sessionToken), tenantId),
  });
}

async function waitForProjectUsage(sessionToken, tenantId, projectId, minimumRequests) {
  const startedAt = Date.now();
  let last = null;

  while (Date.now() - startedAt < metricsTimeoutMs) {
    const metering = await fetchBillingMetering(sessionToken, tenantId, projectId);
    last = metering;
    const requests = Number(metering?.project?.usage?.request_count || 0);
    if (requests >= minimumRequests) {
      return metering;
    }
    await sleep(metricsPollMs);
  }

  throw new Error(
    `Billing metering timeout (${metricsTimeoutMs}ms). Last snapshot=${JSON.stringify(last)}`
  );
}

async function fetchInvoicePreview(sessionToken, tenantId, projectId) {
  const url = `${baseUrl}/v1/billing/invoice-preview?project_id=${encodeURIComponent(projectId)}`;
  return requestJson(url, {
    headers: withTenant(bearer(sessionToken), tenantId),
  });
}

async function revokeKey(sessionToken, tenantId, projectId, keyId) {
  if (!keyId) return;
  await requestJson(`${baseUrl}/v1/projects/${projectId}/keys/${keyId}/revoke`, {
    method: "POST",
    headers: withTenant(bearer(sessionToken), tenantId),
  });
}

async function archiveProject(sessionToken, tenantId, projectId) {
  await requestJson(`${baseUrl}/v1/projects/${projectId}`, {
    method: "DELETE",
    headers: withTenant(bearer(sessionToken), tenantId),
  });
}

async function main() {
  console.log(`[first-paying-smoke] base=${baseUrl}`);
  await checkHealth();

  const ts = Date.now();
  const nodeFeature = `first_paying_node_${ts}`;
  const pythonFeature = `first_paying_python_${ts}`;

  const { sessionToken, memberships } = await login();
  console.log(`[first-paying-smoke] login ok, memberships=${memberships.length}`);

  let tenantId = pickTenantId(memberships);
  let projectId = "";
  let apiKey = "";
  let createdProject = false;
  let createdKeyId = null;
  let bootstrapped = false;

  if (!tenantId) {
    const bootstrap = await bootstrapOnboarding(sessionToken);
    tenantId = bootstrap.tenantId;
    projectId = bootstrap.projectId;
    apiKey = bootstrap.apiKey;
    createdProject = bootstrap.createdProject;
    createdKeyId = bootstrap.createdKeyId;
    bootstrapped = bootstrap.bootstrapped;
    console.log(`[first-paying-smoke] onboarding bootstrap created tenant=${tenantId} project=${projectId}`);
  } else {
    const project = await ensureProject(sessionToken, tenantId);
    projectId = project.projectId;
    createdProject = project.createdProject;

    const key = await createProjectKey(sessionToken, tenantId, projectId);
    apiKey = key.apiKey;
    createdKeyId = key.keyId;
    console.log(`[first-paying-smoke] project ready id=${projectId} created=${createdProject}`);
  }

  console.log(`[first-paying-smoke] sdk smoke features node=${nodeFeature} python=${pythonFeature}`);
  await runSdkSmoke(apiKey, nodeFeature, pythonFeature);

  const metering = await waitForProjectUsage(sessionToken, tenantId, projectId, 4);
  const projectRequests = Number(metering?.project?.usage?.request_count || 0);
  const tenantRequests = Number(metering?.tenant?.usage?.request_count || 0);

  const preview = await fetchInvoicePreview(sessionToken, tenantId, projectId);
  const currentAmount = Number(preview?.project?.current_estimate?.estimated_amount_usd || 0);
  const projectedAmount = Number(preview?.project?.projected_estimate?.estimated_amount_usd || 0);

  console.log("[first-paying-smoke] success summary");
  console.log(
    JSON.stringify(
      {
        tenant_id: tenantId,
        project_id: projectId,
        bootstrapped,
        created_project: createdProject,
        usage: {
          project_request_count: projectRequests,
          tenant_request_count: tenantRequests,
          node_feature: nodeFeature,
          python_feature: pythonFeature,
        },
        invoice_preview: {
          project_current_estimated_amount_usd: currentAmount,
          project_projected_month_end_amount_usd: projectedAmount,
        },
      },
      null,
      2
    )
  );

  if (enableCleanup && createdProject) {
    if (createdKeyId) {
      await revokeKey(sessionToken, tenantId, projectId, createdKeyId);
    }
    await archiveProject(sessionToken, tenantId, projectId);
    console.log(`[first-paying-smoke] cleanup complete for project=${projectId}`);
  }
}

main().catch((error) => {
  console.error(`[first-paying-smoke] failed: ${error.message}`);
  process.exit(1);
});
