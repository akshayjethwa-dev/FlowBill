import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";  // ✅ add this

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>   {/* ✅ wrap App */}
      <App />
    </AuthProvider>
  </React.StrictMode>
);