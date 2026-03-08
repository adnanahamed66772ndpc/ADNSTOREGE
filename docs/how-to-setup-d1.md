# How to set up D1 database

D1 is Cloudflare’s SQL database. The app uses it to store bucket configs and file metadata. You only need to create it once and bind it to your project.

---

## 1. Create a D1 database

### In the Cloudflare dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) and log in.
2. In the left sidebar, open **Workers & Pages** (or **Storage** → **D1** in some accounts).
3. Click the **D1** tab or **Create database**.
4. Click **Create database**.
5. Enter a name (e.g. `adnstorge-db`) and click **Create**.

### From the command line (Wrangler)

```bash
npx wrangler d1 create adnstorge-db
```

You’ll see output like:

```
✅ Successfully created DB 'adnstorge-db'
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

---

## 2. Find your D1 database ID and name

- **Database name**: The name you gave when creating (e.g. `adnstorge-db`).
- **Database ID**: A long ID like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`.

**Where to find them in the dashboard:**

1. Go to **Workers & Pages** → **D1** (or **Storage** → **D1**).
2. Click your database name.
3. The **Database ID** is shown on the database overview page (sometimes under “API” or in the URL).
4. The **name** is the title at the top.

You need the **name** when binding to Pages. The **ID** is only required if you put it in `wrangler.toml` for local dev.

---

## 3. Connect D1 to your app

### Local development (wrangler.toml)

1. Open the project file **`wrangler.toml`** in the repo root.
2. Find the block:
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "adnstorge-db"
   database_id = "placeholder"
   ```
3. Set **`database_name`** to your D1 database name (e.g. `adnstorge-db`).
4. Set **`database_id`** to your D1 **Database ID** (replace `placeholder`).
5. Save the file. When you run `npm run pages:dev`, the app will use this database.

### Deployed site (Cloudflare Pages)

1. In the dashboard, go to **Workers & Pages** → **Pages** → your project.
2. Open **Settings** → **Functions**.
3. Scroll to **D1 database bindings**.
4. Click **Add binding** (or **Edit** if one exists).
5. Set:
   - **Variable name:** `DB` (must be exactly this).
   - **D1 database:** choose your database from the list (e.g. `adnstorge-db`).
6. Click **Save**.
7. Redeploy the project so the new binding is used.

---

## 4. Initialize the database from the web

After D1 is created and bound:

1. Open your app (e.g. http://localhost:8788 or your Pages URL).
2. You’ll be redirected to **Database setup** if the tables don’t exist yet.
3. Click **Initialize database**.
4. The app will create the required tables (buckets, files, settings). No need to run `wrangler d1 execute` yourself.

---

## Summary

| What you need | Where to get it |
|---------------|-----------------|
| D1 database name | Name you gave when creating the DB (e.g. `adnstorge-db`) |
| D1 database ID | Dashboard: D1 → your database → overview / API section. Or from `wrangler d1 create` output. |
| Binding name in app | Must be **`DB`** (do not change unless you change the code). |
