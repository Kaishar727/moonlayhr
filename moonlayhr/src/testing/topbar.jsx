import React from "react";
import { Link, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./topbar.css";
import image from "../../assets/images/image.png"; // Add a profile picture

export default function Topbar({ keycloak, username }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const clearMessages = () => {
    localStorage.removeItem("chat_messages");
  };

  const handleLogout = () => {
    clearMessages();
    keycloak.logout();
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-light bg-light shadow-sm">
        <button
          className="navbar-toggler"
          type="button"
          data-toggle="collapse"
          data-target="#navbarTogglerDemo02"
          aria-controls="navbarTogglerDemo02"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarTogglerDemo02">
          <div className="navbar-nav">
            <Link to="/chatbot" className="nav-item nav-link">
              <button
                className={`nav-btn ${
                  currentPath === "/chatbot" ? "active" : ""
                }`}
              >
                Moonlay AI
              </button>
            </Link>
            <Link to="/applicant" className="nav-item nav-link">
              <button
                className={`nav-btn ${
                  currentPath === "/applicant" ? "active" : ""
                }`}
              >
                Applicant Info
              </button>
            </Link>
            <Link to="/moonassist" className="nav-item nav-link">
              <button
                className={`nav-btn ${
                  currentPath === "/moonassist" ? "active" : ""
                }`}
              >
                Moonassist
              </button>
            </Link>
          </div>
        </div>
        <div className="profile-container">
          <div className="dropdown show">
            <button
              className="btn btn-secondary dropdown-toggle"
              href="#"
              role="button"
              id="dropdownMenuLink"
              data-toggle="dropdown"
              aria-haspopup="true"
              aria-expanded="false"
            >
              <span className="profile-welcome"> Welcome {username} </span>
            </button>
            <div className="dropdown-menu" aria-labelledby="dropdownMenuLink">
              <a className="dropdown-item" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i> Logout
              </a>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
