"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#080b14",
          color: "#dde3ef",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <div
            style={{
              display: "inline-block",
              borderRadius: "9999px",
              border: "1px solid rgba(239,68,68,0.3)",
              background: "rgba(239,68,68,0.08)",
              color: "#f87171",
              padding: "0.25rem 0.75rem",
              fontSize: "10.5px",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 500,
            }}
          >
            Unexpected error
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "1rem 0 0.5rem" }}>
            Something broke on our side.
          </h1>
          <p style={{ fontSize: "13px", lineHeight: 1.6, color: "#8290ad", margin: 0 }}>
            The workspace hit an error it could not recover from. Your data is untouched — this is a
            rendering failure, not a write.
            {error.digest ? ` Reference: ${error.digest}.` : ""}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              background: "#2dd4bf",
              color: "#05070d",
              border: 0,
              borderRadius: "0.5rem",
              padding: "0.6rem 1.1rem",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="/launchpad"
            style={{
              marginLeft: "0.75rem",
              color: "#5eead4",
              fontSize: "13px",
              textDecoration: "none",
            }}
          >
            Back to Launchpad
          </a>
        </div>
      </body>
    </html>
  );
}
