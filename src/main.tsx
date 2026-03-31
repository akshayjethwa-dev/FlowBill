import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css"; // ✅ Added: This applies all the Tailwind CSS styles!

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* ✅ Removed the duplicate AuthProvider. App.tsx already handles it. */}
    <App />
  </React.StrictMode>
);