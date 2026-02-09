
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import CapturePage from './components/CapturePage';
import { LinkConfig } from './types';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(window.location.hash || '#/');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Simple Router based on Hash
  const renderView = () => {
    if (currentPath.startsWith('#/capture/')) {
      const linkId = currentPath.replace('#/capture/', '');
      return <CapturePage linkId={linkId} />;
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
