import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import AppHeader from '@/components/AppHeader';
import NetworkStatus from '@/components/NetworkStatus';
import { cn } from '@/lib/utils';

const AppLayout = () => {
  const location = useLocation();
  const mainContentRef = useRef<HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem('inventa-sidebar-collapsed') === 'true',
  );

  useEffect(() => {
    window.localStorage.setItem('inventa-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    setSidebarOpen(false);
    mainContentRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);

  return (
    <div
      data-testid="app-shell"
      className="relative h-dvh min-h-0 w-full overflow-hidden bg-background"
    >
      <AppSidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onOpenChange={setSidebarOpen}
        onCollapsedToggle={() => setSidebarCollapsed((current) => !current)}
      />
      <div
        data-testid="app-content-column"
        className={cn(
          "flex h-full min-h-0 min-w-0 flex-col overflow-hidden transition-[margin-left] duration-200",
          sidebarCollapsed ? "lg:ml-[76px]" : "lg:ml-[248px] xl:ml-[260px]",
        )}
      >
        <NetworkStatus />
        <AppHeader
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main
          ref={mainContentRef}
          id="main-content"
          data-testid="main-content"
          className="min-h-0 min-w-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-4 sm:px-5 lg:px-6 lg:py-6"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
