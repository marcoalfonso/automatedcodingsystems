import { capabilities } from "../content";

export default function Capabilities() {
  return (
    <section className="section section-paper" id="capabilities">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">Capabilities</p>
          <h2>The building blocks behind every engagement.</h2>
        </header>

        <ol className="cap-list">
          {capabilities.map((cap, i) => (
            <li key={cap.name}>
              <span className="cap-index">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>
                {cap.name}
                <span className="cap-short">{cap.short}</span>
              </h3>
              <p>{cap.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
