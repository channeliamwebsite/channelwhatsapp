import type { Metadata } from "next";
import Link from "next/link";

import { Detail, LegalDocument, type LegalSection } from "@/components/legal/legal-document";
import { COMPANY, FACTS } from "@/lib/legal/company";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${COMPANY.productName} collects, uses, stores and shares personal data.`,
  robots: { index: true, follow: true },
};

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          {COMPANY.productName} (the “Service”) is a WhatsApp communication and automation platform operated by{" "}
          <Detail value={COMPANY.legalName} label="legal company name" />, registered at{" "}
          <Detail value={COMPANY.registeredAddress} label="registered address" /> (“{COMPANY.brandName}”, “we”, “us”).
        </p>
        <p>
          The Service is used by {COMPANY.brandName} to manage WhatsApp communication for its own brands and for client organisations (“Clients”). Each Client’s data is kept in a separate workspace.
        </p>
      </>
    ),
  },
  {
    id: "scope",
    title: "Who this policy covers",
    body: (
      <ul>
        <li><strong>The administrator</strong> — the single authorised operator account that signs in to the Service. There is no public sign-up.</li>
        <li><strong>Contacts</strong> — people whose details are added to a workspace and who may receive or send WhatsApp messages through the Service.</li>
        <li><strong>Visitors of tracked links</strong> — people who open a link sent in a campaign message.</li>
        <li>
          <strong>Clients</strong> — organisations on whose behalf {COMPANY.brandName} operates a workspace. For contact data in a Client workspace,{" "}
          {COMPANY.brandName} acts on the Client’s instructions; the Client decides why contacts are messaged.{" "}
          <Detail value={COMPANY.processorAgreement} label="whether Clients sign a data-processing agreement, and the controller/processor roles" />
        </li>
      </ul>
    ),
  },
  {
    id: "data-we-collect",
    title: "Data we collect",
    body: (
      <>
        <p><strong>Contact information</strong> (entered by the administrator or imported from a file):</p>
        <ul>
          <li>Name, WhatsApp phone number (stored in international format, with its country calling code), email address, country and city.</li>
          <li>Organisation, designation, audience groups, tags and optional custom fields.</li>
          <li>WhatsApp opt-in status, consent source, consent date, opt-in/opt-out timestamps and a history of consent changes.</li>
          <li>Record creation and update times.</li>
        </ul>
        <p><strong>Messages and activity:</strong></p>
        <ul>
          <li>WhatsApp messages exchanged through the Service: text, message type, WhatsApp message identifier, delivery status (sent, delivered, read, failed) and timestamps.</li>
          <li>For media messages (images, documents, audio, video) we store the media identifier, file type, file name and caption provided by WhatsApp. We do not download or store the media files themselves.</li>
          <li>Campaign participation: which messages a contact was sent, delivery and read status, replies, link clicks, conversions and opt-outs.</li>
        </ul>
        <p><strong>Link clicks:</strong> when a tracked link is opened we record the workspace, campaign, contact, message step, destination address, time and the browser’s user-agent string (first 200 characters). We do not record the visitor’s IP address for link clicks.</p>
        <p><strong>Administrator account:</strong> email address and sign-in through Firebase Authentication (passwords are handled by Firebase, not stored by the Service); an audit log of important actions with time, the administrator’s email and, for sign-in events, the IP address. To limit sign-in attempts, the sign-in IP address is also stored as a one-way hash with an attempt counter.</p>
        <p>We do not use analytics, advertising or third-party tracking scripts.</p>
      </>
    ),
  },
  {
    id: "how-collected",
    title: "How data is collected",
    body: (
      <ul>
        <li><strong>Entered manually</strong> by the administrator.</li>
        <li>
          <strong>CSV / Excel import.</strong> Files are read inside the administrator’s browser. Only the mapped contact fields are sent to and stored by the Service; the file itself is not uploaded or stored. Rows with invalid phone numbers are skipped; rows matching an existing phone number are either skipped or used to update that contact, as chosen during import.
        </li>
        <li><strong>From WhatsApp</strong>, when a contact sends a message to a connected business number. If the sender is not yet a contact, a contact record is created with “pending” consent — it is not treated as marketing consent.</li>
        <li><strong>From Meta</strong>, as delivery and read notifications for messages we sent.</li>
        <li><strong>From tracked links</strong> opened by recipients.</li>
      </ul>
    ),
  },
  {
    id: "purposes",
    title: "How we use data",
    body: (
      <>
        <ul>
          <li>To send WhatsApp messages and campaigns to contacts who have given consent, and to reply to messages contacts send.</li>
          <li>To run up to three-step message sequences that depend on whether a previous message was delivered, read, clicked or replied to.</li>
          <li>To record and honour consent and opt-outs.</li>
          <li>To show delivery, engagement and campaign reports to the administrator.</li>
          <li>To secure the Service (authentication, rate limiting, audit logs).</li>
        </ul>
        <p>Marketing messages are sent only to contacts recorded as opted in with a consent source and date. We do not sell personal data or use it for advertising.</p>
      </>
    ),
  },
  {
    id: "whatsapp",
    title: "WhatsApp and Meta",
    body: (
      <>
        <p>
          Messages are sent and received through the {FACTS.messagingProvider}. To deliver a message, the recipient’s phone number and the message content are sent to Meta. Meta sends us messages from contacts and delivery/read notifications. Meta processes this data under its own terms and privacy policy.
        </p>
        <p>
          Promotional messages outside WhatsApp’s 24-hour customer service window use message templates approved by Meta. Free-form replies are sent only within that window.
        </p>
      </>
    ),
  },
  {
    id: "consent",
    title: "Consent and opting out",
    body: (
      <>
        <p>
          A contact can stop messages at any time by replying <strong>STOP</strong>, <strong>UNSUBSCRIBE</strong>, <strong>CANCEL</strong>, <strong>END</strong> or <strong>QUIT</strong>, or by tapping an opt-out button where offered. The contact is then marked as opted out, the change is added to their consent history, any active message sequence stops, and the Service blocks further campaign and automated messages to them.
        </p>
        <p>Opt-outs reported by Meta (for example, a person stopping marketing messages from the business inside WhatsApp) are also recorded.</p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share data with",
    body: (
      <>
        <p>We use these service providers to run the Service:</p>
        <ul>
          <li><strong>Google Firebase</strong> — database and administrator authentication ({FACTS.databaseProvider}).</li>
          <li><strong>{FACTS.hostingProvider}</strong> — application hosting.</li>
          <li><strong>Meta</strong> — WhatsApp message delivery, as described above.</li>
        </ul>
        <p>Contact data in a Client workspace is available to that Client through the Service operator. We do not sell or rent personal data. We may disclose data where required by law.</p>
      </>
    ),
  },
  {
    id: "transfers",
    title: "Where data is stored",
    body: (
      <p>
        The database is hosted in Google Cloud region <strong>{FACTS.databaseRegion}</strong>. The application runs on {FACTS.hostingProvider} servers in the <strong>{FACTS.hostingRegion}</strong>. WhatsApp messages are processed by Meta, which may process data in other countries. Personal data may therefore be transferred outside the country where it was collected.
      </p>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <>
        <p>Measures in place:</p>
        <ul>
          <li>All connections use HTTPS.</li>
          <li>Data is read and written only by the application server after the administrator’s session is verified; the database rejects direct access from browsers.</li>
          <li>A single administrator account; sign-in sessions use secure, HTTP-only cookies and are checked on every request.</li>
          <li>Sign-in attempts and changes are rate-limited; important actions are recorded in an audit log.</li>
          <li>Each workspace’s data is kept separate and checked on the server.</li>
          <li>WhatsApp access tokens and secrets are kept in server configuration, not in the database or the browser.</li>
          <li>Messages arriving from Meta are accepted only with a valid Meta signature; tracked links are digitally signed so they cannot be altered.</li>
        </ul>
        <p>No system is completely secure, and we cannot guarantee absolute security.</p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep data",
    body: (
      <>
        <p>
          The Service does not currently delete data automatically on a schedule. Contact records, messages, campaign records, link clicks, activity and audit logs are kept until they are deleted by the administrator or the workspace is deleted.
        </p>
        <p>
          Planned retention periods: <Detail value={COMPANY.retentionPeriods} label="retention periods" />
        </p>
      </>
    ),
  },
  {
    id: "data-deletion",
    title: "Your rights and data deletion",
    body: (
      <>
        <p>
          You can ask us to access, correct or delete your personal data, or to stop messaging you. Send requests to <Detail value={COMPANY.privacyEmail} label="privacy contact email" />. We will respond within <Detail value={COMPANY.requestResponseTime} label="response time" />.
        </p>
        <p><strong>What deletion covers today:</strong></p>
        <ul>
          <li>Deleting a contact removes the contact record: name, phone number, email, location, organisation, groups, tags, custom fields and consent history.</li>
          <li>
            It does <strong>not</strong> currently remove related records linked to that contact — conversation messages, campaign participation records, link-click records, activity entries and automation history. How these related records are handled when you request deletion: <Detail value={COMPANY.relatedRecordsDeletion} label="deletion procedure for related records" />
          </li>
          <li>Deleting a workspace permanently removes all data in that workspace.</li>
        </ul>
        <p>Messages already delivered to your WhatsApp account, and data held by Meta, are governed by WhatsApp’s own policies.</p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and browser storage",
    body: (
      <p>
        The administrator area uses one strictly necessary cookie (<code className="rounded bg-muted px-1 text-[13px]">{FACTS.sessionCookie}</code>, valid for {FACTS.sessionLifetime}) to keep the administrator signed in, and stores display preferences (such as the selected workspace) in the browser. Contacts and visitors of tracked links and these legal pages are not given cookies by the Service.
      </p>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        The Service is not directed at children. Minimum age for contacts: <Detail value={COMPANY.minimumAge} label="minimum age" />.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: <p>We will update this page when our practices change and revise the effective date above.</p>,
  },
  {
    id: "contact",
    title: "Contact and grievances",
    body: (
      <ul>
        <li>Privacy enquiries: <Detail value={COMPANY.privacyEmail} label="privacy contact email" /></li>
        <li>
          Grievance Officer: <Detail value={COMPANY.grievanceOfficerName} label="Grievance Officer name" />, <Detail value={COMPANY.grievanceOfficerEmail} label="Grievance Officer email" />
        </li>
        <li>Postal address: <Detail value={COMPANY.registeredAddress} label="registered address" /></li>
        <li>See also our <Link href="/terms-of-service" className="text-primary underline-offset-4 hover:underline">Terms of Service</Link>.</li>
      </ul>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      summary={
        <p>
          This policy explains what personal data {COMPANY.productName} collects, how it is used for WhatsApp messaging, where it is stored, who it is shared with, and the choices people have — including how to stop messages and request deletion.
        </p>
      }
      sections={sections}
    />
  );
}
