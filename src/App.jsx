// App.js
import React, { useState } from 'react';
import PopcornSidebar from './sidebar.jsx';
import CorneliusButton from './CorneliusButton';
import '../public/styles.css';

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <>
      <PopcornSidebar isOpen={isSidebarOpen} closeSidebar= {closeSidebar} />
      <CorneliusButton toggleSidebar={toggleSidebar} />
    </>
  );
}

export default App;