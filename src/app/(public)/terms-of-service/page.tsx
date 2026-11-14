import type { Metadata } from "next";
import Link from "next/link";

import { Detail, LegalDocument, type LegalSection } from "@/components/legal/legal-document";
import { COMPANY } from "@/lib/legal/company";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms governing the use of ${COMPANY.productName}.`,
  robots: { index: true, follow: true },
};

const link = "text-primary underline-offset-4 hover:underline";

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement",
    body: (
      <p>
        These Terms of Service (“Terms”) govern the use of {COMPANY.productName} (the “Service”), operated by <strong><Detail value={COMPANY.legalName} label="legal company name" /></strong>,{" "}
        <Detail value={COMPANY.registeredAddress} label="registered address" /> (“{COMPANY.brandName}”, “we”). They apply to anyone who uses the Service and to each organisation for which we operate a workspace (a “Client”). By using the Service, or by asking us to send WhatsApp messages on your behalf, you agree to these Terms.
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
    id: "eligibility",
    title: "Eligibility and accounts",
    body: (
      <ul>
        <li>You must be at least <Detail value={COMPANY.minimumAge} label="minimum age" /> old to use the Service.</li>
        <li>Access is limited to a single authorised administrator account. There is no public registration.</li>
        <li>The administrator must keep sign-in credentials confidential and tell us promptly about any suspected unauthorised access.</li>
        <li>We may revoke sessions or suspend access to protect the Service or its data.</li>
      </ul>
    ),
  },
  {
    id: "user-responsibilities",
    title: "User responsibilities",
    body: (
      <ul>
        <li>Use the Service only for lawful purposes and in line with these Terms.</li>
        <li>Make sure contact information entered or imported is accurate, up to date and lawfully collected.</li>
        <li>Review campaigns, templates and automations before sending; you are responsible for the messages you send.</li>
        <li>Keep consent records and honour opt-out requests.</li>
      </ul>
    ),
  },
  {
    id: "whatsapp-consent",
    title: "WhatsApp messaging and consent",
    body: (
      <>
        <p>
          {COMPANY.brandName}, as operator of the Service, or the Client on whose behalf messages are sent, is responsible for ensuring that appropriate WhatsApp user consent has been obtained before messages are sent.
        </p>
        <ul>
          <li>Marketing messages may be sent only to contacts who have opted in; the Service blocks messages to contacts marked as opted out.</li>
          <li>Opt-out requests (for example a reply of STOP or UNSUBSCRIBE) must be honoured, and opted-out contacts must not be re-subscribed without fresh consent.</li>
          <li>Use must comply with Meta’s WhatsApp Business Terms, WhatsApp Business Messaging Policy and Commerce Policy, as updated by Meta.</li>
          <li>Messages outside WhatsApp’s 24-hour customer service window must use message templates approved by Meta.</li>
          <li>Meta may limit, pause or block messaging, templates or phone numbers; we are not responsible for Meta’s decisions.</li>
        </ul>
      </>
    ),
  },
  {
    id: "client-responsibilities",
    title: "Client responsibilities",
    body: (
      <ul>
        <li>Provide only contact information the Client is permitted to use for WhatsApp messaging.</li>
        <li>Ensure appropriate consent has been obtained for its contacts before messages are sent on its behalf, as described above.</li>
        <li>Ensure message content requested for its campaigns is accurate, lawful and identifies the sender.</li>
        <li>Tell us promptly about opt-out, correction or deletion requests it receives from its contacts.</li>
      </ul>
    ),
  },
  {
    id: "prohibited",
    title: "Prohibited activities",
    body: (
      <>
        <p>You must not use the Service to:</p>
        <ul>
          <li>Send unsolicited messages, or message purchased, rented, scraped or otherwise non-consented contact lists.</li>
          <li>Send content that is unlawful, fraudulent, deceptive, harassing, hateful or sexually explicit, or that infringes others’ rights.</li>
          <li>Promote products or services prohibited by Meta’s policies or applicable law.</li>
          <li>Message anyone under <Detail value={COMPANY.minimumAge} label="minimum age" /> of age.</li>
          <li>Impersonate any person or organisation, or misrepresent the source of a message.</li>
          <li>Interfere with, probe or overload the Service, or attempt to access another workspace’s data.</li>
        </ul>
      </>
    ),
  },
  {
    id: "data",
    title: "Data and privacy",
    body: (
      <p>
        Personal information is handled as described in our <Link href="/privacy-policy" className={link}>Privacy Policy</Link>, including data retention, export and deletion.
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
    id: "termination",
    title: "Suspension and workspace termination",
    body: (
      <>
        <p>
          We may suspend or terminate a workspace if these Terms, Meta’s policies or applicable law are breached, or to protect contacts or the Service.
        </p>
        <p>
          When a workspace is terminated, its data is retained for <Detail value={COMPANY.workspaceTerminationRetention} label="post-termination retention" /> following termination, subject to applicable legal requirements, and is then deleted. Contact lists and reports can be exported before deletion, as described in the <Link href="/privacy-policy#export" className={link}>Privacy Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <p>
        The Service is provided “as is” and “as available”. We do not guarantee message delivery, read rates or campaign results, which depend on recipients and on Meta.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <p>
        Our liability is subject to the applicable laws of India and to the limitations in these Terms. To the extent permitted by applicable law, {COMPANY.brandName} is not liable for indirect, incidental, special or consequential losses, loss of profits or loss of data, or for actions of Meta or other third parties.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law and jurisdiction",
    body: (
      <p>
        These Terms of Service shall be governed by and interpreted in accordance with the laws of India. Any disputes arising out of or in connection with these Terms shall be subject to the jurisdiction of the competent courts in Kerala, India, subject to applicable laws.
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
        <li>
          Legal enquiries:{" "}
          {COMPANY.legalEmail ? <a href={`mailto:${COMPANY.legalEmail}`} className={link}>{COMPANY.legalEmail}</a> : <Detail value={null} label="legal contact email" />}
        </li>
        <li>Address: <Detail value={COMPANY.legalName} label="legal company name" />, <Detail value={COMPANY.registeredAddress} label="registered address" /></li>
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
          These Terms set the rules for using {COMPANY.productName}: eligibility, responsibilities, WhatsApp messaging and consent, prohibited activities, suspension and termination, liability and governing law.
        </p>
      }
      sections={sections}
    />
  );
}
