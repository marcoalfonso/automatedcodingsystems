import { aemPipeline, auditFindings } from '../content'

export default function Showcase() {
  return (
    <section className="section" id="showcase">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">Showcase</p>
          <h2>Example projects</h2>
          <p>
            One from each side of the business. Both are composites of the kind
            of work we do rather than write-ups of a particular client.
          </p>
        </header>

        <article className="case">
          <div className="case-text">
            <p className="case-tag">AI implementation · Adobe Experience Manager</p>
            <h3>Automating content production in AEM</h3>
            <p>
              Getting a campaign into Adobe Experience Manager usually takes a
              lot of manual work. Someone pastes copy into components, builds
              content fragments, tags assets, and then does it all again for
              each locale. In this project an agent does that production work
              through an MCP server connected to AEM, and editors review the
              result before anything is published.
            </p>
            <ul className="case-points">
              <li>
                An AEM MCP server with tools for pages, content fragments, DAM
                assets and workflows.
              </li>
              <li>
                Drafts are written from brand guidelines, product data and
                approved legal copy.
              </li>
              <li>
                Accessibility, brand and legal checks on every page, then one
                editor approval.
              </li>
            </ul>
            <p className="case-outcome">
              Nobody builds pages by hand any more. The content team's time
              goes into reviewing and editing.
            </p>
          </div>

          <ol className="pipeline" aria-label="AEM content pipeline steps">
            {aemPipeline.map((p, i) => (
              <li key={p.step}>
                <span className="pipeline-n">{i + 1}</span>
                <div>
                  <strong>{p.step}</strong>
                  <span>{p.detail}</span>
                </div>
              </li>
            ))}
          </ol>
        </article>

        <article className="case case-security">
          <div className="case-text">
            <p className="case-tag">AI cyber security · Vulnerability audit</p>
            <h3>Security audit of an AI assistant</h3>
            <p>
              We review the whole system, including the models, prompts,
              retrieval, tools, data flows and the infrastructure around them,
              and then we attack it. Each finding in the report has a severity
              rating, steps to reproduce it and a recommended fix.
            </p>
            <ul className="case-points">
              <li>Threat modelling and an architecture review with your engineers.</li>
              <li>
                Hands-on testing for prompt injection, data exfiltration and
                privilege escalation through tools.
              </li>
              <li>A report ranked by severity, and a retest once the fixes are in.</li>
            </ul>
            <p className="case-outcome">
              At the end you know what was exposed and have evidence that each
              fix works.
            </p>
          </div>

          <figure className="findings">
            <figcaption>
              <span>Audit report · sample findings</span>
              <span>illustrative</span>
            </figcaption>
            <ul>
              {auditFindings.map((f) => (
                <li key={f.id}>
                  <span className={`sev sev-${f.severity.toLowerCase()}`}>
                    {f.severity}
                  </span>
                  <div>
                    <strong>{f.title}</strong>
                    <span>
                      {f.id} · {f.category}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </figure>
        </article>
      </div>
    </section>
  )
}
