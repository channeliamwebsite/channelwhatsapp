/**
 * ⚠️ MOCK DATA — generated, deterministic sample contacts for UI development.
 * Not real people. Replace `getContacts()` with a Firestore read later.
 */
import type { ConsentSource, Contact, OptInStatus } from "@/types/contact";

export const AUDIENCE_GROUPS = [
  "Active customers",
  "Newsletter subscribers",
  "Founders & investors",
  "Event attendees",
  "Webinar leads",
];

export const CONTACT_TAGS = [
  "VIP",
  "Startup",
  "Investor",
  "D2C",
  "Summit 2026",
  "Podcast guest",
  "Partner",
  "Kerala",
];

export type ContactSeedOptions = {
  seed: number;
  count: number;
  groups: string[];
  tags: string[];
  organisations: string[];
};

const FIRST = ["Arjun", "Meera", "Rahul", "Fathima", "Vivek", "Anjali", "Mohammed", "Sneha", "Karthik", "Ayesha", "Nikhil", "Divya", "Salman", "Priya", "Joseph", "Lakshmi", "Faisal", "Neha", "Aditya", "Riya", "Hari", "Sana", "Thomas", "Gayathri"];
const LAST = ["Nair", "Menon", "Pillai", "Rahman", "Krishnan", "Varghese", "Iyer", "Kurian", "Haneef", "Thomas", "Shetty", "Abraham", "Das", "Khan", "Joseph", "Sharma"];
const ORGS = ["Zentrix Labs", "Malabar Foods", "Kochi Fintech Hub", "Spice Route D2C", "Lumen Ventures", "Greenleaf Organics", "Backwater Studios", "Nimbus Logistics", "Coir Craft Co.", "Arabian Trade Links", "Technopark Angels", "Saffron Retail"];
const ROLES = ["Founder & CEO", "Co-founder", "Marketing Head", "Managing Director", "Head of Growth", "Investor", "Operations Manager", "Product Lead", "Partner", "Brand Manager"];
const LOCATIONS: { country: string; city: string; code: string; mobile: () => string }[] = [
  { country: "India", city: "Kochi", code: "91", mobile: () => `9${digits(9)}` },
  { country: "India", city: "Thiruvananthapuram", code: "91", mobile: () => `8${digits(9)}` },
  { country: "India", city: "Kozhikode", code: "91", mobile: () => `7${digits(9)}` },
  { country: "India", city: "Bengaluru", code: "91", mobile: () => `9${digits(9)}` },
  { country: "India", city: "Mumbai", code: "91", mobile: () => `6${digits(9)}` },
  { country: "United Arab Emirates", city: "Dubai", code: "971", mobile: () => `5${digits(8)}` },
  { country: "Qatar", city: "Doha", code: "974", mobile: () => `3${digits(7)}` },
  { country: "Saudi Arabia", city: "Riyadh", code: "966", mobile: () => `5${digits(8)}` },
];

// Seeded PRNG (mulberry32) so server and client render identical data.
let seed = 20261111;
function rand() {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function pick<T>(list: readonly T[]) {
  return list[Math.floor(rand() * list.length)];
}
function digits(n: number) {
  return Array.from({ length: n }, () => Math.floor(rand() * 10)).join("");
}
function sample<T>(list: readonly T[], max: number) {
  const count = Math.floor(rand() * (max + 1));
  return [...new Set(Array.from({ length: count }, () => pick(list)))];
}

const START = Date.UTC(2025, 0, 6);
const END = Date.UTC(2026, 10, 10);
const SOURCES: ConsentSource[] = ["Website form", "Event registration", "WhatsApp click-to-chat", "Offline consent form", "Verified import"];

function buildContacts(opts: ContactSeedOptions = { seed: 20261111, count: 68, groups: AUDIENCE_GROUPS, tags: CONTACT_TAGS, organisations: ORGS }, idPrefix = "ct"): Contact[] {
  seed = opts.seed;
  const list: Contact[] = [];
  for (let i = 0; i < opts.count; i++) {
    const first = pick(FIRST);
    const last = pick(LAST);
    const loc = pick(LOCATIONS);
    const org = pick(opts.organisations);
    const r = rand();
    const optInStatus: OptInStatus = r < 0.6 ? "opted_in" : r < 0.82 ? "pending" : "opted_out";
    const created = new Date(START + Math.floor(rand() * (END - START)));
    const hasConsent = optInStatus !== "pending";
    list.push({
      id: `${idPrefix}_${String(1000 + i)}`,
      fullName: `${first} ${last}`,
      phone: `+${loc.code}${loc.mobile()}`,
      email: rand() < 0.88 ? `${first}.${last}@${org.toLowerCase().replace(/[^a-z]/g, "")}.com`.toLowerCase() : "",
      country: loc.country,
      city: loc.city,
      organisation: org,
      designation: pick(ROLES),
      audienceGroups: sample(opts.groups, 2),
      tags: sample(opts.tags, 2),
      optInStatus,
      consentSource: hasConsent ? pick(SOURCES) : "",
      consentDate: hasConsent ? created.toISOString().slice(0, 10) : "",
      createdAt: created.toISOString(),
    });
  }

  if (list.length < 42) return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Deliberate data-quality issues so the UI has something to catch.
  list[12] = { ...list[12], phone: "+91 12345" }; // invalid number
  list[40] = { ...list[40], phone: "+9715012" }; // invalid number
  list.push(
    { ...list[3], id: `${idPrefix}_2001`, phone: list[3].phone.replace(/^\+91/, "+91 ").replace(/(\d{5})(\d{5})$/, "$1 $2"), tags: ["Summit 2026"], createdAt: "2026-11-02T10:15:00.000Z" },
    { ...list[21], id: `${idPrefix}_2002`, fullName: list[21].fullName.split(" ")[0], phone: `+91${LOCATIONS[0].mobile()}`, audienceGroups: [opts.groups[opts.groups.length - 1]], createdAt: "2026-10-28T08:40:00.000Z" },
  );

  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const mockContacts = buildContacts();

/** Deterministic sample contacts for a workspace. */
export function mockContactsFor(workspaceId: string, opts: Omit<ContactSeedOptions, "seed">): Contact[] {
  const seedValue = [...workspaceId].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 20261111);
  return buildContacts({ ...opts, seed: seedValue }, workspaceId.replace(/[^a-z]/g, "").slice(0, 4));
}

export async function getContacts(): Promise<Contact[]> {
  return mockContacts;
}
