import React, { useState, useEffect } from "react";
import { Chatbot } from "react-chatbot-kit";
import "react-chatbot-kit/build/main.css";
import config from "../components/chatbot/config.js";
import MessageParser from "../components/chatbot/messageparser.jsx";
import ActionProvider from "../components/chatbot/actionprovider.jsx";
import Keycloak from "keycloak-js";
import LoadingScreen from "../components/loading/loadingscreen.jsx";
import "../styles.css"
import { Outlet, Link } from "react-router-dom";

const keycloak = new Keycloak({
  url: "http://127.0.0.1:8080/",
  realm: "cv-receiver",
  clientId: "cvreceiver",
});

export default function Root() {
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
        <div className="wrapper">
          <main>
            <div className="toolbar">
              <div className="toggle" />
            </div>
            <div className="main_content">
              <Outlet />
            </div>
          </main>
          <sidebar>
            <div className="logo">logo</div>
            <div className="avatar">
              <div className="avatar__img">
                <img src="https://picsum.photos/70" alt="avatar" />
              </div>
              <div className="avatar__name">John Smith</div>
            </div>
            <nav className="menu">
              <Link to="/chatbot">
                <button className="menu__item">
                  <i className="menu__icon fa fa-home"></i>
                  <span className="menu__text">Moonlay AI</span>
                </button>
              </Link>

              <Link to="/applicant">
                <button className="menu__item">
                  <i className="menu__icon fa fa-envelope"></i>
                  <span className="menu__text">Applicant</span>
                </button>
              </Link>
              
                <button className="logout_button" onClick={() => keycloak.logout()}>
                  <i className="menu__icon fa fa-home"></i>
                  <span className="menu__text">Logout</span>
                </button>
            </nav>
            <div className="copyright">copyright &copy; 2018</div>
          </sidebar>
        </div>
      )}
    </div>
  );
}
