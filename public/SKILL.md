# Solobase — operating manual for AI agents

Solobase is a single-binary backend (auth, database, file storage, admin
panel, LLM/RAG, payments) built on the WAFER block runtime. This file
tells you how to run it, inspect what's inside, and add features.

> Pull the latest version of this file with
> `curl -sSL https://solobase.dev/SKILL.md`. Raw markdown also lives at
> `/llms.txt` (link index) and `/docs/index.md` (full docs).

## 1. Install and run

```bash
# Linux amd64 — substitute platform as needed
curl -sSL https://github.com/suppers-ai/solobase/releases/latest/download/solobase-linux-amd64.tar.gz | tar xz
./solobase
```

That's the whole install. The binary listens on `:8090` and writes its
data to `./data/`. The first run prints a seeded admin email and password
in the logs — capture them; you'll need them.

For a throwaway instance per task (recommended for isolated agent work),
run inside a fresh empty directory. All state lives under `./data/`, so
`rm -rf ./data` resets the world.

## 2. Discover what's inside

Every running solobase exposes a runtime introspector at
`GET /b/admin/wafer` (admin auth required). Use it to discover:

- Every block that's registered, with its version and category.
- Every HTTP endpoint each block serves, with method + path + auth level.
- Every config variable each block has declared, with type and default.

Don't hard-code endpoint lists from this file — query `/b/admin/wafer`
against the running instance instead. It's the source of truth.

## 3. The block model

A *block* is a self-contained feature: a slice of database tables, an
HTTP handler, optionally an LLM-callable skill. Block names are
two-segment: `{org}/{block}`, e.g. `suppers-ai/auth`,
`suppers-ai/files`, `my-org/my-feature`.

Blocks are isolated from each other by **WRAP** (Wafer Resource Access
Policy):

- A block's tables are namespaced `{org}__{block}__*` and only readable/
  writable by that block by default.
- Outbound HTTP requires explicit allow-listing.
- Cross-block access requires an admin-issued grant, visible at
  `/b/admin/grants/`.

When you write a custom block, assume default-deny on everything except
its own tables. Add grants explicitly.

## 4. Configuration

Three-tier env-var convention. Set in `.env` next to the binary, or live
through `/b/admin/settings/variables/`:

- `SOLOBASE_*` — infrastructure (`SOLOBASE_LISTEN`, `SOLOBASE_DB_PATH`).
- `SOLOBASE_SHARED__*` — app-wide (`SOLOBASE_SHARED__APP_NAME`).
- `{ORG}__{BLOCK}__*` — block-scoped
  (`SUPPERS_AI__AUTH__JWT_SECRET`).

Variables with `_SECRET` or `_KEY` suffixes auto-generate when missing.
DB-stored values override `.env` after first boot.

To enable/disable blocks:

```bash
SOLOBASE_BLOCK_DISABLED=suppers-ai/products,suppers-ai/llm
SOLOBASE_BLOCK_ENABLED=suppers-ai/auth,suppers-ai/files,suppers-ai/admin
```

## 5. The CLI

```
solobase serve              # build + run (default verb)
solobase build              # compile only
solobase deploy             # build + ship to a hosted target
```

Each takes `--target {native|web|cloudflare}` and optional `--release`.
`native` is the default. `web` produces a WebAssembly bundle that runs
in a Service Worker (no server). `cloudflare` produces a Workers
deployment with D1 + R2.

## 6. Add a custom block (sandboxed WASM)

Write Rust, compile to `wasm32-unknown-unknown`, upload the `.wasm`
through `/b/admin/blocks/`. The block runs in a sandbox: no filesystem,
no network, no DB, except what you grant.

`Cargo.toml`:

```toml
[package]
name    = "my-block"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wafer-sdk  = { git = "https://github.com/wafer-run/wafer-run" }
serde      = { version = "1", features = ["derive"] }
serde_json = "1"
```

`src/lib.rs`:

```rust
use serde::Deserialize;
use wafer_sdk::*;

#[derive(Deserialize)]
struct Args { name: String }

struct Greeter;

#[wafer_block(
    name      = "my-org/greeter",
    version   = "0.1.0",
    interface = "handler@v1",
    summary   = "Say hi",
    skill(
        description = "Greet someone by name.",
        parameters  = r#"{
            "type": "object",
            "properties": { "name": { "type": "string" } },
            "required": ["name"]
        }"#
    ),
)]
impl Greeter {
    fn handle(_msg: Message, body: Vec<u8>) -> GuestResult {
        let args: Args = serde_json::from_slice(&body).unwrap();
        let out = serde_json::json!({ "greeting": format!("hi {}", args.name) });
        GuestResult::respond(serde_json::to_vec(&out).unwrap())
    }
}
```

Build and upload:

```bash
cargo build --release --target wasm32-unknown-unknown
# Drag target/wasm32-unknown-unknown/release/my_block.wasm
# into /b/admin/blocks/ → "Upload custom block"
```

The `skill(...)` attribute is optional. Include it to make the block
callable as a tool by the LLM block.

## 7. Verify

```bash
# Health check
curl -fsS http://localhost:8090/health   # → {"status":"ok"}

# After uploading a block, confirm it's registered
curl -fsS -u admin:PASS http://localhost:8090/b/admin/wafer \
  | jq '.blocks[].name' | grep my-org/greeter

# Call it
curl -fsS -X POST http://localhost:8090/b/my-org/greeter/ \
  -H 'Content-Type: application/json' \
  -d '{"name":"world"}'
```

If a call returns 403 with a WRAP error, you need a grant. Visit
`/b/admin/grants/` to add it.

## 8. When you're done

Solobase data is in `./data/` (SQLite + uploaded files). Snapshot or
discard the directory to capture or reset state. There is no separate
"shutdown" command — terminate the process, the data persists.

## 9. Where to read more

- Full docs: `https://solobase.dev/docs/index.md`
- Source: `https://github.com/suppers-ai/solobase`
- Existing blocks (best reference for the SDK):
  `crates/solobase-core/src/blocks/` in the main repo.
- Issues + Discord: linked from the homepage.

## 10. Honest caveat

Solobase is experimental and largely vibe-coded. Great for prototypes,
agent sandboxes, and side projects; not yet for production workloads.
Don't deploy a customer-facing app on it without reading the source.
