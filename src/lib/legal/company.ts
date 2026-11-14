/**
 * Business and legal details for the public Privacy Policy and Terms.
 * `null` = NOT YET CONFIRMED — rendered as a visible "[To be confirmed]" placeholder.
 * Fill these in only with details confirmed by management.
 */
export const COMPANY = {
  brandName: "Channeliam",
  productName: "Channeliam WhatsApp Hub",
  legalName: null as string | null,
  registeredAddress: null as string | null,
  countryOfRegistration: null as string | null,
  privacyEmail: null as string | null,
  legalEmail: null as string | null,
  grievanceOfficerName: null as string | null,
  grievanceOfficerEmail: null as string | null,
  governingLaw: null as string | null,
  courts: null as string | null,
  effectiveDate: null as string | null,
  /** Time to respond to privacy requests, e.g. "30 days". */
  requestResponseTime: null as string | null,
  /** Minimum age for contacts, if any. */
  minimumAge: null as string | null,
  /** Retention periods agreed with management (none are automated today). */
  retentionPeriods: null as string | null,
  /** How related records (messages, campaign/click/activity records) are handled on a deletion request. */
  relatedRecordsDeletion: null as string | null,
  /** Data export / handover terms when a workspace is terminated. */
  terminationDataExport: null as string | null,
  /** Total liability cap in the Terms. */
  liabilityCap: null as string | null,
  /** Whether client organisations sign a data-processing agreement. */
  processorAgreement: null as string | null,
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
