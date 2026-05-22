# Deploy to Netlify — `englishgeeks.aigine.com`

English Geeks is a static Vite app. Netlify builds `dist/` from Git. DNS for `aigine.com` stays on **Alibaba Cloud DNS**; only a **CNAME** points the subdomain to Netlify.

## Prerequisites

- GitHub repo: `https://github.com/oliverxuyong/english-geeks`
- Domain `aigine.com` with DNS managed in [Alibaba Cloud DNS](https://dns.console.aliyun.com/)
- Netlify account (free tier is enough)

## 1. Connect Netlify to GitHub

1. Log in to [Netlify](https://app.netlify.com/).
2. **Add new site** → **Import an existing project** → **GitHub**.
3. Authorize GitHub if prompted, then select **english-geeks**.
4. Branch: use the branch you deploy from (e.g. `main` or `cursordoeseverything` until merged).
5. Build settings are read from `netlify.toml` in the repo root:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node: 20
6. Click **Deploy site**. Wait until the deploy is **Published** (green).
7. Note the default URL, e.g. `https://random-name-123.netlify.app` — you need it for DNS.

## 2. Add custom domain on Netlify

1. Site → **Domain management** → **Add a domain** → **Add a domain you already own**.
2. Enter: `englishgeeks.aigine.com` (subdomain only for now; root `aigine.com` is optional later).
3. Netlify will show **DNS configuration** — typically:
   - **Recommended:** CNAME  
     - Host / name: `englishgeeks`  
     - Value / target: `<your-site>.netlify.app` (copy from Netlify UI)
4. Leave the domain on Netlify as **Primary** for this site if offered.
5. Netlify will provision **HTTPS** (Let’s Encrypt) after DNS propagates.

## 3. Alibaba Cloud DNS record

1. Open **云解析 DNS** → domain **aigine.com** → **解析设置** → **添加记录**.
2. Add one record (values must match Netlify’s panel):

| 主机记录 | 记录类型 | 解析线路 | 记录值 |
|----------|----------|----------|--------|
| `englishgeeks` | **CNAME** | 默认 | `<your-site>.netlify.app` |

3. TTL: **600** (10 min) while testing; later **3600** is fine.
4. Do **not** add a conflicting A record for `englishgeeks` unless Netlify explicitly asks for it.
5. Save. Propagation often takes **10–30 minutes** (sometimes up to a few hours).

## 4. Verify

- [ ] `https://englishgeeks.aigine.com` opens the app (padlock / valid certificate).
- [ ] `https://<your-site>.netlify.app` still works (Netlify default URL).
- [ ] Audio plays (🔊) on a lesson step.
- [ ] On iPhone **Safari**, tap **Speak** → microphone permission appears (HTTPS required).
- [ ] Open the same URL inside WeChat if you share it there.

Useful checks:

```bash
dig englishgeeks.aigine.com CNAME +short
curl -sI https://englishgeeks.aigine.com | head -5
```

## 5. Later: Tencent Cloud (China)

When ready, deploy the **same** `dist/` to Tencent static hosting and add an Alibaba **split DNS** record (境内 → Tencent, 默认/境外 → Netlify). See README deployment notes. ICP may be required for mainland custom domain on Tencent.

## Troubleshooting

| Issue | What to do |
|-------|------------|
| Netlify: “DNS verification failed” | Wait longer; confirm CNAME host is `englishgeeks` not `englishgeeks.aigine.com` in the “主机记录” field (Alibaba uses short host names). |
| Certificate pending | DNS must point to Netlify first; remove old A/CNAME conflicts. |
| 404 on refresh | `netlify.toml` includes SPA redirect to `index.html`. Redeploy after pulling latest repo. |
| Build fails on Netlify | Ensure `package-lock.json` is committed; Node 20 is set in `netlify.toml`. |

## Repo files

- `netlify.toml` — build + publish + SPA redirect
- This doc — DNS and console steps
