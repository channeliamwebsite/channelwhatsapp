"use client";

import * as React from "react";
import { AlertTriangle, CircleCheck, CircleSlash, Clock, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { findMatches } from "@/lib/contacts/duplicates";
import { COUNTRIES, validatePhone } from "@/lib/contacts/phone";
import { cn } from "@/lib/utils";
import { CONSENT_SOURCES, type Contact, type ContactInput, type OptInStatus } from "@/types/contact";

import { MultiValueInput } from "./multi-value-input";

type ContactFormDialogProps = {
  open: boolean;
  /** Contact being edited; undefined = add mode. */
  contact?: Contact;
  contacts: Contact[];
  today: string;
  groups: string[];
  tags: string[];
  onClose: () => void;
  onSubmit: (input: ContactInput) => void;
  onViewContact: (id: string) => void;
};

const EMPTY: ContactInput = {
  fullName: "", phone: "", email: "", country: "India", city: "", organisation: "", designation: "",
  audienceGroups: [], tags: [], optInStatus: "pending", consentSource: "", consentDate: "", customFields: {},
};

const OPT_IN_OPTIONS: { value: OptInStatus; label: string; hint: string; icon: typeof Clock }[] = [
  { value: "opted_in", label: "Opted in", hint: "Consent recorded", icon: CircleCheck },
  { value: "pending", label: "Pending", hint: "Awaiting consent", icon: Clock },
  { value: "opted_out", label: "Opted out", hint: "Never message", icon: CircleSlash },
];

type Errors = Partial<Record<keyof ContactInput, string>>;

export function ContactFormDialog(props: ContactFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={(o) => !o && props.onClose()} className="max-w-2xl">
      {props.open && <ContactForm key={props.contact?.id ?? "new"} {...props} />}
    </Dialog>
  );
}

