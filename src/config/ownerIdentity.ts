export const OWNER_EMAIL = "irhaapparelsofficial@gmail.com";

export const OWNER_AUTH_UI_POLICY = Object.freeze({
  // Public feature gates, never credentials. Flip only after the provider has been
  // configured and a controlled owner test has produced exact success evidence.
  emailDeliveryVerified: false,
  googleOAuthVerified: false,
});

export function isOwnerEmail(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() === OWNER_EMAIL;
}
