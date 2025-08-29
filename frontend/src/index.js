import React from "react";
import ReactDOM from "react-dom/client"; // use /client for React 18
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";

// create root
ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
