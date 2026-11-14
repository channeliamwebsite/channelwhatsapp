import type { Metadata } from "next";
import Link from "next/link";

import { Detail, LegalDocument, type LegalSection } from "@/components/legal/legal-document";
import { COMPANY } from "@/lib/legal/company";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms governing the use of ${COMPANY.productName}.`,
  robots: { index: true, follow: true },
};

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement",
    body: (
      <p>
        These Terms govern the use of {COMPANY.productName} (the “Service”), operated by <Detail value={COMPANY.legalName} label="legal company name" /> (“{COMPANY.brandName}”, “we”). They apply to {COMPANY.brandName} and to each organisation for which we operate a workspace (a “Client”). By using the Service, or by asking us to send WhatsApp messages on your behalf, you agree to these Terms.
      </p>
    ),
  },
  {
    id: "service",
    title: "The Service",
    body: (
      <>
        <p>
          The Service lets an authorised administrator manage contacts, audience groups, WhatsApp message templates, campaigns with up to three behaviour-based messages, conversations, automations and reports, in separate workspaces for each brand or Client.
        </p>
        <p>
          Sending and receiving WhatsApp messages depends on Meta’s WhatsApp Business Platform, including approval of the business account, phone number and message templates. Features that depend on Meta are available only once Meta has granted the required approvals.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and access",
    body: (
      <ul>
        <li>Access is limited to a single authorised administrator account. There is no public registration.</li>
        <li>The administrator must keep sign-in credentials confidential and tell us promptly about any suspected unauthorised access.</li>
        <li>We may revoke sessions or suspend access to protect the Service or its data.</li>
      </ul>
    ),
  },
  {
    id: "client-responsibilities",
    title: "Client responsibilities and consent",
    body: (
      <>
        <p>Each Client (and {COMPANY.brandName} for its own brands) is responsible for the contacts it provides and the messages sent to them, and must:</p>
        <ul>
          <li>Have a lawful basis to collect each contact’s data and obtain clear, recorded <strong>opt-in consent</strong> before any WhatsApp marketing message is sent.</li>
          <li>Keep accurate records of when and how consent was obtained, and provide them to us on request.</li>
          <li>Ensure contact lists and imported files are accurate, up to date and collected in line with applicable law.</li>
          <li>Honour opt-out requests immediately. The Service blocks messages to contacts marked as opted out; Clients must not re-add or re-subscribe them without fresh consent.</li>
        </ul>
      </>
    ),
  },
  {
    id: "whatsapp-compliance",
    title: "WhatsApp messaging compliance",
    body: (
      <ul>
        <li>Use of the Service must comply with Meta’s WhatsApp Business Terms, WhatsApp Business Messaging Policy and Commerce Policy, as updated by Meta.</li>
        <li>Messages outside WhatsApp’s 24-hour customer service window must use message templates approved by Meta.</li>
        <li>Message content must be accurate, identify the sender, and not be misleading.</li>
        <li>Meta may limit, pause or block messaging, templates or phone numbers; we are not responsible for Meta’s decisions.</li>
      </ul>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use and anti-spam",
    body: (
      <>
        <p>You must not use the Service to:</p>
        <ul>
          <li>Send unsolicited messages, or message purchased, rented, scraped or otherwise non-consented contact lists.</li>
          <li>Send content that is unlawful, fraudulent, deceptive, harassing, hateful, sexually explicit, or that infringes others’ rights.</li>
          <li>Promote products or services prohibited by Meta’s policies or applicable law.</li>
          <li>Impersonate any person or organisation, or misrepresent the source of a message.</li>
          <li>Interfere with, probe or overload the Service, or attempt to access another workspace’s data.</li>
        </ul>
        <p>We may refuse to send, remove content, or suspend a workspace that breaches these rules.</p>
      </>
    ),
  },
  {
    id: "data",
    title: "Data and privacy",
    body: (
      <p>
        Personal data is handled as described in our <Link href="/privacy-policy" className="text-primary underline-offset-4 hover:underline">Privacy Policy</Link>. For Client workspaces, {COMPANY.brandName} processes contact data on the Client’s instructions.{" "}
        <Detail value={COMPANY.processorAgreement} label="data-processing agreement terms with Clients" />
      </p>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services",
    body: (
      <p>
        The Service relies on Meta (WhatsApp Business Platform), Google Firebase (database and authentication) and Vercel (hosting). Their availability and terms are outside our control, and interruptions on their side may affect the Service.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability and changes",
    body: (
      <p>
        We aim to keep the Service available but do not guarantee uninterrupted or error-free operation. We may change, suspend or discontinue features, including where required by Meta or law.
      </p>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property",
    body: (
      <p>
        The Service, its software and design belong to {COMPANY.brandName} or its licensors. Clients keep ownership of their contact data and message content and grant us the rights needed to operate the Service for them.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <>
        <p>
          We may suspend or terminate a workspace immediately if these Terms, Meta’s policies or applicable law are breached, or to protect contacts or the Service. A Client may ask us to stop operating its workspace at any time.
        </p>
        <p>
          When a workspace is deleted, all of its data is permanently removed from the Service. Arrangements for exporting data before deletion: <Detail value={COMPANY.terminationDataExport} label="data export / handover terms on termination" />
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <p>
        The Service is provided “as is” and “as available”. To the extent permitted by law, we disclaim all implied warranties. We do not guarantee message delivery, read rates or campaign results, which depend on recipients and on Meta.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <p>
        To the extent permitted by law, {COMPANY.brandName} is not liable for indirect, incidental, special or consequential losses, lost profits or lost data, or for actions of Meta or other third parties. Our total liability: <Detail value={COMPANY.liabilityCap} label="liability cap" />
      </p>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <p>
        Each Client is responsible for claims arising from its contact data, its lack of valid consent, or message content sent at its request, and will compensate {COMPANY.brandName} for resulting losses to the extent permitted by law.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law and disputes",
    body: (
      <p>
        These Terms are governed by the laws of <Detail value={COMPANY.governingLaw} label="governing law" />. Disputes are subject to the courts of <Detail value={COMPANY.courts} label="courts / jurisdiction" />.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to these Terms",
    body: <p>We may update these Terms. The current version is always on this page with its effective date.</p>,
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <ul>
        <li>Legal enquiries: <Detail value={COMPANY.legalEmail} label="legal contact email" /></li>
        <li>Address: <Detail value={COMPANY.registeredAddress} label="registered address" /></li>
      </ul>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalDocument
      title="Terms of Service"
      summary={
        <p>
          These Terms set the rules for using {COMPANY.productName}: consent and WhatsApp compliance, acceptable use and anti-spam rules, responsibilities, termination and liability.
        </p>
      }
      sections={sections}
    />
  );
}
