export default function Hero() {
  return (
    <section className="hero" id="top">
      <div className="container hero-grid">
        <div>
          <p className="eyebrow">AI implementation · AI cyber security</p>
          <h1>
            AI that ships.
            <br />
            <em>Security that holds.</em>
          </h1>
          <p className="lede">
            Automated Coding Systems is a consultancy that puts AI to work inside
            real production systems, and tests it the way an attacker would
            before it goes live.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href="#contact">
              Talk to us
            </a>
            <a className="btn btn-ghost" href="#showcase">
              See the work
            </a>
          </div>
        </div>

        <figure className="run-card" aria-label="Example of an automated content workflow run">
          <figcaption className="run-card-bar">
            <span>workflow run</span>
            <span>aem-content-pipeline</span>
          </figcaption>
          <div className="run-card-body">
            <p className="run-prompt">
              <span className="run-caret">&gt;</span> Launch the spring campaign
              pages in six locales by Friday.
            </p>
            <ul className="run-log">
              <li className="is-done">Retrieved brand guidelines and product data</li>
              <li className="is-done">Drafted 6 pages and 18 content fragments</li>
              <li className="is-done">Authored in AEM through MCP</li>
              <li className="is-done">Accessibility and policy checks passed</li>
              <li className="is-waiting">Waiting for editor approval</li>
            </ul>
          </div>
        </figure>
      </div>
    </section>
  )
}
