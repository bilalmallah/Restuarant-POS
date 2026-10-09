/**
 * The single place the app reads its own identity from.
 *
 * These values are compiled in from the ONE .env at the project root (see
 * vite.config.ts), so changing APP_NAME there renames the login screen, the
 * sidebar, the browser tab, every printed receipt and every report header.
 * Nothing else in the frontend should hardcode the restaurant name.
 */
export const brand = {
  name: __APP_NAME__,
  tagline: __APP_TAGLINE__,
  currency: __APP_CURRENCY__,
  phone: __APP_PHONE__,
  address: __APP_ADDRESS__,
  footerNote: __APP_FOOTER_NOTE__,
} as const;

/** Initials for the sidebar badge: "Sindhu Fish Point" -> "SF". */
export const brandInitials = brand.name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((word) => word[0]?.toUpperCase() ?? "")
  .join("");

export default brand;
