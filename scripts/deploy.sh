#!/usr/bin/env bash
# Upload dist/ to S3 and invalidate CloudFront.
# Usage: S3_BUCKET=my-bucket CLOUDFRONT_DISTRIBUTION_ID=E123ABC bash scripts/deploy.sh
set -euo pipefail

: "${S3_BUCKET:?Set S3_BUCKET to the name of the site bucket}"
DIST_DIR="${DIST_DIR:-dist}"

[ -f "$DIST_DIR/index.html" ] || { echo "No $DIST_DIR/index.html — run 'npm run build' first." >&2; exit 1; }

# 1. Fingerprinted assets (hash in the filename): cache for a year.
aws s3 sync "$DIST_DIR/assets" "s3://$S3_BUCKET/assets" \
  --delete --cache-control "public, max-age=31536000, immutable"

# 2. Everything else (HTML, favicon, robots, sitemap, og-image): always revalidate.
aws s3 sync "$DIST_DIR" "s3://$S3_BUCKET" \
  --delete --exclude "assets/*" --cache-control "public, max-age=0, must-revalidate"

# 3. Refresh the CDN.
if [ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]; then
  aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" --paths "/*" \
    --query 'Invalidation.Id' --output text
else
  echo "CLOUDFRONT_DISTRIBUTION_ID not set — skipped CloudFront invalidation."
fi

echo "Deployed $DIST_DIR to s3://$S3_BUCKET"
