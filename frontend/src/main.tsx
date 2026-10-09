import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider as ReduxProvider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { PersistGate } from "redux-persist/integration/react";

import "./index.css";
import App from "./App";
import store, { persistor } from "./app/store";
import ToastProvider from "./components/ui/Toast";
import installNumberInputGuard from "./utils/numberInputGuard";

// Before the app mounts, so no field is ever unguarded.
installNumberInputGuard();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BrowserRouter>
      </PersistGate>
    </ReduxProvider>
  </StrictMode>
);
