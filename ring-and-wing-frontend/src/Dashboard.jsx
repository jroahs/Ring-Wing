// filepath: c:\Games\Ring-Wing\ring-and-wing-frontend\src\Dashboard.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import DashboardMinimal from './components/DashboardMinimal';

function Dashboard() {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const pageMargin = useMemo(() => {
    if (windowWidth >= 1920) return '8rem';
    if (windowWidth >= 768) return '5rem';
    return '0';
  }, [windowWidth]);

  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b',
    activeBg: '#f1670f20'
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: colors.background }}>
      <div className="flex-1 flex flex-col" style={{ marginLeft: pageMargin, transition: 'margin 0.3s' }}>
        <main className="flex-1 p-4 sm:p-6" style={{ color: colors.primary }}>
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">Dashboard Overview</h2>
            {/* Using our minimal and efficient dashboard component */}
            <DashboardMinimal />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
