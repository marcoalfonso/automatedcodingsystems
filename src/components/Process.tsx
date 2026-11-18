import { processSteps } from '../content'

export default function Process() {
  return (
    <section className="section section-paper" id="process">
      <div className="container">
        <header className="section-head">
          <p className="eyebrow">How we work</p>
          <h2>How a project runs</h2>
        </header>
        <ol className="steps">
          {processSteps.map((s, i) => (
            <li key={s.title}>
              <span className="step-n">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.detail}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
