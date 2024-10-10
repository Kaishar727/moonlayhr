import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./topbar.css";
import image from "../../assets/images/image.png"; // Add a profile picture
import { FaBars } from "react-icons/fa"; // Import three-dash icon

export default function Topbar({ keycloak, username }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const clearMessages = () => {
    localStorage.removeItem("chat_messages");
  };

  const handleLogout = () => {
    clearMessages();
    keycloak.logout();
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-light bg-light shadow-sm">
        <div className="container-fluid">
          <div className="navbar-nav d-flex align-items-center">
            <button
              className="navbar-toggler"
              type="button"
              onClick={toggleDropdown}
            >
              <FaBars />
            </button>
            <div
              className={`collapse navbar-collapse ${
                isDropdownOpen ? "show" : ""
              }`}
            >
              <Link
                to="/chatbot"
                className={`nav-item nav-link ${
                  currentPath === "/chatbot" ? "active" : ""
                }`}
              >
                <span className="text-hyperlink">Moonlay AI</span>
              </Link>
              <Link
                to="/applicant"
                className={`nav-item nav-link ${
                  currentPath === "/applicant" ? "active" : ""
                }`}
              >
                <span className="text-hyperlink">Applicant Info</span>
              </Link>
              <Link
                to="/cvbuilder"
                className={`nav-item nav-link ${
                  currentPath === "/cvbuilder" ? "active" : ""
                }`}
              >
                <span className="text-hyperlink">CV-Builder</span>
              </Link>
            </div>
          </div>
          <div className="d-flex align-items-center ms-auto">
            <div className="dropdown show">
              <a
                className="btn btn-secondary dropdown-toggle"
                href="#"
                role="button"
                id="dropdownMenuLink"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                <img src={image} alt="Profile" className="profile-pic me-2" />
              </a>

              <div className="dropdown-menu" aria-labelledby="dropdownMenuLink">
                <Link to="/settings" className="dropdown-item">
                  <i className="fas fa-cog"></i>{" "}
                  <span className="text-hyperlink">Settings</span>
                </Link>
                <a className="dropdown-item" onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt"></i> Logout
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>
      <nav className="navbar navbar-expand-lg navbar-light bg-light shadow-sm secondary">
        <div className="container-fluid">
          <div className="d-flex align-items-center ms-auto">
            <span>Welcome {username}</span>
          </div>
        </div>
      </nav>
    </>
  );
}
