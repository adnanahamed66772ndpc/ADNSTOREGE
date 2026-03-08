# How to deploy to Cloudflare Workers & Pages

This app runs as **Cloudflare Pages** (frontend + Functions). Pages runs on Workers, so “deploy to Workers and Pages” means: deploy the Pages project. Follow one of the two ways below.

---

## Option A: Deploy from the Cloudflare dashboard (recommended)

No API token or CLI login on your machine. Cloudflare builds and deploys from your GitHub repo.

1. **Connect the repo**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages**.
   - Click **Create** → **Pages** → **Connect to Git**.
   - Choose **GitHub** and authorize Cloudflare if asked.
   - Select the repo: `adnanahamed66772ndpc/ADNSTOREGE`.

2. **Configure the build**
   - **Project name**: e.g. `adnstorge` (or any name you like).
   - **Production branch**: `master` (or `main` if you use that).
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - Click **Save and Deploy**.

3. **Bind D1 to the project**
   - After the first deploy, open your Pages project.
   - Go to **Settings** → **Functions**.
   - Under **D1 database bindings**, click **Add binding**.
   - **Variable name**: `DB` (must be exactly `DB`).
   - **D1 database**: create one or select existing (e.g. `adnstorge-db`).
   - Save. Redeploy once (e.g. **Deployments** → **Retry deployment** or push a new commit).

4. **Open the site**
   - Your URL will be like `https://adnstorge.pages.dev` (or your custom domain).
   - Go to **Database setup** in the app and click **Initialize database**, then add buckets in **Settings**.

---

## Option B: Deploy from your machine (Wrangler CLI)

You need to be logged in to Cloudflare from the terminal.

1. **Log in to Cloudflare** (run in a real terminal, not non-interactive):
   ```bash
   npx wrangler login
   ```
   A browser window will open; sign in and allow Wrangler.

2. **Create D1** (if you haven’t):
   ```bash
   npm run db:create
   ```
   Copy the `database_id` into `wrangler.toml` (replace `placeholder` under `[[d1_databases]]`).

3. **Deploy**
   ```bash
   npm run pages:deploy
   ```
   This runs `npm run build` and then `wrangler pages deploy dist --project-name=adnstorge`. The first time it may ask you to create or link the Pages project.

4. **If you use the dashboard for D1**
   - You can still create and bind D1 in **Workers & Pages** → your project → **Settings** → **Functions** → D1 binding `DB`. Then redeploy from the dashboard or run `npm run pages:deploy` again.

---

## Using an API token (CI / non-interactive)

For scripts or CI (e.g. GitHub Actions), use an API token instead of `wrangler login`:

1. Create a token: [Create API Token](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → use the “Edit Cloudflare Workers” template (or custom with **Account** → **Cloudflare Pages: Edit**, **Account** → **D1: Edit**).
2. Set the token in the environment:
   - **Windows (PowerShell):** `$env:CLOUDFLARE_API_TOKEN = "your-token"`
   - **Linux/macOS:** `export CLOUDFLARE_API_TOKEN=your-token`
3. Run:
   ```bash
   npm run pages:deploy
   ```

Never commit the token to the repo; use secrets in CI (e.g. GitHub Actions secrets).

---

## Summary

| Method              | When to use                          |
|---------------------|--------------------------------------|
| Dashboard + Git     | Easiest; auto deploy on every push   |
| Wrangler CLI        | Deploy from your PC after `wrangler login` |
| API token           | Scripts, CI, non-interactive deploy  |

After deploy, always bind **D1** with variable name **`DB`** in **Settings → Functions** (dashboard) or via `database_id` in `wrangler.toml` (CLI), then open the site and run **Database setup** → **Initialize database**.
