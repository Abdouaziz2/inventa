import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import AppHeader from '@/components/AppHeader';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-background">
      <AppSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
