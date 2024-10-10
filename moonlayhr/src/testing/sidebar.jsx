import React from "react";
import { Link } from "react-router-dom";
import "./sidebar.css";


export default function Sidebar({ isAuthenticated, keycloak }) {
  return (
    <div>
      <sidebar>
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
          
        </nav>
        <div className="copyright">copyright &copy; 2018</div>
      </sidebar>
    </div>
  );
}
