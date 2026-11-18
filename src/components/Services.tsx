import { servicePillars } from '../content'

export default function Services() {
  return (
    <section className="section" id="services">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">Services</p>
          <h2>What we do</h2>
          <p>
            There are two sides to the business, and they often end up on the
            same project. Because the people building the system also know how
            it gets attacked, security comes up at the design stage instead of
            in a report the week before launch.
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
