# Solobase Documentation

Solobase is a backend in a single binary. Auth, database, file storage,
an admin panel, AI/RAG, and payments — all running on
`localhost:8090` within a minute of downloading.

> **Heads up.** Solobase is experimental. Great for prototypes, side
> projects, and AI agents; not for your production workload yet. See
> [the honest disclaimer](https://solobase.dev/notes/).

## Quick start

Download the latest release for your platform:

```bash
# Linux (amd64)
curl -sSL https://github.com/suppers-ai/solobase/releases/latest/download/solobase-linux-amd64.tar.gz | tar xz

# macOS (Apple Silicon)
curl -sSL https://github.com/suppers-ai/solobase/releases/latest/download/solobase-darwin-arm64.tar.gz | tar xz

# Windows: download solobase-windows-amd64.zip from the Releases page
```

Run it:

```bash
./solobase
```

That's the whole install. Open <http://localhost:8090> and log in to
`/b/admin/` with the seeded admin user — the email and password are
printed in the startup logs the first time you run it.

Other platforms (`linux-arm64`, `darwin-amd64`) live on the
[releases page](https://github.com/suppers-ai/solobase/releases/latest).
Or build from source: `git clone https://github.com/suppers-ai/solobase
&& cargo build --release` (Rust 1.75+).

## What's inside

Solobase is a runtime called **WAFER** with a set of built-in *blocks*.
Each block is a feature you can use, ignore, or replace.

| Block                      | What it does                                                                              | UI route             |
| -------------------------- | ----------------------------------------------------------------------------------------- | -------------------- |
| `suppers-ai/auth`          | Email + password signup, JWT, refresh tokens, API keys, OAuth (Google / GitHub / Microsoft) | `/b/auth/`           |
| `suppers-ai/admin`         | Dashboard: users, roles, config, logs, database explorer, network & storage rules         | `/b/admin/`          |
| `suppers-ai/userportal`    | Per-user account page: profile, password, sessions, security                              | `/b/userportal/`     |
| `suppers-ai/files`         | Buckets, uploads, share links, per-user quotas. Local disk or S3.                         | `/b/storage/`        |
| `suppers-ai/products`      | Catalog, formula-based pricing, purchases, Stripe checkout                                | `/b/products/`       |
| `suppers-ai/llm`           | Chat UI + multi-provider LLM routing (OpenAI, Anthropic, …), streaming                    | `/b/llm/`            |
| `suppers-ai/vector`        | RAG: ingestion, chunking, embeddings, similarity search                                   | `/b/vector/`         |
| `suppers-ai/messages`      | Threads & conversation storage (used by the LLM chat)                                     | API only             |
| `suppers-ai/email`         | Templated transactional email via Mailgun                                                 | —                    |
| `suppers-ai/legalpages`    | Versioned terms-of-service / privacy-policy pages                                         | `/b/legalpages/`     |

Underneath, infrastructure blocks like `wafer-run/database`,
`wafer-run/storage`, `wafer-run/network`, `wafer-run/llm`, and
`wafer-run/vector` handle the actual driver work — SQLite, the local
filesystem, outbound HTTP, and so on. You usually don't interact with
them directly; the feature blocks above do.

Every block exposes a JSON HTTP API alongside its UI. Use the runtime
introspector at `GET /b/admin/wafer` to see exactly what's registered
in your build, with every endpoint and config key.

## Configure

Solobase has two places to put configuration:

- **`.env` (runtime)** — secrets and per-deployment settings: ports,
  database paths, OAuth client IDs, Stripe keys. Loaded when the binary
  starts.
- **`solobase.toml` (build-time)** — declared in apps that embed
  Solobase as a library: app name, asset overlays, custom blocks.
  Optional for the standalone binary.

Most people only need `.env`. Drop one next to the binary, set the
values you want, and run.

### Variables

Variable names follow a three-tier convention:

| Prefix                    | What it's for                                | Example                                     |
| ------------------------- | -------------------------------------------- | ------------------------------------------- |
| `SOLOBASE_*`              | Infrastructure — port, db path, env mode     | `SOLOBASE_LISTEN=0.0.0.0:8090`              |
| `SOLOBASE_SHARED__*`      | App-wide settings several blocks read        | `SOLOBASE_SHARED__APP_NAME=My App`          |
| `{ORG}__{BLOCK}__*`       | Variables owned by one block                 | `SUPPERS_AI__AUTH__JWT_SECRET=…`            |

A typical starter `.env`:

```bash
# App basics
SOLOBASE_LISTEN=0.0.0.0:8090
SOLOBASE_SHARED__APP_NAME=My App
SOLOBASE_SHARED__ENVIRONMENT=development

# Auth — JWT_SECRET is auto-generated if you leave it out
SUPPERS_AI__AUTH__ADMIN_EMAIL=you@example.com
SUPPERS_AI__AUTH__OAUTH_GOOGLE_CLIENT_ID=...
SUPPERS_AI__AUTH__OAUTH_GOOGLE_CLIENT_SECRET=...

# Email (optional, for verification + password reset)
SUPPERS_AI__EMAIL__MAILGUN_API_KEY=...
SUPPERS_AI__EMAIL__MAILGUN_DOMAIN=mg.example.com
```

You can also edit most variables live from
`/b/admin/settings/variables/` — the database overrides whatever you
put in `.env` after first boot. Variables marked sensitive (suffix
`_SECRET` or `_KEY`) auto-generate when missing.

### Turn blocks on/off

```bash
# Disable products and the LLM chat for a minimal build
SOLOBASE_BLOCK_DISABLED=suppers-ai/products,suppers-ai/llm

# Or invert: only enable the ones you list
SOLOBASE_BLOCK_ENABLED=suppers-ai/auth,suppers-ai/files,suppers-ai/admin
```

## The `solobase` CLI

The same binary you run as a server is also a build tool. Three verbs:

| Verb              | What it does                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `solobase serve`  | Build and run locally. Default — what you get from `./solobase` with no args.              |
| `solobase build`  | Compile an artifact for the chosen target without running it.                              |
| `solobase deploy` | Build and ship to a hosted target (currently Cloudflare).                                  |

Each takes a `--target` flag — `native` (default, runs the binary),
`web` (compiles to WebAssembly for the browser), or `cloudflare`
(Workers + D1 + R2). Add `--release` for production builds.

```bash
# Dev loop
solobase serve

# Production native binary
solobase build --release

# Browser bundle (output in dist/)
solobase build --target web --release

# Deploy to Cloudflare Workers
solobase deploy --target cloudflare --release
```

## Run on a server

Drop the binary on the host, put a `.env` next to it, run it under
your favourite supervisor (systemd, Docker, fly.io, …). The data lives
in `./data/` by default — back that directory up and you have backed up
the whole app.

## Deploy to Cloudflare

Solobase compiles to a Cloudflare Worker, with D1 as the database and
R2 as the file store. From a project that embeds Solobase:

```bash
# One-time: create the D1 database, then put its ID in solobase.toml
wrangler d1 create my-app

# Authenticate
export CLOUDFLARE_API_TOKEN=...

# Deploy
solobase deploy --target cloudflare --release
```

The CLI generates the `wrangler.toml`, builds the wasm worker, and runs
`wrangler publish` for you.

## Run in the browser

The same backend can compile to WebAssembly and run inside a Service
Worker — no server at all. Useful for offline-first apps, per-PR
previews, and zero-infrastructure E2E tests. See the
[Why page](https://solobase.dev/why/) for the bigger picture, and the
[repo](https://github.com/suppers-ai/solobase) for an example app.

## Admin panel tour

Sign in to `/b/admin/` as an admin user. From there:

- **Users & permissions** — list users, assign roles, manage IAM
  permissions.
- **Settings** — every config variable any block has registered, edited
  live and persisted to the database.
- **Database** — list tables, inspect columns, run read-only SQL.
- **Files / storage** — browse buckets, view objects, manage shares
  and per-user quotas.
- **Network & storage rules** — sandbox controls for blocks. By default
  a block can only touch its own tables and only the URLs you allow it.
  The grants page (WRAP) shows exactly what each block is permitted to
  read or write.
- **Logs** — request logs, audit trail, blocked outbound calls.

## Custom blocks

A block is a self-contained feature — a slice of database, an HTTP
handler, a skill an LLM can call. You can ship one as a sandboxed
WebAssembly module (the easy path) or compile it into a custom build
(when you need direct host access).

### A sandboxed WASM block

This is the path most people want: write Rust, compile to `.wasm`,
upload through the admin panel. The block runs in a sandbox with no
filesystem, no network, and no database access except what you
explicitly grant.

A complete *calculator* block — takes a math expression, returns the
result:

```rust
// src/lib.rs
use serde::Deserialize;
use wafer_sdk::*;

#[derive(Deserialize)]
struct Args { expr: String }

struct Calculator;

#[wafer_block(
    name = "my-org/calculator",
    version = "0.1.0",
    interface = "handler@v1",
    summary = "Evaluate a math expression",
    skill(
        description = "Evaluate an arithmetic expression (e.g. '2+2*3').",
        parameters = r#"{
            "type": "object",
            "properties": {
                "expr": { "type": "string" }
            },
            "required": ["expr"]
        }"#
    ),
)]
impl Calculator {
    fn handle(_msg: Message, body: Vec<u8>) -> GuestResult {
        let args: Args = serde_json::from_slice(&body).unwrap();
        match meval::eval_str(&args.expr) {
            Ok(v)  => GuestResult::respond(
                serde_json::to_vec(&serde_json::json!({ "result": v })).unwrap()
            ),
            Err(e) => GuestResult::respond(
                serde_json::to_vec(&serde_json::json!({ "error": e.to_string() })).unwrap()
            ),
        }
    }
}
```

And the `Cargo.toml` alongside it:

```toml
[package]
name = "calculator"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wafer-sdk  = { git = "https://github.com/wafer-run/wafer-run" }
serde      = { version = "1", features = ["derive"] }
serde_json = "1"
meval      = "0.2"
```

Build the wasm and upload it:

```bash
cargo build --release --target wasm32-unknown-unknown
# Then drag the .wasm into /b/admin/blocks/ → "Upload custom block"
```

The `skill(…)` attribute is optional — include it if you want the LLM
block to be able to call this one as a tool. The `parameters` JSON
Schema is what the model sees.

### A compile-in Rust block

If you need direct host access — calling out to a database, the
filesystem, or other blocks — embed Solobase as a library and register
your block at startup. Implement the `Block` trait:

```rust
use wafer_run::{block::{Block, BlockInfo}, context::Context, types::*, InputStream, OutputStream};

pub struct PingBlock;

#[async_trait::async_trait]
impl Block for PingBlock {
    fn info(&self) -> BlockInfo {
        BlockInfo::new("my-org/ping", "0.1.0", "http-handler@v1", "Ping pong")
            .endpoints(vec![BlockEndpoint::get("/b/ping/").summary("Pong")])
    }

    async fn handle(&self, _ctx: &dyn Context, _msg: Message, _input: InputStream) -> OutputStream {
        ok_json(&serde_json::json!({ "pong": true }))
    }
}
```

Register it in your app's `main.rs`:

```rust
w.register_block("my-org/ping".into(), PingBlock).unwrap();
```

Then `solobase build` as usual.

### WRAP grants

By default a block can only read and write its own tables (named
`my_org__calculator__*`) and only fetch URLs you've allowed. To let one
block touch another's data, add a grant from
**Admin → WRAP grants**. The audit log on the same page shows every
cross-block access attempt, allowed or denied.

For a longer tour of the SDK, look at the existing blocks under
`crates/solobase-core/src/blocks/` in the
[main repo](https://github.com/suppers-ai/solobase) — they range from a
90-line health-check block (`system.rs`) up to the full LLM router.

## Get help

- [File a bug](https://github.com/suppers-ai/solobase/issues)
- [Join the Discord](https://discord.gg/jKqMcbrVzm)
- [Read the source](https://github.com/suppers-ai/solobase)
