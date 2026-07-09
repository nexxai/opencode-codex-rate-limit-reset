import { type Plugin, tool } from "@opencode-ai/plugin"
import { formatCredits, listCredits, redeemCredit } from "./codex"

const commandTemplate = `Use the rate_limit_reset tool immediately. Interpret the command arguments as follows:
- No arguments or "list": list reset credits.
- "redeem": redeem any available reset credit.
- "redeem <credit-id>": redeem that specific credit.

Do not modify files. Return the tool result verbatim.`

const plugin: Plugin = async () => ({
  config(config) {
    config.command ??= {}
    config.command["rate-limit-reset"] ??= {
      description: "View or redeem Codex rate-limit reset credits",
      template: commandTemplate,
    }
  },
  tool: {
    rate_limit_reset: tool({
      description:
        "Lists Codex rate-limit reset credits or redeems one. Use list by default. Redeeming consumes a credit and resets the applicable Codex rate-limit window.",
      args: {
        action: tool.schema.enum(["list", "redeem"]).default("list"),
        credit_id: tool.schema.string().optional().describe("A specific credit ID to redeem. Omit to let Codex select an available credit."),
      },
      async execute({ action, credit_id }) {
        if (action === "list") return formatCredits(await listCredits())

        const result = await redeemCredit(credit_id)
        return `Reset credit result: ${result.code}${result.windows_reset !== undefined ? ` (${result.windows_reset} rate-limit window${result.windows_reset === 1 ? "" : "s"} reset)` : ""}`
      },
    }),
  },
})

export default plugin
