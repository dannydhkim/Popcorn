import React from 'react';
import { createRoot } from 'react-dom/client';

function Popup() {
  return (
    <div style={{ width: '200px', padding: '10px' }}>
      <h1>Hello, Popup!</h1>
      <p>This is a simple popup for your extension.</p>
    </div>
  );
}

const rootContainer = document.createElement('div');
document.body.appendChild(rootContainer);

const root = createRoot(rootContainer);
root.render(<Popup />);
