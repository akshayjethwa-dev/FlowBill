import React from 'react';
import { LayoutDashboard, ShoppingCart, Users, FileText, Settings, Bell, CreditCard, MessageSquare, ClipboardList, TrendingUp, History } from 'lucide-react';

export interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  id: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, href: '/orders' },
  { id: 'customers', label: 'Customers', icon: Users, href: '/customers' },
  { id: 'estimates', label: 'Estimates', icon: ClipboardList, href: '/estimates' },
  { id: 'invoices', label: 'Invoices', icon: FileText, href: '/invoices' },
  { id: 'payments', label: 'Payments', icon: CreditCard, href: '/payments' },
  { id: 'ledger', label: 'Ledger', icon: TrendingUp, href: '/ledger' },
  { id: 'reminders', label: 'Reminders', icon: Bell, href: '/reminders' },
  { id: 'activity-log', label: 'Activity Log', icon: History, href: '/activity-log' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
];

export const BRAND_NAME = "VyaparFlow";
