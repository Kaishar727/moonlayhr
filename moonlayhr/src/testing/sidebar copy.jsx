import React from "react";
import { Link } from "react-router-dom";
import "./sidebar.css";
import image from "../../assets/images/image.png"

export default function Sidebar({ keycloak }) {
  return (
    <div className="s-layout__sidebar">
      <a className="s-sidebar__trigger" href="#0">
        <i className="fa fa-bars"></i>
      </a>

      <nav className="s-sidebar__nav">
        <ul>
          <li>
            <div className="nav-brand">
              <img src={image} className="nav-brand-img" />
            </div>
          </li>
          <li>
            <Link to="/chatbot" className="s-sidebar__nav-link">
              <button>
                <i className="fa fa-user"></i>
                <em>Moonlay AI</em>
              </button>
            </Link>
          </li>

          <li>
            <Link to="/applicant" className="s-sidebar__nav-link">
              <button>
                <i className="fa fa-user"></i>
                <em>Applicant Data</em>
              </button>
            </Link>
          </li>

          <li>
            <a
              className="s-sidebar__nav-link"
              onClick={() => keycloak.logout()}
              style={{ cursor: "pointer" }} // Added for better UX
            >
              <button>
                <i className="fa fa-camera"></i>
                <em>Logout</em>
              </button>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
}
