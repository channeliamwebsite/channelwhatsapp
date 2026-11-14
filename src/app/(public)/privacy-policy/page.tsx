import type { Metadata } from "next";
import Link from "next/link";

import { Detail, LegalDocument, type LegalSection } from "@/components/legal/legal-document";
import { COMPANY, FACTS } from "@/lib/legal/company";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${COMPANY.productName} collects, uses, stores and shares personal data.`,
  robots: { index: true, follow: true },
};

const mail = (address: string | null, label: string) =>
  address ? <a href={`mailto:${address}`} className="text-primary underline-offset-4 hover:underline">{address}</a> : <Detail value={null} label={label} />;

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          {COMPANY.productName} (the “Service”) is a WhatsApp communication and automation platform operated by{" "}
          <strong><Detail value={COMPANY.legalName} label="legal company name" /></strong>, {" "}
          <Detail value={COMPANY.registeredAddress} label="registered address" /> (“{COMPANY.brandName}”, “we”, “us”), registered in{" "}
          <Detail value={COMPANY.countryOfRegistration} label="country of registration" />.
        </p>
        <p>
          {COMPANY.brandName} uses the Service to manage WhatsApp communication for its own brands and for client organisations (“Clients”). Each brand or Client has a separate workspace.
        </p>
      </>
    ),
  },
  {
    id: "scope",
    title: "Who this policy covers",
    body: (
      <ul>
        <li><strong>The administrator</strong> — the authorised operator account that signs in to the Service. There is no public sign-up.</li>
        <li><strong>Contacts</strong> — people whose details are added to a workspace and who may receive or send WhatsApp messages through the Service.</li>
        <li><strong>Visitors of tracked links</strong> — people who open a link sent in a campaign message.</li>
        <li><strong>Clients</strong> — organisations for which {COMPANY.brandName} operates a workspace.</li>
      </ul>
    ),
  },
  {
    id: "data-we-collect",
    title: "Information we collect",
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
    title: "How information is collected",
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
    title: "How we use information",
    body: (
      <>
        <ul>
          <li>To send WhatsApp messages and campaigns to contacts who have given consent, and to reply to messages contacts send.</li>
          <li>To run up to three-step message sequences that depend on whether a previous message was delivered, read, clicked or replied to.</li>
          <li>To record and honour consent and opt-outs.</li>
          <li>To show delivery, engagement and campaign reports to the administrator.</li>
          <li>To secure the Service (authentication, rate limiting, audit logs).</li>
        </ul>
        <p>We do not sell personal data or use it for advertising.</p>
      </>
    ),
  },
  {
    id: "storage",
    title: "How contact information is stored and processed",
    body: (
      <>
        <p>
          Contact information is stored in a database ({FACTS.databaseProvider}) hosted in Google Cloud region <strong>{FACTS.databaseRegion}</strong>, separated by workspace. The application that processes it runs on {FACTS.hostingProvider} servers in the <strong>{FACTS.hostingRegion}</strong>. Information is read and written only by the application server; browsers cannot access the database directly.
        </p>
        <p>
          WhatsApp messages are processed by Meta, which may process data in other countries. Personal data may therefore be transferred outside the country where it was collected.
        </p>
      </>
    ),
  },
  {
    id: "whatsapp",
    title: "WhatsApp messaging and consent",
    body: (
      <>
        <p>
          Messages are sent and received through the {FACTS.messagingProvider}. To deliver a message, the recipient’s phone number and the message content are sent to Meta. Meta sends us messages from contacts and delivery/read notifications. Meta processes this data under its own terms and privacy policy.
        </p>
        <p>
          {COMPANY.brandName}, as operator of the Service, or the Client on whose behalf messages are sent, is responsible for ensuring that appropriate WhatsApp consent has been obtained before messages are sent. The Service sends marketing messages only to contacts recorded as opted in with a consent source and date. Messages outside WhatsApp’s 24-hour customer service window use templates approved by Meta.
        </p>
        <p>
          A contact can stop messages at any time by replying <strong>STOP</strong>, <strong>UNSUBSCRIBE</strong>, <strong>CANCEL</strong>, <strong>END</strong> or <strong>QUIT</strong>, or by tapping an opt-out button where offered. The contact is then marked as opted out, the change is added to their consent history, any active message sequence stops, and the Service blocks further campaign and automated messages to them. Opt-outs reported by Meta are also recorded.
        </p>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Who we share information with",
    body: (
      <>
        <p>We use these service providers to run the Service:</p>
        <ul>
          <li><strong>Google Firebase</strong> — database and administrator authentication.</li>
          <li><strong>{FACTS.hostingProvider}</strong> — application hosting.</li>
          <li><strong>Meta</strong> — WhatsApp message delivery, as described above.</li>
        </ul>
        <p>We do not sell or rent personal data. We may disclose information where required by law.</p>
      </>
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
          <li>Information is read and written only by the application server after the administrator’s session is verified; the database rejects direct access from browsers.</li>
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
    title: "Data retention",
    body: (
      <>
        <p>
          The Service does not delete data automatically on a schedule. Information is kept while the workspace it belongs to is active, until it is deleted by the administrator or in response to a deletion request. Deleting a contact removes all of that person’s data, as described below.
        </p>
        <p>
          Retention period: <Detail value={COMPANY.generalRetention} label="what the 30-day retention period applies to" />
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "Workspace termination",
    body: (
      <p>
        When a Client workspace is terminated, its data is retained for <Detail value={COMPANY.workspaceTerminationRetention} label="post-termination retention" /> following termination, subject to applicable legal requirements, and is then deleted. Deleting a workspace permanently removes all of its data from the Service.
      </p>
    ),
  },
  {
    id: "export",
    title: "Data export",
    body: (
      <p>
        Contact lists can be exported from the Service as CSV or Excel files (including consent status and dates), and reports as CSV files. You can ask us for an export of your contact data using the contact details below.
      </p>
    ),
  },
  {
    id: "data-deletion",
    title: "Privacy requests and data deletion",
    body: (
      <>
        <p>
          You can ask us to access, correct, export or delete your personal information, or to stop messaging you, by emailing {mail(COMPANY.privacyEmail, "privacy contact email")}. We respond to privacy requests within <Detail value={COMPANY.requestResponseTime} label="response time" />. Deletion requests are processed within <Detail value={COMPANY.deletionRequestTime} label="deletion time" /> of the request being confirmed.
        </p>
        <p><strong>What deletion covers:</strong></p>
        <ul>
          <li>
            Deleting a contact permanently removes the contact record (name, phone number, email, location, organisation, groups, tags, custom fields and consent history) <strong>and all records linked to that contact</strong>: conversations and messages, campaign participation and delivery records, link-click records, automation history, activity entries and WhatsApp message references.
          </li>
          <li>After deletion, an audit entry records that a deletion took place, without the person’s details.</li>
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
    title: "Age",
    body: (
      <p>
        The Service is intended for people aged <Detail value={COMPANY.minimumAge} label="minimum age" /> and over and must not be used to collect information about, or send messages to, anyone younger.
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
    title: "Contact and grievance officer",
    body: (
      <ul>
        <li>Privacy enquiries: {mail(COMPANY.privacyEmail, "privacy contact email")}</li>
        <li>Grievance Officer: <Detail value={COMPANY.grievanceOfficerName} label="Grievance Officer" />, {mail(COMPANY.grievanceOfficerEmail, "Grievance Officer email")}</li>
        <li>Postal address: <Detail value={COMPANY.legalName} label="legal company name" />, <Detail value={COMPANY.registeredAddress} label="registered address" /></li>
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
          This policy explains what personal information {COMPANY.productName} collects, how it is stored and used for WhatsApp messaging, who it is shared with, how long it is kept, and how to export or delete it or stop receiving messages.
        </p>
      }
      sections={sections}
    />
  );
}
