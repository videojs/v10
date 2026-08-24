import { readFileSync } from 'node:fs';

import basicSsl from '@vitejs/plugin-basic-ssl';
import { mergeConfig } from 'vite';

import baseConfig from './vite.config';

/**
 * The sandbox over TLS, for smoke-testing anything that needs a secure context
 * from another device — EME above all. `localhost` is already a trustworthy
 * origin, so plain `pnpm dev:sandbox` is enough on this machine; a phone or a
 * second box reaches the dev server by LAN IP, which is not, and there is no
 * iOS Safari equivalent of Chromium's insecure-origin flag.
 *
 * Derived from the base config rather than folded into it, so the everyday
 * localhost flow never grows a certificate interstitial.
 *
 * The certificate is self-signed, which every browser will warn about once per
 * device. Set `SANDBOX_HTTPS_CERT` and `SANDBOX_HTTPS_KEY` to serve a trusted
 * one instead (`mkcert` and friends) — worth doing when a warning-free origin
 * is load-bearing rather than merely inconvenient, as it may be for
 * hardware-backed DRM.
 */
const cert = process.env.SANDBOX_HTTPS_CERT;
const key = process.env.SANDBOX_HTTPS_KEY;

export default mergeConfig(
  baseConfig,
  cert && key ? { server: { https: { cert: readFileSync(cert), key: readFileSync(key) } } } : { plugins: [basicSsl()] }
);
