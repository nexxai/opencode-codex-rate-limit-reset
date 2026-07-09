import { expect, test } from "bun:test"
import plugin from "./index"
import { formatCredits, readCodexAuth } from "./codex"

test("formats available credits with their IDs", () => {
  expect(
    formatCredits({
      available_count: 1,
      credits: [
        {
          id: "credit-1",
          reset_type: "codex_rate_limits",
          status: "available",
          granted_at: "2026-06-17T00:00:00Z",
          expires_at: "2026-07-17T00:00:00Z",
          title: "Full reset",
          description: "Ready to redeem",
        },
      ],
    }),
  ).toBe(`Available reset credits: 1

Full reset (available)
ID: credit-1
Granted: 2026-06-17T00:00:00Z
Expires: 2026-07-17T00:00:00Z
Ready to redeem`)
})

test("reads the ChatGPT account ID from the Codex ID token", async () => {
  const idToken = `header.${btoa(JSON.stringify({ chatgpt_account_id: "account-123" }))}.signature`
  await expect(
    readCodexAuth({
      CODEX_AUTH_JSON: JSON.stringify({ tokens: { access_token: "token", id_token: idToken } }),
    }),
  ).resolves.toEqual({ accessToken: "token", accountID: "account-123" })
})

test("registers the slash command without replacing a user command", async () => {
  const hooks = await plugin({} as never)
  const config = { command: { "rate-limit-reset": { description: "Custom", template: "custom" } } }

  hooks.config?.(config as never)

  expect(config.command["rate-limit-reset"]).toEqual({ description: "Custom", template: "custom" })
})
