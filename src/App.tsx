import { useMemo, useState } from "react";

const SAMPLE = `**Meeting Title:** Project Odyssey - Pre-Launch Technical & GTM Sync
**Date:** November 21, 2023
**Attendees:** Priya (Product Manager), David (Lead Engineer), Maria (Marketing Lead), Sam (QA Lead)

---

**Priya:** Alright team, welcome to the sync for Project Odyssey. We're officially in the home stretch, with launch scheduled for two weeks from today. The goal here is to get a final status check, identify any remaining red flags, and ensure Engineering, QA, and Marketing are perfectly aligned. David, let's start with you. How is the engineering work looking?

**David:** It's been a challenging week, Priya. The good news is that the new multi-tenant architecture is fully deployed to staging. The bad news is we've uncovered a pretty nasty P0 blocker. The integration with the Stripe payment gateway is failing intermittently under load. During our stress tests last night, we saw a 20% transaction failure rate once we went past 100 concurrent users. This is a complete showstopper for launch.`;

const DEFAULT_API = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

export default function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API);
  const [transcript, setTranscript] = useState(SAMPLE);
  const [status, setStatus] = useState<string>("");
  const [output, setOutput] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);

  const endpoint = useMemo(() => apiBase.replace(/\/$/, ""), [apiBase]);

  const handleError = (error: unknown) => {
    setStatus("Error");
    setOutput({ error: String(error) });
  };

  const submitSync = async () => {
    setLoading(true);
    setStatus("Submitting transcript (sync)...");
    try {
      const res = await fetch(`${endpoint}/api/graphs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      setOutput(data);
      setStatus(res.ok ? "Completed" : "Error");
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const submitAsync = async () => {
    setLoading(true);
    setStatus("Queueing job...");
    try {
      const res = await fetch(`${endpoint}/api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      setOutput(data);
      if (!res.ok) {
        setStatus("Error");
        return;
      }
      setStatus(`Queued job ${data.jobId}. Polling...`);
      setLoading(false);

      const poll = async () => {
        const pollRes = await fetch(`${endpoint}/api/jobs/${data.jobId}`);
        const pollData = await pollRes.json();
        setOutput(pollData);
        setStatus(`Status: ${pollData.status}`);
        if (pollData.status === "completed" || pollData.status === "error") {
          return;
        }
        setTimeout(poll, 2000);
      };

      setTimeout(poll, 1500);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>InsightBoard Dependency Engine</h1>
      <p>React client for the Dependency Engine APIs.</p>

      <div className="grid">
        <div className="card">
          <label htmlFor="api-base">API Base URL</label>
          <input
            id="api-base"
            type="text"
            value={apiBase}
            onChange={(event) => setApiBase(event.target.value)}
          />
        </div>
        <div className="card">
          <label>Tips</label>
          <p>Run the backend on `http://localhost:3000` or update the base URL above.</p>
          <p>Use async to test job polling and idempotency.</p>
        </div>
      </div>

      <label htmlFor="transcript" style={{ marginTop: 16 }}>Transcript</label>
      <textarea
        id="transcript"
        value={transcript}
        onChange={(event) => setTranscript(event.target.value)}
      />

      <div className="actions">
        <button onClick={submitSync} disabled={loading}>Generate (sync)</button>
        <button className="secondary" onClick={submitAsync} disabled={loading}>Generate (async)</button>
      </div>

      <div className="status">{status}</div>
      <pre>{output ? JSON.stringify(output, null, 2) : "Run a request to see output."}</pre>
    </main>
  );
}
