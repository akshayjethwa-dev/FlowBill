import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { NAV_ITEMS } from '../../constants';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeId: string;
  onNavigate: (id: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeId, onNavigate }) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const activeItem = NAV_ITEMS.find(item => item.id === activeId);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar activeId={activeId} onNavigate={onNavigate} />
      </div>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        activeId={activeId}
        onNavigate={onNavigate}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setIsMobileNavOpen(true)}
          title={activeItem?.label || "Dashboard"}
        />
        <main className="flex-1 overflow-y-auto focus:outline-none scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
};
