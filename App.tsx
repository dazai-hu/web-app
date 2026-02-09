
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import CapturePage from './components/CapturePage';
import AdminPanel from './components/AdminPanel';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderView = () => {
    if (currentPath.startsWith('#/capture/')) {
      const parts = currentPath.split('/');
      const linkId = parts[2];
      return <CapturePage linkId={linkId} />;
    }
    if (currentPath === '#/admin') {
      return <AdminPanel />;
    }
    return <Dashboard />;
  };

  return (
    <div className="min-h-screen">
      {renderView()}
    </div>
  );
};

export default App;
