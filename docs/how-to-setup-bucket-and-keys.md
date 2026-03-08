# How to set up R2 bucket and find keys

The app stores files in Cloudflare R2 buckets. You add each bucket and its keys in the app’s **Settings** (no env vars). This guide shows how to create an R2 bucket and get the **endpoint**, **access key**, and **secret key** you need.

---

## 1. Create an R2 bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) and log in.
2. In the left sidebar, open **R2** (under “Storage” or “Object Storage”).
3. Click **Create bucket**.
4. Enter a **bucket name** (e.g. `my-files`). Remember this; you’ll use it in the app as “Bucket name”.
5. Choose a location if asked (optional).
6. Click **Create bucket**.

You now have a bucket. Next you need API credentials so the app can read/write to it.

---

## 2. Get R2 API keys (access key and secret key)

R2 uses **API tokens** that give an **Access Key ID** and **Secret Access Key** (S3-compatible).

1. In the dashboard, go to **R2**.
2. In the right-hand menu, click **Manage R2 API Tokens** (or **Overview** → **Manage API Tokens**).
3. Click **Create API token**.
4. Give the token a name (e.g. `adnstorge-app`).
5. **Permissions:** choose:
   - **Object Read & Write** (so the app can upload, download, delete), or
   - **Edit** if you want full R2 access for this token.
6. Optionally restrict to specific buckets (e.g. only `my-files`).
7. Click **Create API token**.
8. On the next screen you’ll see:
   - **Access Key ID** (long string)
   - **Secret Access Key** (long string)

**Important:** Copy both and store them somewhere safe. The **Secret Access Key** is shown only once. If you lose it, create a new API token.

---

## 3. Find the R2 endpoint (S3 API endpoint)

The app needs the **S3-compatible API endpoint** for your account so it can talk to R2.

1. In the dashboard, go to **R2**.
2. Click **Manage R2 API Tokens** (same place as above).
3. On that page you should see **S3 API** or **Endpoint** information.
4. The endpoint is usually in one of these forms:
   - `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   - Or shown as “S3 API endpoint” with your account ID.

**How to get your Account ID:**

- In the dashboard, look at the URL when you’re in R2 or any Cloudflare product:  
  `https://dash.cloudflare.com/<ACCOUNT_ID>/r2/...`
- Or go to **Workers & Pages** → **Overview**; the account ID is often shown there.

Then the endpoint is:

```text
https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com
```

Example: if your account ID is `abc123def456`, the endpoint is:

```text
https://abc123def456.r2.cloudflarestorage.com
```

---

## 4. Add the bucket in the app

1. Open your app → **Settings**.
2. In “Add bucket” (or “Edit bucket”), fill in:

| Field | What to put |
|-------|-----------------------------|
| **Display name** | Any label (e.g. “My storage”). |
| **R2 endpoint** | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| **Access key** | The **Access Key ID** from the R2 API token. |
| **Secret key** | The **Secret Access Key** from the R2 API token. |
| **Bucket name (R2)** | The exact **bucket name** you created in R2 (e.g. `my-files`). |
| **Storage limit (GB)** | e.g. `9` (per-bucket limit in the app). |

3. Click **Add bucket** (or **Update** if editing).

The app will use these to connect to R2 via the S3 API. You can add more buckets (and more API tokens if you use multiple accounts).

---

## 5. Quick reference: where to find what

| What you need | Where to find it |
|---------------|------------------|
| **Bucket name** | R2 → your bucket → name at the top (e.g. `my-files`). |
| **Access key** | R2 → Manage R2 API Tokens → Create API token → **Access Key ID** (copy when shown). |
| **Secret key** | Same page, **Secret Access Key** (copy once; not shown again). |
| **Endpoint** | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`. Get **Account ID** from the dashboard URL or R2/Workers overview. |

---

## 6. Multiple buckets or multiple Cloudflare accounts

- **Several buckets, same account:** Create one API token with access to all those buckets (or one token per bucket). Use the same **endpoint** for all; only **bucket name** and optionally **access key** / **secret key** change per bucket.
- **Different Cloudflare account:** Create a bucket and API token in that account, then add a second “bucket” in the app with that account’s **endpoint**, **access key**, **secret key**, and **bucket name**.

All of this is configured in the app’s **Settings**; no code or env vars needed.
