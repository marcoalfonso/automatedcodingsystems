import { useState } from "react";
import Logo from "./Logo";
import { navLinks } from "../content";

export default function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="header">
      <div className="container header-inner">
        <a className="brand" href="#top" onClick={close}>
          <Logo />
          <span className="brand-name">
            Automated
            <br />
            Coding Systems
          </span>
        </a>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Close" : "Menu"}
        </button>

        <nav
          id="site-nav"
          className={open ? "nav is-open" : "nav"}
          aria-label="Main"
        >
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} onClick={close}>
              {link.label}
            </a>
          ))}
          <a className="btn btn-light" href="#contact" onClick={close}>
            Contact us
          </a>
        </nav>
      </div>
    </header>
  );
}
