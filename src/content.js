import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '../public/styles.css';

const rootContainer = document.createElement('div');
document.body.appendChild(rootContainer);

const root = createRoot(rootContainer);
root.render(<App />);