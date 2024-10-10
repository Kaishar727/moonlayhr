import { Chatbot } from "react-chatbot-kit";
import "react-chatbot-kit/build/main.css";
import config from "./config.js"
import MessageParser from "./messageparser.jsx";
import ActionProvider from "./actionprovider.jsx";
import React, { useState } from "react";
import "./chatbot.css"
// Initiate Data

export default function Moonlayai() {
  const [showBot, toggleBot] = useState(false);

  const saveMessages = (messages, HTMLString) => {
    localStorage.setItem("chat_messages", JSON.stringify(messages));
  };

  const loadMessages = () => {
    const messages = JSON.parse(localStorage.getItem("chat_messages"));
    return messages;
  };

  return (
    <Chatbot
      config={config}
      messageParser={MessageParser}
      actionProvider={ActionProvider}
      saveMessages={saveMessages}
    /> // refer to chatbot in components
  );
}
