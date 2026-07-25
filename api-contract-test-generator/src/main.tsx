import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { setupMonaco } from './editor/setupMonaco';
import './index.css';

setupMonaco();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
