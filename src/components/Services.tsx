import { servicePillars } from '../content'

export default function Services() {
  return (
    <section className="section" id="services">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">Services</p>
          <h2>Two practices. One team that does both.</h2>
          <p>
            Most AI projects are built by one firm and secured by another, if
            they are secured at all. We do both, so security is part of the
            design and not a report that arrives after launch.
          </p>
        </header>

        <div className="pillars">
          {servicePillars.map((pillar) => (
            <article className={`pillar pillar-${pillar.id}`} key={pillar.id}>
              <p className="pillar-tag">{pillar.tag}</p>
              <h3>{pillar.title}</h3>
              <p className="pillar-summary">{pillar.summary}</p>
              <ul className="pillar-list">
                {pillar.items.map((item) => (
                  <li key={item.name}>
                    <strong>{item.name}</strong>
                    <span>{item.detail}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
