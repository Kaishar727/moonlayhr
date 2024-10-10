import React, { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Root from "./routes/root";
import Chatpage from "./routes/moonlayai";
import ErrorPage from "./components/errorpage";
import Applicantdata from "./routes/moonlayapplicants";
import LoadingScreen from "./components/loading/loadingscreen";
import Moonlayassist from "./routes/moonlayassist";


const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "applicant",
        element: <Applicantdata />,
        errorElement: <ErrorPage />,
      },
      {
        path: "chatbot",
        element: <Chatpage />,
        errorElement: <ErrorPage />,
      },
      {
        path: "moonassist",
        element: <Moonlayassist/>,
        errorElement: <ErrorPage />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Suspense fallback = {<LoadingScreen/>}>
    <RouterProvider router={router}/>
    </Suspense>
  </StrictMode>
);
