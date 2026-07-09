# OpenCode Codex Rate-Limit Reset

An OpenCode plugin for viewing and redeeming rate-limit reset credits granted to a ChatGPT Codex account.

It reads the existing Codex login from `~/.codex/auth.json` (or `CODEX_HOME/auth.json`) and never writes or exposes its token.

## Install

Add the package to `~/.config/opencode/opencode.json` or a project `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-codex-rate-limit-reset"]
}
```

For local development, use the package path instead:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["file:///absolute/path/to/opencode-codex-rate-limit-reset/src/index.ts"]
}
```

Restart OpenCode after changing its configuration.

## Usage

The plugin registers `/rate-limit-reset`:

```text
/rate-limit-reset
/rate-limit-reset list
/rate-limit-reset redeem
/rate-limit-reset redeem credit-123
```

`redeem` consumes a credit. With no credit ID, Codex chooses an available credit.

The `rate_limit_reset` tool is also available to the active agent.

## Authentication and configuration

The plugin requires a ChatGPT Codex login; an OpenAI API key does not have reset credits. Install the Codex CLI before attempting to log in:

```sh
# macOS or Linux
curl -fsSL https://chatgpt.com/codex/install.sh | sh

# Start a new terminal, then verify the executable is on PATH.
command -v codex
```

If `command -v codex` prints nothing, add the directory reported by the installer to your shell PATH, open a new terminal, and repeat the check. Alternatively, install through a package manager:

```sh
npm install -g @openai/codex
# or, on macOS:
brew install --cask codex
```

Then authenticate:

```sh
codex login
```

If your installed Codex version opens its interactive setup instead, run `codex` and select **Sign in with ChatGPT**.

The plugin deliberately reads only the file-backed Codex cache. If Codex uses the OS keychain, add this to `~/.codex/config.toml`, then run `codex login` again:

```toml
cli_auth_credentials_store = "file"
```

If Codex reports `401`, run any normal Codex command to refresh its session, then retry. The plugin does not refresh tokens itself.

Optional environment variables:

- `CODEX_HOME`: directory containing `auth.json`; defaults to `~/.codex`.
- `CODEX_AUTH_JSON`: serialized Codex `auth.json`, useful for trusted CI environments.
- `CODEX_BACKEND_URL`: Codex backend root; defaults to `https://chatgpt.com/backend-api`.
