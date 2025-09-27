import React from "react";
import ReactDOM from "react-dom/client"; // use /client for React 18
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { UserProvider } from "./context/UserContext";

// create root
ReactDOM.createRoot(document.getElementById("root")).render(
   <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <App />
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);
