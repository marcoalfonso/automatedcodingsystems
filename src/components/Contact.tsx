import { useState, type FormEvent } from 'react'
import { CONTACT_EMAIL, interests } from '../content'

const ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined

type Status = 'idle' | 'sending' | 'sent' | 'mail' | 'error'

export default function Contact() {
  const [status, setStatus] = useState<Status>('idle')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>

    // Honeypot: real visitors never fill this field.
    if (data.website) return
    delete data.website

    if (!ENDPOINT) {
      // No backend configured yet: hand the message to the visitor's mail client.
      const subject = `Enquiry from ${data.name}${data.company ? ` (${data.company})` : ''}`
      const body = `${data.message}\n\nInterest: ${data.interest}\nFrom: ${data.name} <${data.email}>`
      window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
        subject,
      )}&body=${encodeURIComponent(body)}`
      setStatus('mail')
      return
    }

    setStatus('sending')
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error(`Request failed: ${response.status}`)
      form.reset()
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section className="section contact" id="contact">
      <div className="container contact-grid">
        <header>
          <p className="eyebrow">Contact</p>
          <h2>Tell us what you need.</h2>
          <p>
            A short description is enough. We reply within two business days
            with questions or a time to talk.
          </p>
          <p className="contact-direct">
            Prefer email? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </header>

        <form className="form" onSubmit={handleSubmit}>
          <div className="field-row">
            <label className="field">
              <span>Name</span>
              <input name="name" type="text" autoComplete="name" required />
            </label>
            <label className="field">
              <span>Work email</span>
              <input name="email" type="email" autoComplete="email" required />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>
                Company <em>optional</em>
              </span>
              <input name="company" type="text" autoComplete="organization" />
            </label>
            <label className="field">
              <span>Interested in</span>
              <select name="interest" defaultValue={interests[0]}>
                {interests.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            <span>What are you trying to do?</span>
            <textarea name="message" rows={5} required />
          </label>
          <label className="field-trap" aria-hidden="true">
            Website
            <input name="website" type="text" tabIndex={-1} autoComplete="off" />
          </label>

          <div className="form-foot">
            <button className="btn btn-primary" type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Send message'}
            </button>
            <p className="form-status" role="status">
              {status === 'sent' && 'Message sent. We will be in touch soon.'}
              {status === 'mail' &&
                'Your mail app should have opened with the message ready to send.'}
              {status === 'error' && (
                <>
                  That did not send. Try again, or email{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
                </>
              )}
            </p>
          </div>
        </form>
      </div>
    </section>
  )
}
