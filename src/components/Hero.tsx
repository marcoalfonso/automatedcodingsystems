import { useEffect, useRef, useState } from "react";
import FluidCanvas from "./FluidCanvas";
import type { FluidStats } from "../sim/fluid";

// Static MathML for the equations the simulation behind the hero actually solves.
// Bold vectors use the Unicode mathematical bold letters (𝐮, 𝐱, 𝐟).
const equations = [
  {
    label: "Momentum",
    math: '<math><mfrac><mrow><mo>∂</mo><mi>𝐮</mi></mrow><mrow><mo>∂</mo><mi>t</mi></mrow></mfrac><mo>+</mo><mo stretchy="false">(</mo><mi>𝐮</mi><mo>·</mo><mo>∇</mo><mo stretchy="false">)</mo><mi>𝐮</mi><mo>=</mo><mo>−</mo><mfrac><mn>1</mn><mi>ρ</mi></mfrac><mo>∇</mo><mi>p</mi><mo>+</mo><mi>ν</mi><msup><mo>∇</mo><mn>2</mn></msup><mi>𝐮</mi><mo>+</mo><mi>𝐟</mi></math>',
  },
  {
    label: "Incompressible",
    math: "<math><mo>∇</mo><mo>·</mo><mi>𝐮</mi><mo>=</mo><mn>0</mn></math>",
  },
  {
    label: "Advection, semi-Lagrangian",
    math: '<math><msup><mi>𝐮</mi><mo>*</mo></msup><mo stretchy="false">(</mo><mi>𝐱</mi><mo stretchy="false">)</mo><mo>=</mo><mi>𝐮</mi><mo stretchy="false">(</mo><mi>𝐱</mi><mo>−</mo><mi mathvariant="normal">Δ</mi><mi>t</mi><mspace width="0.15em"></mspace><mi>𝐮</mi><mo stretchy="false">)</mo></math>',
  },
  {
    label: "Pressure projection",
    math: '<math><msup><mo>∇</mo><mn>2</mn></msup><mi>p</mi><mo>=</mo><mfrac><mi>ρ</mi><mrow><mi mathvariant="normal">Δ</mi><mi>t</mi></mrow></mfrac><mo>∇</mo><mo>·</mo><msup><mi>𝐮</mi><mo>*</mo></msup><mspace width="0.6em"></mspace><mi>𝐮</mi><mo>=</mo><msup><mi>𝐮</mi><mo>*</mo></msup><mo>−</mo><mfrac><mrow><mi mathvariant="normal">Δ</mi><mi>t</mi></mrow><mi>ρ</mi></mfrac><mo>∇</mo><mi>p</mi></math>',
  },
];

const reynolds =
  "<math><mi>Re</mi><mo>=</mo><mfrac><mrow><mi>U</mi><mi>D</mi></mrow><mi>ν</mi></mfrac></math>";

function Readout({ statsRef }: { statsRef: { current: FluidStats | null } }) {
  const [stats, setStats] = useState<FluidStats | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (statsRef.current) setStats({ ...statsRef.current });
    }, 250);
    return () => window.clearInterval(id);
  }, [statsRef]);

  return (
    <dl className="readout">
      <div>
        <dt dangerouslySetInnerHTML={{ __html: reynolds }} />
        <dd>{stats ? Math.round(stats.reynolds) : "–"}</dd>
      </div>
      <div>
        <dt>t</dt>
        <dd>{stats ? `${stats.time.toFixed(1)} s` : "–"}</dd>
      </div>
      <div>
        <dt>rms ∇·u</dt>
        <dd>{stats ? stats.divergence.toExponential(1) : "–"}</dd>
      </div>
      <div>
        <dt>grid</dt>
        <dd>{stats ? `${stats.cols} × ${stats.rows}` : "–"}</dd>
      </div>
    </dl>
  );
}

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const statsRef = useRef<FluidStats | null>(null);

  return (
    <section className="hero" id="top" ref={sectionRef}>
      <FluidCanvas hostRef={sectionRef} statsRef={statsRef} />
      <div className="hero-scrim" aria-hidden="true" />

      <div className="container hero-content">
        <p className="eyebrow">AI implementation · AI cyber security</p>
        <h1 data-fluid-text>
          AI that ships.
          <br />
          <em>Security that holds.</em>
        </h1>
        <p className="lede" data-fluid-text>
          Automated Coding Systems is a consultancy that puts AI to work inside
          real production systems.
        </p>
        <div className="hero-actions" data-fluid-text>
          <a className="btn btn-light" href="#contact">
            Contact us
          </a>
          <a className="btn btn-outline-light" href="#showcase">
            See the work
          </a>
        </div>
      </div>

      <aside
        className="hero-math"
        aria-label="The equations behind the background animation"
        data-fluid-floor
      >
        <div className="container hero-math-inner">
          <ol className="equations">
            {equations.map((eq) => (
              <li key={eq.label}>
                <span className="eq-label">{eq.label}</span>
                <span
                  className="eq"
                  dangerouslySetInnerHTML={{ __html: eq.math }}
                />
              </li>
            ))}
          </ol>
          <div className="readout-wrap">
            <Readout statsRef={statsRef} />
            <p className="hint">
              Live 2D Navier–Stokes. Drag the ball, or move through the flow.
            </p>
          </div>
        </div>
      </aside>
    </section>
  );
}
