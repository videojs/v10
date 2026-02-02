/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user?: {
      name: string;
      email: string;
    };

    accessToken?: string;
  }
}
