/// <reference types="vite/client" />

/**
 * Injected by vite.config.ts from the single .env at the project root.
 * Declaring them here is what lets the app read the restaurant name without a
 * second copy of it anywhere in the source.
 */
declare const __APP_NAME__: string;
declare const __APP_TAGLINE__: string;
declare const __APP_CURRENCY__: string;
declare const __APP_PHONE__: string;
declare const __APP_ADDRESS__: string;
declare const __APP_FOOTER_NOTE__: string;
