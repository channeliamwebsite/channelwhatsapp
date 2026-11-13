/**
 * WhatsApp phone validation. Numbers are stored in E.164 (+<country><number>).
 * Rules cover Channeliam's main markets; other country codes fall back to the
 * generic E.164 length check (8–15 digits).
 */

type CountryRule = {
  iso: string;
  country: string;
  code: string;
  /** Pattern for the national (subscriber) number of a mobile line. */
  mobile: RegExp;
  example: string;
};

export const COUNTRY_RULES: CountryRule[] = [
  { iso: "IN", country: "India", code: "91", mobile: /^[6-9]\d{9}$/, example: "98765 43210" },
  { iso: "AE", country: "United Arab Emirates", code: "971", mobile: /^5\d{8}$/, example: "50 123 4567" },
  { iso: "SA", country: "Saudi Arabia", code: "966", mobile: /^5\d{8}$/, example: "51 234 5678" },
  { iso: "QA", country: "Qatar", code: "974", mobile: /^[3567]\d{7}$/, example: "3312 3456" },
  { iso: "KW", country: "Kuwait", code: "965", mobile: /^[569]\d{7}$/, example: "5012 3456" },
  { iso: "OM", country: "Oman", code: "968", mobile: /^[79]\d{7}$/, example: "9212 3456" },
  { iso: "BH", country: "Bahrain", code: "973", mobile: /^[36]\d{7}$/, example: "3600 1234" },
  { iso: "GB", country: "United Kingdom", code: "44", mobile: /^7\d{9}$/, example: "7400 123456" },
  { iso: "US", country: "United States", code: "1", mobile: /^[2-9]\d{9}$/, example: "201 555 0123" },
  { iso: "SG", country: "Singapore", code: "65", mobile: /^[89]\d{7}$/, example: "8123 4567" },
  { iso: "AU", country: "Australia", code: "61", mobile: /^4\d{8}$/, example: "412 345 678" },
];

export const COUNTRIES = COUNTRY_RULES.map((r) => r.country);

export type PhoneValidation =
  | { valid: true; e164: string; country: string | null }
  | { valid: false; error: string };

function ruleForE164(digits: string) {
  // Longest code first so "971" wins over "9…"
  return [...COUNTRY_RULES]
    .sort((a, b) => b.code.length - a.code.length)
    .find((r) => digits.startsWith(r.code));
}

/**
 * Validates and normalises a phone number.
 * Accepts "+91 98765 43210", "0091-9876543210", "919876543210" and, when a
 * default country is given, national numbers such as "098765 43210".
 */
export function validatePhone(input: string, defaultCountry = "India"): PhoneValidation {
  const raw = input.trim();
  if (!raw) return { valid: false, error: "WhatsApp number is required." };
  if (/[^\d\s+\-().]/.test(raw)) {
    return { valid: false, error: "Use digits only, with an optional leading +." };
  }

  let cleaned = raw.replace(/[\s\-().]/g, "");
  if (cleaned.startsWith("00")) cleaned = `+${cleaned.slice(2)}`;
  if (cleaned.indexOf("+") > 0) return { valid: false, error: "“+” can only appear at the start." };

  let digits: string;
  if (cleaned.startsWith("+")) {
    digits = cleaned.slice(1);
  } else {
    const fallback = COUNTRY_RULES.find((r) => r.country === defaultCountry);
    const national = cleaned.replace(/^0+/, "");
    if (fallback && fallback.mobile.test(national)) {
      digits = fallback.code + national;
    } else {
      digits = cleaned; // assume the country code was typed without "+"
    }
  }

  if (digits.length < 8 || digits.length > 15) {
    return { valid: false, error: "Number must have 8–15 digits including the country code." };
  }

  const rule = ruleForE164(digits);
  if (rule) {
    const national = digits.slice(rule.code.length);
    if (!rule.mobile.test(national)) {
      return {
        valid: false,
        error: `Not a valid ${rule.country} mobile number (e.g. +${rule.code} ${rule.example}).`,
      };
    }
    return { valid: true, e164: `+${digits}`, country: rule.country };
  }

  return { valid: true, e164: `+${digits}`, country: null };
}

export function isValidPhone(phone: string) {
  return validatePhone(phone).valid;
}

/** "+919876543210" → "+91 98765 43210" (best effort). */
export function formatPhone(phone: string) {
  const result = validatePhone(phone);
  if (!result.valid) return phone;
  const digits = result.e164.slice(1);
  const rule = ruleForE164(digits);
  if (!rule) return result.e164;
  const national = digits.slice(rule.code.length);
  const grouped =
    national.length === 10
      ? `${national.slice(0, 5)} ${national.slice(5)}`
      : national.length === 9
        ? `${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`
        : `${national.slice(0, 4)} ${national.slice(4)}`;
  return `+${rule.code} ${grouped}`;
}

/** Comparable key for duplicate detection. */
export function phoneKey(phone: string) {
  const result = validatePhone(phone);
  return result.valid ? result.e164 : phone.replace(/\D/g, "");
}

/** Country calling code for a valid number, e.g. "+919876543210" → "91" ("" if unknown). */
export function countryCallingCode(phone: string) {
  const result = validatePhone(phone);
  return result.valid ? (ruleForE164(result.e164.slice(1))?.code ?? "") : "";
}
