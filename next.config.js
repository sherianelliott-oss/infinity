/** @type {import('next').NextConfig} */
const isSandboxPreview = process.env.BASE44_PREVIEW_MODE === '1';
const previewHostSuffix = process.env.BASE44_PUBLIC_HOST_SUFFIX;

const nextConfig = {
  transpilePackages: ['@deriv/core'],
  // Sandbox previews are served from https://3000-<suffix>. Next.js gates dev
  // assets and HMR by Origin, so that origin must be allowlisted explicitly.
  // Unset BASE44_PREVIEW_MODE keeps the default (no allowlist) behaviour.
  ...(isSandboxPreview && previewHostSuffix
    ? { allowedDevOrigins: [`3000-${previewHostSuffix}`] }
    : {}),
}

module.exports = nextConfig
