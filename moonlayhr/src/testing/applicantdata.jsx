import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./chatbot.css";
import Applicantdata from "../components/applicantdata.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Applicantdata/>
  </StrictMode>
);
