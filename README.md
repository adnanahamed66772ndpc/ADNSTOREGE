# ADN Storage

Web file storage using Cloudflare R2 (S3 API), D1, and Pages. Multiple buckets (including different accounts), file-system UI, chunked uploads (5 MB+), file preview, and full web-based configuration.

**Setup guides:** See the [**docs/**](docs/) folder for step-by-step instructions:
- [How to set up D1 database](docs/how-to-setup-d1.md) – create D1, find database ID, bind to app
- [How to set up bucket and keys](docs/how-to-setup-bucket-and-keys.md) – create R2 bucket, find endpoint, access key, secret key  
- **বাংলা:** [docs/bangla/](docs/bangla/) – D1 ও বাকেট/কী সেটআপ (বাংলায়)

## How to add D1 with your site

D1 is the database the app uses for buckets and file metadata. You can set it up in two ways.

### Option A: Local development

1. Create a D1 database in your Cloudflare account:
   ```bash
   npm run db:create
   ```
   Or with Wrangler directly:
   ```bash
   npx wrangler d1 create adnstorge-db
   ```

2. Copy the **database_id** from the output (looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

3. Put it in `wrangler.toml`: open the file and replace `placeholder` with your ID:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "adnstorge-db"
   database_id = "your-database-id-here"
   ```

4. Run the app and initialize the DB from the web (no need to run migrations by hand):
   ```bash
   npm run build
   npm run pages:dev
   ```
   Open http://localhost:8788 → you’ll be sent to **Database setup** → click **Initialize database**. Done.

### Option B: Deployed site (Cloudflare Pages)

1. In the [Cloudflare dashboard](https://dash.cloudflare.com), go to **Workers & Pages** → your project (or create a Pages project and connect your repo).

2. Create a D1 database:
   - Go to **Workers & Pages** → **Overview** → **D1** in the left sidebar (or **Storage** → **D1**).
   - Click **Create database**.
   - Name it (e.g. `adnstorge-db`) and create it.
   - Open the new database and copy its **Database ID** (or note the name).

3. Bind D1 to your Pages project:
   - Open your **Pages** project.
   - Go to **Settings** → **Functions**.
   - Under **D1 database bindings**, click **Add binding**.
   - **Variable name**: `DB` (must be exactly `DB`).
   - **D1 database**: select the database you created (e.g. `adnstorge-db`).
   - Save.

4. Deploy (or trigger a new deployment). Then open your site → you’ll see **Database setup** → click **Initialize database**. No `wrangler` or migrations needed on your machine.

### Summary

| Step              | Local                          | Deployed (Pages)                          |
|-------------------|--------------------------------|-------------------------------------------|
| Create D1         | `npm run db:create`            | Dashboard: D1 → Create database           |
| Link to app       | Set `database_id` in `wrangler.toml` | Pages → Settings → Functions → D1 binding `DB` |
| Create tables     | Open app → Setup → Initialize  | Open site → Setup → Initialize            |

The app expects the binding name **`DB`**. Don’t change it unless you also change it in the code.

---

## Setup (detailed)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create D1** and link it (see “How to add D1 with your site” above).

3. **Build and run locally**
   ```bash
   npm run build
   npm run pages:dev
   ```
   Open the URL (e.g. http://localhost:8788), then use **Database setup** in the app to initialize the schema.

   Optional: run migrations by hand instead of using the web setup:
   - Local DB: `npm run db:migrate:local`
   - Remote DB: `npm run db:migrate`

## Deploy (Cloudflare Pages)

1. Connect the repo to Cloudflare Pages:
   - Build command: `npm run build`
   - Build output directory: `dist`

2. Add the D1 binding (see “How to add D1 with your site” above): **Settings → Functions → D1 database bindings** → Variable name **`DB`**, select your database.

3. Deploy. Open your site, go to **Database setup**, click **Initialize database**, then add buckets in **Settings**.

## Adding R2 buckets

In the app, go to **Settings** and add a bucket:

- **Display name**: Any label.
- **R2 endpoint**: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` (from Cloudflare R2 → Manage R2 API Tokens; use the S3 API endpoint).
- **Access key** / **Secret key**: From the same R2 API token.
- **Bucket name**: The R2 bucket name.
- **Storage limit (GB)**: Default 9 GB per bucket.

Chunk size for large uploads is 5 MB (minimum for R2/S3 multipart).
