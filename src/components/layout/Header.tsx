import React from 'react';
import { Bell, Search, Menu, User } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick, title }) => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 lg:text-xl">{title}</h1>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <div className="hidden md:flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent border-none focus:ring-0 text-sm ml-2 w-48 lg:w-64"
          />
        </div>

        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg relative transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>

        <button className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded-lg transition-colors">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-indigo-600" />
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block">Merchant Name</span>
        </button>
      </div>
    </header>
  );
};
