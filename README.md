# Dash

[![CI](https://github.com/YOUR_USERNAME/dash/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/dash/actions/workflows/ci.yml)
[![Release](https://github.com/YOUR_USERNAME/dash/actions/workflows/release.yml/badge.svg)](https://github.com/YOUR_USERNAME/dash/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A fast, secure desktop application built with [Tauri](https://tauri.app), React, and TypeScript.

---

## Features

- **Lightweight** — Tauri bundles produce small, fast native binaries
- **Secure** — Rust backend with minimal attack surface; no Node.js runtime in production
- **Cross-platform** — Windows, macOS, and Linux from a single codebase
- **End-to-end encryption** — Sensitive data is encrypted at rest using AES-256-GCM before it ever touches disk
- **Zero telemetry** — No data leaves your machine

---

## Screenshots

> _Screenshots coming soon._

| Dashboard | Settings |
|-----------|----------|
| ![Dashboard](./docs/screenshots/dashboard.png) | ![Settings](./docs/screenshots/settings.png) |

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20 | [nodejs.org](https://nodejs.org) |
| Rust | stable | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` |
| Tauri CLI | included via npm | — |

**Linux only** — install system dependencies:

```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf \
  build-essential \
  curl \
  wget \
  file
```

---

## Setup

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/dash.git
cd dash

# 2. Install Node dependencies
npm install

# 3. Generate app icons (requires a 1024x1024 source PNG)
npx tauri icon ./path/to/icon.png
```

---

## Development

```bash
npm run tauri:dev
```

Opens the app with hot-reload enabled for both the frontend and Rust backend.

---

## Building for Production

```bash
npm run tauri:build
```

Output binaries are placed in `src-tauri/target/release/bundle/`.

---

## Release Process

Dash uses GitHub Actions for fully automated releases.

### Tagging a release

```bash
# Bump version in package.json and src-tauri/tauri.conf.json first, then:
git add package.json src-tauri/tauri.conf.json
git commit -m "chore: bump version to v1.0.0"
git tag v1.0.0
git push origin main --tags
```

The `release.yml` workflow triggers automatically on any `v*` tag and:

1. Builds the app on Windows, macOS (Intel + Apple Silicon), and Linux
2. Produces `.msi`, `.exe`, `.dmg`, `.AppImage`, and `.deb` artifacts
3. Creates a GitHub Release and uploads all binaries as assets

### Versioning

Version is stored in two places — keep them in sync:

- `package.json` → `"version": "x.y.z"`
- `src-tauri/tauri.conf.json` → `"version": "x.y.z"`

---

## Security Model

### Encryption

- All sensitive data is encrypted with **AES-256-GCM** before being written to disk
- Encryption keys are derived via **Argon2id** from user credentials and never stored in plaintext
- The Rust backend handles all cryptographic operations; the frontend never touches raw keys

### Tauri Security Posture

- Frontend runs in a sandboxed WebView — no filesystem or shell access by default
- IPC calls are explicitly whitelisted via the [capabilities system](./src-tauri/capabilities/)
- CSP headers are enforced in production builds
- No Node.js runtime in the distributed binary

### Reporting Vulnerabilities

Please do **not** open public issues for security vulnerabilities. Email `security@example.com` instead.

---

## Adding Code Signing

Code signing is prepared in the pipeline but disabled until certificates are provisioned.

### Windows (signtool)

1. Export your certificate as `.pfx` and base64-encode it
2. Add secrets to your GitHub repo:
   - `WINDOWS_CERTIFICATE` — base64-encoded `.pfx`
   - `WINDOWS_CERTIFICATE_PASSWORD` — certificate password
3. Uncomment the Windows signing block in `.github/workflows/release.yml`

### macOS Notarization

1. Export your Developer ID certificate and base64-encode it
2. Add secrets:
   - `APPLE_CERTIFICATE`
   - `APPLE_CERTIFICATE_PASSWORD`
   - `APPLE_SIGNING_IDENTITY`
   - `APPLE_ID`
   - `APPLE_PASSWORD` (app-specific password)
   - `APPLE_TEAM_ID`
3. Uncomment the macOS notarization block in `.github/workflows/release.yml`

See [Tauri code signing docs](https://tauri.app/distribute/sign/) for full details.

---

## Customizing Builds

| What | Where |
|------|-------|
| App name, ID, version | `src-tauri/tauri.conf.json` |
| Window size / decorations | `src-tauri/tauri.conf.json` → `app.windows` |
| Bundle targets (msi, deb, etc.) | `src-tauri/tauri.conf.json` → `bundle.targets` |
| IPC permissions | `src-tauri/capabilities/default.json` |
| Frontend dev port | `vite.config.ts` + `tauri.conf.json` → `build.devUrl` |

---

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push (`git push origin feat/my-feature`)
5. Open a Pull Request

CI runs automatically on all PRs.

---

## License

[MIT](./LICENSE)
