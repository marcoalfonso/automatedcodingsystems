import { useState, type ChangeEvent, type FormEvent } from "react";
import { referralSources } from "../content";

const ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined;

type Status = "idle" | "sending" | "sent" | "invalid" | "error";

type FieldName =
  | "need"
  | "name"
  | "title"
  | "company"
  | "country"
  | "email"
  | "phone"
  | "source";

const empty: Record<FieldName, string> = {
  need: "",
  name: "",
  title: "",
  company: "",
  country: "",
  email: "",
  phone: "",
  source: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The form reads as one sentence with blanks in it. Each blank sizes itself to its
// text (or placeholder) through a hidden copy of the value in ::after.
export default function Contact() {
  const [values, setValues] = useState(empty);
  const [invalid, setInvalid] = useState<FieldName[]>([]);
  const [status, setStatus] = useState<Status>("idle");

  function update(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const name = event.target.name as FieldName;
    setValues((current) => ({ ...current, [name]: event.target.value }));
    if (invalid.includes(name)) {
      const rest = invalid.filter((n) => n !== name);
      setInvalid(rest);
      if (!rest.length) setStatus("idle");
    }
  }

  function validate() {
    const missing: FieldName[] = [];
    if (!values.need.trim()) missing.push("need");
    if (!values.name.trim()) missing.push("name");
    if (!EMAIL_PATTERN.test(values.email.trim())) missing.push("email");
    return missing;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    // Honeypot: real visitors never fill this field.
    if ((form.elements.namedItem("website") as HTMLInputElement).value) return;

    const missing = validate();
    setInvalid(missing);
    if (missing.length) {
      setStatus("invalid");
      form.querySelector<HTMLInputElement>(`[name="${missing[0]}"]`)?.focus();
      return;
    }

    if (!ENDPOINT) {
      console.error(
        "VITE_CONTACT_ENDPOINT is not set, so the contact form cannot send.",
      );
      setStatus("error");
      return;
    }

    setStatus("sending");
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      setValues(empty);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  function field(
    name: FieldName,
    placeholder: string,
    label: string,
    props: { type?: string; autoComplete?: string } = {},
  ) {
    const isInvalid = invalid.includes(name);
    return (
      <span className="blank" data-value={values[name] || placeholder}>
        <input
          name={name}
          size={1}
          aria-label={label}
          aria-invalid={isInvalid || undefined}
          placeholder={placeholder}
          value={values[name]}
          onChange={update}
          type={props.type ?? "text"}
          autoComplete={props.autoComplete}
        />
      </span>
    );
  }

  return (
    <section className="section contact" id="contact">
      <div className="container">
        <p className="eyebrow">Tell us what you need</p>

        {status === "sent" ? (
          <p className="sentence sentence-done" role="status">
            Thanks. We have your message and will reply within two business
            days.
          </p>
        ) : (
          <form className="sentence" onSubmit={handleSubmit} noValidate>
            I need {field("need", "what you need", "What you need")}. I’m{" "}
            {field("name", "your name", "Your full name", {
              autoComplete: "name",
            })}
            ,{" "}
            {field("title", "title", "Your title", {
              autoComplete: "organization-title",
            })}{" "}
            at{" "}
            {field("company", "company", "Your company", {
              autoComplete: "organization",
            })}{" "}
            in{" "}
            {field("country", "country", "Your country", {
              autoComplete: "country-name",
            })}
            . Reach me at{" "}
            {field("email", "work email", "Your work email", {
              type: "email",
              autoComplete: "email",
            })}{" "}
            or{" "}
            {field("phone", "phone", "Your phone number, optional", {
              type: "tel",
              autoComplete: "tel",
            })}
            . I heard about Automated Coding Systems from{" "}
            <span
              className="blank blank-select"
              data-value={values.source || "somewhere"}
              data-empty={values.source ? undefined : ""}
            >
              <select
                name="source"
                aria-label="How did you hear about us?"
                value={values.source}
                onChange={update}
              >
                <option value="">somewhere</option>
                {referralSources.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </span>
            .
            <label className="field-trap" aria-hidden="true">
              Website
              <input
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
            <span className="sentence-foot">
              <button
                className="btn btn-light"
                type="submit"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Sending…" : "Get started"}
              </button>
              <span className="form-status" role="status">
                {status === "invalid" &&
                  "Add what you need, your name and a work email so we can reply."}
                {status === "error" &&
                  "That did not send. Please try again in a moment."}
              </span>
            </span>
          </form>
        )}
      </div>
    </section>
  );
}
