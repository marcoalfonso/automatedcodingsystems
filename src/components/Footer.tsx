import RippleLogo from './RippleLogo'
import { CONTACT_EMAIL, navLinks } from '../content'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <RippleLogo />
        <div className="footer-row">
          <p>© {new Date().getFullYear()} Automated Coding Systems</p>
          <nav aria-label="Footer">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </nav>
        </div>
      </div>
    </footer>
  )
}
