import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './state/AppProvider';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </React.StrictMode>
);
