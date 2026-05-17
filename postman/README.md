# Postman

Generated from `lib/api-spec/openapi.yaml`.

## Import

1. Postman → **Import** → drag in `Market-Mind-PM.postman_collection.json`.
2. Import `Market-Mind-PM.local.postman_environment.json`, select it in the environment dropdown.
3. Call **Login** or **Register**, copy the `token` from the response into the environment variable **`bearerToken`** (collection auth uses Bearer).

## `baseUrl`

The local environment defaults to **`http://127.0.0.1:8081/api`** (Spring Boot `PORT` + `context-path`). For the Node API or another host, edit **`baseUrl`** in your environment (must include the `/api` path prefix when the server mounts routes there).

## Regenerate the collection

From the repo root:

```bash
npx openapi-to-postmanv2 -s lib/api-spec/openapi.yaml -o postman/Market-Mind-PM.postman_collection.json -p
```
