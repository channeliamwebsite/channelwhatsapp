/**
 * Business and legal details for the public Privacy Policy and Terms.
 * `null` = NOT YET CONFIRMED — rendered as a visible "[To be confirmed]" placeholder.
 * Fill these in only with details confirmed by management.
 */
export const COMPANY = {
  brandName: "Channeliam",
  productName: "Channeliam WhatsApp Hub",
  legalName: "Likes and Shares" as string | null,
  registeredAddress: "Digital Hub, Kerala Startup Mission, Kalamassery, Kerala, India" as string | null,
  countryOfRegistration: "India" as string | null,
  privacyEmail: "ceo@channeliam.com" as string | null,
  legalEmail: "ceo@channeliam.com" as string | null,
  grievanceOfficerName: "Chief Executive Officer (CEO)" as string | null,
  grievanceOfficerEmail: "ceo@channeliam.com" as string | null,
  /** Not supplied yet. */
  effectiveDate: null as string | null,
  requestResponseTime: "3–4 working days" as string | null,
  deletionRequestTime: "24 hours" as string | null,
  minimumAge: "18 years" as string | null,
  workspaceTerminationRetention: "30 days" as string | null,
  /**
   * The general "30 days" retention period supplied by management does not say
   * what data it applies to, and the system has no automatic deletion. Needs
   * clarification before it can be stated.
   */
  generalRetention: null as string | null,
};

/** Facts verified in the code and infrastructure (Nov 2026). Update if the architecture changes. */
export const FACTS = {
  databaseProvider: "Google Firebase (Cloud Firestore and Firebase Authentication)",
  databaseRegion: "asia-east1 (Taiwan)",
  hostingProvider: "Vercel",
  hostingRegion: "United States (us-east, iad1)",
  messagingProvider: "Meta Platforms (WhatsApp Business Platform / Cloud API)",
  sessionCookie: "__session",
  sessionLifetime: "5 days",
};

export const hasUnconfirmedDetails = () => Object.values(COMPANY).some((v) => v === null);
