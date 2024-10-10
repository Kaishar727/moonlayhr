import React, { useState, useEffect} from "react";
import { Outlet } from "react-router-dom";
import DefaultLayout from "../layout/defaultlayout.jsx";
import "../styles.css";
import { Usekeycloak } from "../hooks/usekeycloak.js";

// Handle Keycloak Login

export default function Root() {
  const { isAuthenticated, username, keycloak } = Usekeycloak() // Use the hook

  return (
    <DefaultLayout
      isAuthenticated={isAuthenticated}
      keycloak={keycloak}
      username={username}
    >
      <Outlet />
    </DefaultLayout>
  );
}
