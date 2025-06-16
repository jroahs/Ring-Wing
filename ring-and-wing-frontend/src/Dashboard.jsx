// filepath: c:\Games\Ring-Wing\ring-and-wing-frontend\src\Dashboard.jsx
import DashboardMinimal from './components/DashboardMinimal';

function Dashboard() {
  const colors = {
    primary: '#2e0304',
    background: '#fefdfd',
    accent: '#f1670f',
    secondary: '#853619',
    muted: '#ac9c9b',
    activeBg: '#f1670f20'
  };
  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.background }}>
      <main className="p-4 sm:p-6" style={{ color: colors.primary }}>
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Dashboard Overview</h2>
          {/* Using our minimal and efficient dashboard component */}
          <DashboardMinimal />
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
