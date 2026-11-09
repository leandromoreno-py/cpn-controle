import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AppProvider } from './state/store';
import './index.css';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Elemento #root não encontrado em index.html');

createRoot(raiz).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
);
