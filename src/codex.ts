import { homedir } from "node:os"
import { join } from "node:path"

export type Credit = {
  id: string
  reset_type: string
  status: string
  granted_at: string
  expires_at?: string | null
  title?: string | null
  description?: string | null
}

type AuthFile = {
  tokens?: {
    access_token?: string
    account_id?: string
    id_token?: string
  }
}

type Auth = {
  accessToken: string
  accountID?: string
}

type CreditsResponse = {
  credits: Credit[]
  available_count: number
}

type ConsumeResponse = {
  code: string
  windows_reset?: number
}

const defaultBackendURL = "https://chatgpt.com/backend-api"

function accountIDFromToken(token?: string) {
  if (!token) return undefined

  try {
    const payload = token.split(".")[1]
    if (!payload) return undefined

    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
    return typeof claims.chatgpt_account_id === "string" ? claims.chatgpt_account_id : undefined
  } catch {
    return undefined
  }
}

export async function readCodexAuth(env = Bun.env): Promise<Auth> {
  const authJSON = env.CODEX_AUTH_JSON
  const authPath = join(env.CODEX_HOME ?? join(homedir(), ".codex"), "auth.json")
  const authFile = Bun.file(authPath)
  if (!authJSON && !(await authFile.exists())) {
    throw new Error(
      `No Codex auth file found at ${authPath}. Install Codex first if needed (https://developers.openai.com/codex/cli), set cli_auth_credentials_store = "file" in ~/.codex/config.toml, run \`codex login\`, and try again.`,
    )
  }
  const source = authJSON ?? (await authFile.text())

  let auth: AuthFile
  try {
    auth = JSON.parse(source)
  } catch {
    throw new Error(`Could not parse Codex authentication from ${authJSON ? "CODEX_AUTH_JSON" : authPath}.`)
  }

  const accessToken = auth.tokens?.access_token
  if (!accessToken) {
    throw new Error("No ChatGPT access token found. Run `codex login` and try again. See the plugin README if the `codex` command is not installed.")
  }

  return {
    accessToken,
    accountID: auth.tokens?.account_id ?? accountIDFromToken(auth.tokens?.id_token),
  }
}

function backendURL(env = Bun.env) {
  return (env.CODEX_BACKEND_URL ?? defaultBackendURL).replace(/\/+$/, "")
}

async function request(path: string, options: RequestInit, env = Bun.env) {
  const auth = await readCodexAuth(env)
  const headers = new Headers(options.headers)
  headers.set("Authorization", `Bearer ${auth.accessToken}`)
  headers.set("User-Agent", "opencode-codex-rate-limit-reset")
  if (auth.accountID) headers.set("ChatGPT-Account-Id", auth.accountID)

  const response = await fetch(`${backendURL(env)}${path}`, { ...options, headers })
  if (!response.ok) {
    const details = (await response.text()).replace(/\s+/g, " ").slice(0, 500)
    throw new Error(`Codex returned ${response.status}${details ? `: ${details}` : ""}`)
  }

  return response.json()
}

export async function listCredits(env = Bun.env) {
  return (await request("/wham/rate-limit-reset-credits", { method: "GET" }, env)) as CreditsResponse
}

export async function redeemCredit(creditID?: string, env = Bun.env) {
  return (await request(
    "/wham/rate-limit-reset-credits/consume",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redeem_request_id: crypto.randomUUID(), ...(creditID ? { credit_id: creditID } : {}) }),
    },
    env,
  )) as ConsumeResponse
}

export function formatCredits({ credits, available_count }: CreditsResponse) {
  const heading = `Available reset credits: ${available_count}`
  if (credits.length === 0) return `${heading}\n\nNo reset credits were found.`

  const details = credits.map((credit) =>
    [
      `${credit.title ?? credit.reset_type} (${credit.status})`,
      `ID: ${credit.id}`,
      `Granted: ${credit.granted_at}`,
      credit.expires_at ? `Expires: ${credit.expires_at}` : undefined,
      credit.description,
    ]
      .filter(Boolean)
      .join("\n"),
  )

  return `${heading}\n\n${details.join("\n\n")}`
}
