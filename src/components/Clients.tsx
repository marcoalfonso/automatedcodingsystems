import { clients } from '../content'

export default function Clients() {
  return (
    <section className="clients" id="clients" aria-labelledby="clients-title">
      <div className="container">
        <p className="clients-title" id="clients-title">
          Engineering experience with teams at
        </p>
      </div>
      <div className="marquee">
        {[0, 1].map((copy) => (
          <ul className="marquee-track" key={copy} aria-hidden={copy === 1}>
            {clients.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  )
}
