import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

const API = "https://bp9x86yz97.execute-api.us-east-1.amazonaws.com/prod";

export default function App() {
  const [longUrl, setLongUrl] = useState("");
  const [urls, setUrls] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);

  const fetchUrls = useCallback(async () => {
    try {
      const res = await fetch(API + "/stats");
      const data = await res.json();
      setUrls(data.top_urls || []);
    } catch {
      setError("Could not load URLs.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  async function handleShorten(e) {
    e.preventDefault();

    if (!longUrl.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(API + "/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ long_url: longUrl }),
      });

      const data = await res.json();

      if (data.short_code) {
        setResult(API + "/" + data.short_code);
        setLongUrl("");
        fetchUrls();
      } else {
        setError("Something went wrong. Try again.");
      }
    } catch {
      setError("Could not reach the API.");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text, id) {
    navigator.clipboard.writeText(text);
    setCopied(id);

    setTimeout(() => {
      setCopied(null);
    }, 1800);
  }

  return (
    <div className="app">
      {/* Background grid */}
      <div className="bg-grid" aria-hidden="true" />

      <motion.header
        className="header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="header-inner">
          <div className="logo">
            <span className="logo-bracket">[</span>
            short
            <span className="logo-accent">.</span>
            ly
            <span className="logo-bracket">]</span>
          </div>

          <p className="tagline">
            Serverless URL shortener · built on AWS
          </p>
        </div>
      </motion.header>

      <main className="main">
        {/* Shorten card */}
        <motion.section
          className="card shorten-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <label className="card-label">New short URL</label>

          <form className="form" onSubmit={handleShorten}>
            <input
              className="url-input"
              type="url"
              placeholder="https://your-very-long-url.com/goes/here"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              required
            />

            <button
              className="shorten-btn"
              type="submit"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : "Shorten →"}
            </button>
          </form>

          <AnimatePresence>
            {error && (
              <motion.div
                className="error-box"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {result && (
              <motion.div
                className="result-box"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <span className="result-label">Ready to share</span>

                <div className="result-row">
                  <a
                    className="result-link"
                    href={result}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result}
                  </a>

                  <button
                    className={`copy-btn ${copied === "result" ? "copied" : ""
                      }`}
                    onClick={() => copyToClipboard(result, "result")}
                  >
                    {copied === "result" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* URL table card */}
        <motion.section
          className="card table-card"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
        >
          <div className="table-top">
            <label className="card-label">
              All links
              <span className="count-badge">{urls.length}</span>
            </label>

            <button className="refresh-btn" onClick={fetchUrls}>
              ↻ Refresh
            </button>
          </div>

          {fetching ? (
            <div className="loading-row">
              <span className="pulse" />

              <span
                className="pulse"
                style={{ width: "60%", animationDelay: ".1s" }}
              />

              <span
                className="pulse"
                style={{ width: "75%", animationDelay: ".2s" }}
              />
            </div>
          ) : urls.length === 0 ? (
            <p className="empty">No links yet — create one above.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Short URL</th>
                    <th>Destination</th>
                    <th>Clicks</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  <AnimatePresence>
                    {urls.map((u, i) => {
                      const short = API + "/" + u.short_code;

                      return (
                        <motion.tr
                          key={u.short_code}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <td>
                            <a
                              className="short-link"
                              href={short}
                              target="_blank"
                              rel="noreferrer"
                            >
                              /{u.short_code}
                            </a>
                          </td>

                          <td
                            className="dest-cell"
                            title={u.long_url}
                          >
                            {u.long_url}
                          </td>

                          <td className="clicks-cell">
                            <span className="clicks-badge">
                              {u.clicks}
                            </span>
                          </td>

                          <td>
                            <button
                              className={`copy-btn ${copied === u.short_code
                                  ? "copied"
                                  : ""
                                }`}
                              onClick={() =>
                                copyToClipboard(short, u.short_code)
                              }
                            >
                              {copied === u.short_code
                                ? "✓"
                                : "Copy"}
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </motion.section>

        {/* Footer link */}
        <motion.div
          className="footer-link"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <a
            href="http://url-shortener-dash-bananaiam.s3-website-us-east-1.amazonaws.com"
            target="_blank"
            rel="noreferrer"
          >
            View analytics dashboard →
          </a>
        </motion.div>
      </main>
    </div>
  );
}