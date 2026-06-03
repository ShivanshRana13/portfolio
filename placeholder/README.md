# Portfolio placeholder page

View-only landing page from Figma [`148:765`](https://www.figma.com/design/AzsPDKM5dJw3QhVHMA8Qod/P?node-id=148-765&m=dev). Nothing is clickable.

## Why a separate repo?

GitHub Pages allows **one custom domain per repository**. To keep building the full portfolio while your domain shows this page:

| Site | Repository | URL |
|------|------------|-----|
| **Placeholder (public domain)** | This repo (root = these files) | `yourdomain.com` |
| **Full portfolio (in progress)** | `portfolio` repo | `username.github.io/portfolio` or `dev.yourdomain.com` |

## One-time setup

1. **Create a new GitHub repo** (e.g. `portfolio-placeholder`).
2. Copy everything inside this `placeholder/` folder to the **root** of that repo (not the folder itself).
3. **Remove the custom domain** from the main portfolio repo if it is attached there today (Settings → Pages → Custom domain → Remove).
4. In the **placeholder repo**:
   - Settings → Pages → Build and deployment → Source: **GitHub Actions**
   - Push to `main` to trigger deploy
   - Settings → Pages → Custom domain → add your domain
   - Copy `CNAME.example` → `CNAME` with your hostname, commit, push
5. **DNS** at your registrar (for apex + www, typical GitHub setup):
   - Apex (`@`): `A` records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `www`: `CNAME` → `your-user.github.io` (or the placeholder repo’s Pages URL)

## Local preview

```bash
cd placeholder
python3 -m http.server 8080
# open http://localhost:8080
```

## Keep working on the real site

Continue pushing to the main `portfolio` repo. Preview at:

- GitHub Pages default URL for that repo, or
- A subdomain (e.g. `dev.yourdomain.com`) pointing at the portfolio repo’s Pages URL

When the portfolio is ready, point the custom domain at the portfolio repo instead and retire this placeholder repo.
