# MOAI · Ideas con peso

Static website for **MOAI** (brand of SUCOSTRUCT S.A.S. B.I.C., Guayaquil). Plain semantic HTML, CSS and vanilla JavaScript, bundled with [Vite](https://vite.dev) into a static `dist/` folder that can be hosted on S3 + CloudFront or AWS Amplify.

## Project structure

```
index.html               The page (all copy and markup, SEO / Open Graph / JSON-LD tags)
src/
  styles/main.css        Design tokens, layout, components, responsive rules (breakpoint: 900px)
  scripts/main.js        Menu, hero "frentes" tower, FAQ accordion, carousel, scroll reveal
  assets/fonts/          Self-hosted WOFF2 fonts (Archivo, Instrument Serif, JetBrains Mono, Bricolage Grotesque)
  assets/images/         Optimized WebP photos in two sizes each (served via srcset)
public/                  Copied as-is to the site root: favicons, og-image.jpg, robots.txt, sitemap.xml, llms.txt, 404.html
infra/cloudformation.yml S3 + CloudFront stack
scripts/deploy.sh        Uploads dist/ to S3 with correct cache headers and invalidates CloudFront
amplify.yml              Build settings for AWS Amplify Hosting
dist/                    Build output (generated, not committed)
```

## 1. Run it locally

Requires [Node.js](https://nodejs.org) 20.19+ (22 recommended).

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:5173>. The page reloads automatically when you edit a file.

## 2. Build for production

```bash
npm run build
```

This writes the complete site to `dist/` (minified HTML/CSS/JS, content-hashed files in `dist/assets/`). To check the production build before deploying:

```bash
npm run preview
```

Open <http://localhost:4173>.

## 3. Deploy to AWS

Two good options. Pick **A** if you want the simplest "push to GitHub and it's live" flow; pick **B** if you want full control at the lowest cost.

| | A. AWS Amplify Hosting | B. S3 + CloudFront |
|---|---|---|
| Setup | A few clicks in the console | One CloudFormation stack |
| Deploys | Automatic on every `git push` | `npm run deploy` |
| HTTPS + CDN | Included | Included (CloudFront + ACM) |
| Best for | Fastest path to production | Control, lowest cost, custom caching |

### Option A — AWS Amplify (recommended to start)

1. Push this repository to GitHub (branch `main`).
2. Open the **AWS Amplify** console → **Create new app** → **GitHub** → authorize and select this repository and the `main` branch.
3. Amplify detects `amplify.yml` automatically (build command `npm run build`, output folder `dist`). Click **Save and deploy**.
4. In a few minutes the site is live at `https://main.<app-id>.amplifyapp.com`.
5. Custom domain: **Hosting → Custom domains → Add domain** → enter `moai.ec` and add the DNS records Amplify shows at your domain registrar. The SSL certificate is issued automatically.

Every later push to `main` rebuilds and redeploys the site.

### Option B — S3 + CloudFront

Architecture: a **private S3 bucket** holds the files; **CloudFront** serves them worldwide over HTTPS (HTTP/2 + HTTP/3, Brotli/gzip compression, security headers) and reads the bucket through Origin Access Control, so the bucket is never public. An **ACM certificate** provides HTTPS for the custom domain.

Prerequisite: the [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) installed and configured (`aws configure`).

**Step 1 — (custom domain only) request a certificate.** It must be in `us-east-1`, whatever region you use for the rest.

```bash
aws acm request-certificate --region us-east-1 --domain-name moai.ec --subject-alternative-names www.moai.ec --validation-method DNS
```

Open **Certificate Manager** (region us-east-1) in the console, add the CNAME records it shows to your DNS, and wait until the status is **Issued**. Copy the certificate ARN.

**Step 2 — create the infrastructure.** Replace the ARN with yours. (To try it first without a domain, drop the whole `--parameter-overrides` line; the site will be served from a `*.cloudfront.net` address.)

```bash
aws cloudformation deploy --region us-east-1 --stack-name moai-website --template-file infra/cloudformation.yml \
  --parameter-overrides DomainName=moai.ec AcmCertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/REPLACE-ME
```

**Step 3 — read the bucket name, distribution ID and CloudFront hostname.**

```bash
aws cloudformation describe-stacks --region us-east-1 --stack-name moai-website --query "Stacks[0].Outputs" --output table
```

**Step 4 — build and upload.** Use the `BucketName` and `DistributionId` values from step 3.

```bash
S3_BUCKET=your-bucket-name CLOUDFRONT_DISTRIBUTION_ID=E123EXAMPLE npm run deploy
```

The script uploads `dist/assets/*` with a one-year immutable cache, everything else with `must-revalidate`, then invalidates CloudFront. Run the same command for every future update.

**Step 5 — point the domain at CloudFront.** At your DNS provider, create records for `moai.ec` and `www.moai.ec` pointing to the `DistributionDomainName` from step 3 (in Route 53: **A/AAAA Alias** records to the distribution; elsewhere: `CNAME` for `www` and `ALIAS`/`ANAME` for the root domain).

#### Quick alternative: drag and drop

`dist/` is self-contained. You can also upload its contents to any S3 bucket with static website hosting enabled (index document `index.html`, error document `404.html`). That gives you HTTP only, with no CDN, so use it for tests rather than production.

## 4. After the site is live: SEO checklist

The site already ships with everything search engines and social platforms need (title and description, canonical URL, Open Graph and X cards, `sitemap.xml`, `robots.txt`, structured data, `llms.txt`). These steps tell Google and Bing the site exists. Do them once, after `https://moai.ec` is working.

**First, check the basics (5 minutes)**

- [ ] `https://moai.ec` opens with the padlock (HTTPS).
- [ ] `https://www.moai.ec` and `http://moai.ec` both redirect to `https://moai.ec`. In Amplify: **Hosting → Custom domains**, enable the "redirect www to root" option (or the reverse, but then tell me so the canonical URL can be changed to match).
- [ ] These open in the browser: `https://moai.ec/sitemap.xml`, `https://moai.ec/robots.txt`, `https://moai.ec/og-image.jpg`.
- [ ] A made-up address such as `https://moai.ec/no-existe` shows the "Página no encontrada" page.

**Google (10 minutes)**

- [ ] Open [Google Search Console](https://search.google.com/search-console) → **Add property** → choose **Domain** and enter `moai.ec`.
- [ ] Google shows a `TXT` record. Add it at your DNS provider (Route 53 or wherever the domain lives), then click **Verify**. DNS can take from a few minutes to a few hours.
- [ ] In the left menu, **Sitemaps** → enter `sitemap.xml` → **Submit**.
- [ ] In the top search bar, paste `https://moai.ec/` → **Request indexing**.

**Bing (5 minutes)** — also feeds DuckDuckGo, Yahoo and ChatGPT search.

- [ ] Open [Bing Webmaster Tools](https://www.bing.com/webmasters) → sign in → **Import from Google Search Console** (fastest; it copies the verification and sitemap).
- [ ] If you add the site manually instead: verify it, then **Sitemaps → Submit sitemap** → `https://moai.ec/sitemap.xml`.

**Test how it looks and scores**

- [ ] [Rich Results Test](https://search.google.com/test/rich-results): paste `https://moai.ec/` and confirm the structured data is read with no errors.
- [ ] [PageSpeed Insights](https://pagespeed.web.dev/): paste `https://moai.ec/`. The local production build scores 100 for Performance, Best Practices and SEO.
- [ ] [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) and [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/): paste `https://moai.ec/` to preview the share card and refresh their cache.
- [ ] Send the link to yourself on WhatsApp to see the preview. WhatsApp caches previews, so after changing `og-image.jpg` add `?v=2` to the link when testing.

**Help Google connect the brand (optional but worth it)**

- [ ] Create a [Google Business Profile](https://www.google.com/business/) for MOAI in Guayaquil. This is what puts the company on Google Maps and in the side panel of search results.
- [ ] Add `https://moai.ec` to the company's LinkedIn page and other profiles. When those profiles exist, send me the links so they can be added to the structured data (`sameAs`).

**What to expect**

- The site usually appears in Google within a few days to two weeks. Search for `site:moai.ec` to check.
- In Search Console, look at **Pages** (is the page indexed?) and **Performance** (which searches show the site) after a couple of weeks.

**When you change the site later**

- Update the `<lastmod>` date in `public/sitemap.xml`.
- If you change the FAQ text, update the matching block in the structured data in `index.html`, and `public/llms.txt` if the services change.
- To replace the share image, save a **1200 × 630 px** JPG (under 300 KB) as `public/og-image.jpg`.

## Notes

- **Domain:** canonical URL, Open Graph tags, `robots.txt` and `sitemap.xml` assume `https://moai.ec`. If the domain changes, update `index.html`, `public/robots.txt`, `public/sitemap.xml` and `public/llms.txt`.
- **Editing copy:** all text lives in `index.html`. The FAQ also appears in the `FAQPage` JSON-LD block in `<head>`; keep both in sync.
- **Images:** photos are pre-optimized WebP. To replace one, export it at the same widths (see file names in `src/assets/images/`) and keep the file names, or update the `src`/`srcset` in `index.html`.
- **Accessibility / motion:** animations are disabled for visitors with `prefers-reduced-motion`; content stays readable with JavaScript turned off.
