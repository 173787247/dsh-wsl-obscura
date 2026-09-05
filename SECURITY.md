# Security

- `obscura_fetch` only accepts `http` / `https` URLs.
- Private / LAN targets require explicit `allowPrivateNetwork: true` (Obscura SSRF guard).
- Do not log or return secrets from page content in shared transcripts when avoidable.
- This plugin shells out to a local Obscura binary; treat that binary as trusted software you built or downloaded yourself.
