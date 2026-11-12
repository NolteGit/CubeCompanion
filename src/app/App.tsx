import './app.css'

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">MTG Commander Cube</p>
          <h1>Cube Companion</h1>
        </div>
        <span className="status">Foundation</span>
      </header>

      <main>
        <section className="intro-card">
          <h2>Project foundation ready</h2>
          <p>
            The local workbook remains the source of truth. The next step is the
            normalized cube domain model and validation rules.
          </p>
          <dl>
            <div>
              <dt>Source</dt>
              <dd>source/CubeUebersicht.xlsx</dd>
            </div>
            <div>
              <dt>Publication</dt>
              <dd>Validated, immutable snapshots</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  )
}

export default App