function ContactForm({ contact, contacts, today, groups, tags, onClose, onSubmit, onViewContact }: ContactFormDialogProps) {
  const isEdit = Boolean(contact);
  const [form, setForm] = React.useState<ContactInput>(() => (contact ? { ...contact } : EMPTY));
  const [errors, setErrors] = React.useState<Errors>({});
  const [phoneTouched, setPhoneTouched] = React.useState(false);

  const set = <K extends keyof ContactInput>(key: K, value: ContactInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const phoneResult = form.phone ? validatePhone(form.phone, form.country) : null;
  const matches = findMatches(contacts, { phone: phoneResult?.valid ? phoneResult.e164 : "", email: form.email }, contact?.id);

  function setOptIn(status: OptInStatus) {
    setForm((f) => ({
      ...f,
      optInStatus: status,
      consentDate: status === "opted_in" && !f.consentDate ? today : f.consentDate,
    }));
    setErrors((e) => ({ ...e, consentSource: undefined, consentDate: undefined }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!form.fullName.trim()) next.fullName = "Full name is required.";
    const phone = validatePhone(form.phone, form.country);
    if (!phone.valid) next.phone = phone.error;
    else if (matches.phone) next.phone = `This number already belongs to ${matches.phone.fullName}.`;
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email address.";
    if (form.optInStatus === "opted_in") {
      if (!form.consentSource) next.consentSource = "Record where consent was given.";
      if (!form.consentDate) next.consentDate = "Record when consent was given.";
      else if (form.consentDate > today) next.consentDate = "Consent date cannot be in the future.";
    }
    setErrors(next);
    setPhoneTouched(true);
    if (Object.keys(next).length) return;

    onSubmit({
      ...form,
      customFields: Object.fromEntries(Object.entries(form.customFields ?? {}).map(([k, v]) => [k.trim(), v.trim()]).filter(([k]) => k)),
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: phone.valid ? phone.e164 : form.phone,
      consentSource: form.optInStatus === "pending" ? "" : form.consentSource,
      consentDate: form.optInStatus === "pending" ? "" : form.consentDate,
    });
  }

  const showPhoneError = errors.phone ?? (phoneTouched && phoneResult && !phoneResult.valid ? phoneResult.error : undefined);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogHeader
        title={isEdit ? "Edit contact" : "Add contact"}
        description={isEdit ? `Update details for ${contact!.fullName}.` : "Add a contact to your WhatsApp audience."}
        onClose={onClose}
      />
      <DialogBody className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="fullName" label="Full name" required error={errors.fullName} className="sm:col-span-2">
            <Input id="fullName" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} autoComplete="off" aria-invalid={!!errors.fullName} />
          </Field>
          <Field
            id="phone"
            label="WhatsApp number"
            required
            error={showPhoneError}
            hint={phoneResult?.valid ? `Saved as ${phoneResult.e164}` : "Include country code, e.g. +91 98765 43210"}
          >
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              onBlur={() => {
                setPhoneTouched(true);
                if (phoneResult?.valid && phoneResult.country && !form.country) set("country", phoneResult.country);
              }}
              aria-invalid={!!showPhoneError}
              placeholder="+91 98765 43210"
            />
          </Field>
          <Field id="email" label="Email" error={errors.email}>
            <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} placeholder="name@company.com" />
          </Field>

          {(matches.phone || matches.email) && (
            <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning-soft px-3 py-2.5 text-sm text-[#7a3306] sm:col-span-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-semibold">Possible duplicate</p>
                <p>
                  {matches.phone
                    ? `${matches.phone.fullName} already uses this WhatsApp number. Each number can belong to one contact.`
                    : `${matches.email!.fullName} already uses this email address.`}
                </p>
              </div>
              <button type="button" onClick={() => onViewContact((matches.phone ?? matches.email)!.id)} className="shrink-0 font-semibold underline-offset-4 hover:underline">
                View
              </button>
            </div>
          )}

          <Field id="country" label="Country">
            <Input id="country" list="country-options" value={form.country} onChange={(e) => set("country", e.target.value)} />
            <datalist id="country-options">
              {COUNTRIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field id="city" label="City">
            <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field id="organisation" label="Organisation">
            <Input id="organisation" value={form.organisation} onChange={(e) => set("organisation", e.target.value)} />
          </Field>
          <Field id="designation" label="Designation">
            <Input id="designation" value={form.designation} onChange={(e) => set("designation", e.target.value)} />
          </Field>
          <Field id="groups" label="Audience groups" className="sm:col-span-2">
            <MultiValueInput id="groups" value={form.audienceGroups} onChange={(v) => set("audienceGroups", v)} suggestions={groups} placeholder="Type to create or pick below" />
          </Field>
          <Field id="tags" label="Tags" className="sm:col-span-2">
            <MultiValueInput id="tags" value={form.tags} onChange={(v) => set("tags", v)} suggestions={tags} placeholder="Type to create or pick below" />
          </Field>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label>Custom fields</Label>
            {Object.entries(form.customFields ?? {}).map(([key, value], i) => (
              <div key={i} className="flex gap-2">
                <Input aria-label="Field name" value={key} placeholder="Field" className="w-40" onChange={(e) => {
                  const entries = Object.entries(form.customFields ?? {});
                  entries[i] = [e.target.value, value];
                  set("customFields", Object.fromEntries(entries));
                }} />
                <Input aria-label={`${key || "Field"} value`} value={value} placeholder="Value" onChange={(e) => set("customFields", { ...form.customFields, [key]: e.target.value })} />
                <Button type="button" variant="ghost" size="icon-lg" aria-label="Remove field" onClick={() => { const next = { ...form.customFields }; delete next[key]; set("customFields", next); }}><X aria-hidden="true" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="w-fit" disabled={"" in (form.customFields ?? {})} onClick={() => set("customFields", { ...form.customFields, "": "" })}>Add custom field</Button>
          </div>
        </div>

        <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <legend className="px-1 text-[13px] font-semibold">WhatsApp consent</legend>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="WhatsApp opt-in status">
            {OPT_IN_OPTIONS.map((o) => {
              const Icon = o.icon;
              const checked = form.optInStatus === o.value;
              return (
                <label
                  key={o.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/20",
                    checked ? "border-primary bg-accent/50" : "border-border hover:bg-muted/60",
                  )}
                >
                  <input type="radio" name="optIn" value={o.value} checked={checked} onChange={() => setOptIn(o.value)} className="sr-only" />
                  <Icon className={cn("size-4 shrink-0", checked ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                  <span className="leading-tight">
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{o.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>

          {form.optInStatus !== "pending" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="consentSource" label="Consent source" required={form.optInStatus === "opted_in"} error={errors.consentSource}>
                <NativeSelect id="consentSource" value={form.consentSource} onChange={(e) => set("consentSource", e.target.value as ContactInput["consentSource"])} aria-invalid={!!errors.consentSource}>
                  <option value="">Select source…</option>
                  {CONSENT_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </NativeSelect>
              </Field>
              <Field id="consentDate" label={form.optInStatus === "opted_out" ? "Opt-out date" : "Consent date"} required={form.optInStatus === "opted_in"} error={errors.consentDate}>
                <Input id="consentDate" type="date" max={today} value={form.consentDate} onChange={(e) => set("consentDate", e.target.value)} aria-invalid={!!errors.consentDate} />
              </Field>
            </div>
          )}
          {form.optInStatus === "opted_out" && (
            <p className="flex items-center gap-2 text-xs text-destructive">
              <CircleSlash className="size-3.5" aria-hidden="true" />
              Opted-out contacts are excluded from every campaign.
            </p>
          )}
          {form.optInStatus === "pending" && (
            <p className="text-xs text-muted-foreground">Pending contacts can’t receive campaigns until consent is recorded.</p>
          )}
        </fieldset>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" size="lg" onClick={onClose}>Cancel</Button>
        <Button type="submit" size="lg">{isEdit ? "Save changes" : "Add contact"}</Button>
      </DialogFooter>
    </form>
  );
}

function Field({
  id, label, required, error, hint, className, children,
}: {
  id: string; label: string; required?: boolean; error?: string; hint?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-primary"> *</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
