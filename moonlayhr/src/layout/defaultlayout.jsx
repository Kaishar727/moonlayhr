import React from "react";
import Topbar from "../components/Topbar/topbar.jsx";
import "./defaultlayout.css";
import LoadingScreen from "../components/loading/loadingscreen.jsx";

//Default Layout of Dashboard

export default function DefaultLayout({
  children, //Routes for react router
  loading, // Loading Screen
  isAuthenticated, // Authenticated Status from Keycloak
  keycloak, // Keycloak Itself
  username, // Name of User
}) {
  return (
    <div className="t-layout">
      {loading || !isAuthenticated ? (
        <LoadingScreen />
      ) : (
        <>
          <Topbar keycloak={keycloak} username={username} />
          <main className="t-layout__content">
            <div className="info-container">{children}</div>
          </main>
        </>
      )}
    </div>
  );
}
