import { aemPipeline, auditFindings } from "../content";

export default function Showcase() {
  return (
    <section className="section" id="showcase">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">Showcase</p>
          <h2>What an implementation looks like.</h2>
        </header>

        <article className="case">
          <div className="case-text">
            <p className="case-tag">
              AI implementation · Adobe Experience Manager
            </p>
            <h3>Content production in AEM, run as an automated workflow.</h3>
            <p>
              Producing a campaign in AEM is manual work: copy pasted into
              components, fragments built by hand, assets tagged one at a time,
              and the whole thing repeated for every locale. We replace that
              production line with an agent that authors directly in AEM through
              a Model Context Protocol server.
            </p>
            <ul className="case-points">
              <li>
                An AEM MCP server exposing pages, content fragments, the DAM and
                workflow as tools.
              </li>
              <li>
                Retrieval over brand, product and legal sources, so drafts start
                on-brand.
              </li>
              <li>
                Automated checks on every page, and a single editor approval
                before publish.
              </li>
            </ul>
            <p className="case-outcome">
              Content producers stop assembling pages. The pipeline does the
              production, and editors review the result.
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
            <h3>
              A security audit of your system, before attackers run their own.
            </h3>
            <p>
              We review the whole system: tools, data flows and the
              infrastructure around them. Then we try to break it. Every finding
              comes with a severity, a reproduction and a fix.
            </p>
            <ul className="case-points">
              <li>Threat model and architecture review.</li>
              <li>
                Hands-on testing: injection, exfiltration, privilege escalation
                through tools.
              </li>
              <li>A prioritised report, then a retest once fixes are in.</li>
            </ul>
            <p className="case-outcome">
              You get a clear list of what is exposed, ranked by risk, and proof
              that each fix worked.
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
  );
}
