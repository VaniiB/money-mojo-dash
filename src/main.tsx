import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { migrateFromLocalStorageOnce } from './lib/migrate';

// Ejecutar migración automática antes de montar la app
migrateFromLocalStorageOnce().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
