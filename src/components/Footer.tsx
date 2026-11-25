import RippleLogo from './RippleLogo'
import { navLinks } from '../content'

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
          </nav>
        </div>
      </div>
    </footer>
  )
}
