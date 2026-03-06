/// <reference types="astro/client" />
/// <reference types="vite-plugin-svgr/client" />

declare namespace App {
  interface Locals {
    user?: {
      name: string;
      email: string;
    };

    accessToken?: string;
  }
}
