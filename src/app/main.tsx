import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { startPersistence } from '../store/start-persistence.service';
import { App } from './App';

void startPersistence();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
