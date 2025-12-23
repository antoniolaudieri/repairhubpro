import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Remove initial loader once React is ready
const removeInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.3s';
    setTimeout(() => loader.remove(), 300);
  }
};

const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
  
  // Remove loader after a small delay to ensure React has mounted
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      removeInitialLoader();
    });
  });
}
