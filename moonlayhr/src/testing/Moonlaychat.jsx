import React, { useState, useEffect } from "react";
import { Chatbot } from "react-chatbot-kit";
import "react-chatbot-kit/build/main.css";
import config from "../components/config.js";
import MessageParser from "../components/messageparser.jsx";
import ActionProvider from "../components/actionprovider.jsx";
import Keycloak from "keycloak-js";
import LoadingScreen from "../components/loadingscreen.jsx";
import KeycloakAuth from "../hooks/keycloakauth.js";

const keycloak = new Keycloak({
  url: "http://127.0.0.1:8080/",
  realm: "cv-receiver",
  clientId: "cvreceiver",
});

function Moonlaychat() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initializeKeycloak() {
      try {
        const authenticated = await keycloak.init({
          onLoad: "login-required",
          checkLoginIframe: false,
        });
        setIsAuthenticated(authenticated);
        console.log("Authentication successful");
      } catch (error) {
        console.error("Keycloak initialization failed:", error);
      }
    }

    initializeKeycloak();

    // Hide loading screen after 3.3 seconds
    const timer = setTimeout(() => setLoading(false), 3300);

    return () => clearTimeout(timer); // Cleanup timer
  }, []);

  // Show loading screen until both the loading period and authentication are complete
  return (
    <div className="wrapper">
      {loading || !isAuthenticated ? (
        <LoadingScreen />
      ) : (
        <div className="main-content">
          <div className="sidebar">
            <h2>Moonlay</h2>
            <ul>
              <li>
                <a href="#">
                  <i className="fas fa-home"></i>Moonlay AI
                </a>
              </li>
              <li>
                <a href="#">
                  <i className="fas fa-user"></i>Applicant Data
                </a>
              </li>
            </ul>
            <div className="social_media">
              <a id="logoutButton" href="#" onClick={() => keycloak.logout()}>
                Logout
              </a>
            </div>
          </div>
          <div className="main_content">
            <Chatbot
              config={config}
              messageParser={MessageParser}
              actionProvider={ActionProvider}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Moonlaychat;