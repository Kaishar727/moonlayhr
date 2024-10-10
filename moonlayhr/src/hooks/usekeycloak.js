import { useState, useEffect } from "react";
import Keycloak from "keycloak-js";

// Define Realm, Client, Keycloak URL

const keycloak = new Keycloak({
  url: "http://ac906658bc9f743d399d58d4992f8f58-1142431869.ap-southeast-1.elb.amazonaws.com:8080",
  realm: "hr",
  clientId: "dashboard-ui", 
});

export const Usekeycloak = () => {
  //Initialize Variable
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    // Initialize Keycloak
    async function initializeKeycloak() {
      try {
        const authenticated = await keycloak.init({
          onLoad: "login-required",
          redirectUri: "http://localhost:5173/chatbot",
          checkLoginIframe: false,
          rememberMe: true,
        });

        // if Authenticated, save Username
        if (authenticated) {
          const user = keycloak.tokenParsed.preferred_username;
          setUsername(user);
          setIsAuthenticated(authenticated);
        }
      } catch (error) {
        console.error("Keycloak initialization failed:", error);
      }
    }

    initializeKeycloak();

  }, []);

  return { isAuthenticated, username, keycloak };
};
