// src/LandingPage.jsx
function LandingPage({ onStart }) {
  return (
    <div className="page-container">
      {/* Top bar with fake admin login */}
      <header className="top-bar">
        <span className="badge">Participant information</span>
        <button
          className="admin-button"
          type="button"
          onClick={() => alert("Admin login coming in a later version.")}
        >
          Admin login
        </button>
      </header>

      <main className="content-layout">
        <section className="main-panel">
          <h1 className="title">Psychobiological Study Onboarding</h1>

          <p className="lead">
            This web-based assistant will guide you through the information you
            need before taking part in a psychobiological research study.
          </p>

          <h2 className="section-heading">What this chatbot does</h2>
          <ul className="bullet-list">
            <li>Explains the purpose of the study in plain language.</li>
            <li>
              Walks you through each step of the sample collection process.
            </li>
            <li>
              Clarifies what will happen with your sample and your data.
            </li>
          </ul>

          <h2 className="section-heading">Important notes</h2>
          <div className="info-box">
            <ul className="bullet-list">
              <li>
                The chatbot is for information only and is{" "}
                <strong>not</strong> a medical tool or a substitute for medical
                advice.
              </li>
              <li>
                No personal or identifying information is stored in this
                prototype.
              </li>
              <li>
                Taking part is voluntary and you can stop using the chatbot at
                any time.
              </li>
            </ul>
          </div>

          <button className="primary-button" type="button" onClick={onStart}>
            Begin
          </button>
        </section>

        <aside className="side-panel">
          <h2 className="side-heading">How it works</h2>
          <p>
            Once you click <strong>“Begin”</strong>, a
            chat window will open.
          </p>
          <p>
            The chatbot will present information in short steps, with a progress
            bar at the top showing how far along you are.
          </p>
          <p>
            At the end, you will be able to download the full instructions as a
            PDF leaflet to keep for reference.
          </p>
        </aside>
      </main>
    </div>
  );
}

export default LandingPage;
