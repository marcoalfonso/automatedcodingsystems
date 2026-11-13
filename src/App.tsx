import Header from './components/Header'
import Hero from './components/Hero'
import Clients from './components/Clients'
import Services from './components/Services'
import Capabilities from './components/Capabilities'
import Showcase from './components/Showcase'
import Process from './components/Process'
import Contact from './components/Contact'
import Footer from './components/Footer'

export default function App() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <main id="main">
        <Hero />
        <Clients />
        <Services />
        <Capabilities />
        <Showcase />
        <Process />
        <Contact />
      </main>
      <Footer />
    </>
  )
}
