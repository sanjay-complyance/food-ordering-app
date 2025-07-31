"use client";

import { useState, useEffect } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Menu, 
  X, 
  Home, 
  ShoppingCart, 
  User, 
  Settings,
  Search
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
}

export function ResponsiveLayout({
  children,
  showSidebar = true,
  showHeader = true,
  showFooter = true,
}: ResponsiveLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { user, isAdmin } = useAuth();

  // Close sidebar when screen size changes
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const navigationItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/profile", label: "Profile", icon: User },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Settings }] : []),
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Menu</h2>
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={() => isMobile && setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">{user?.name || "User"}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const MobileHeader = () => (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          
          <h1 className="text-lg font-semibold">Daily Lunch</h1>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="h-4 w-4" />
          </Button>
          
          <NotificationBell />
          
          <Button variant="ghost" size="sm">
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {searchOpen && (
        <div className="mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search menu items..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}
    </header>
  );

  const DesktopHeader = () => (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <h1 className="text-xl font-semibold">Daily Lunch Ordering</h1>
          
          <nav className="hidden md:flex space-x-6">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <NotificationBell />
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium">{user?.name || "User"}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );

  const MobileFooter = () => (
    <footer className="bg-white border-t border-gray-200 px-4 py-3 md:hidden">
      <div className="flex items-center justify-around">
        <a
          href="/"
          className="flex flex-col items-center space-y-1 text-gray-600 hover:text-gray-900"
        >
          <Home className="h-5 w-5" />
          <span className="text-xs">Home</span>
        </a>
        
        <a
          href="/profile"
          className="flex flex-col items-center space-y-1 text-gray-600 hover:text-gray-900"
        >
          <User className="h-5 w-5" />
          <span className="text-xs">Profile</span>
        </a>
        
        {isAdmin && (
          <a
            href="/admin"
            className="flex flex-col items-center space-y-1 text-gray-600 hover:text-gray-900"
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">Admin</span>
          </a>
        )}
        
        <button className="flex flex-col items-center space-y-1 text-gray-600 hover:text-gray-900">
          <ShoppingCart className="h-5 w-5" />
          <span className="text-xs">Cart</span>
        </button>
      </div>
    </footer>
  );

  const DesktopFooter = () => (
    <footer className="bg-gray-50 border-t border-gray-200 px-6 py-8 hidden md:block">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Daily Lunch Ordering</h3>
            <p className="text-gray-600 text-sm">
              Streamline your daily lunch ordering process with our easy-to-use platform.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="text-gray-600 hover:text-gray-900">Home</a></li>
              <li><a href="/profile" className="text-gray-600 hover:text-gray-900">Profile</a></li>
              {isAdmin && <li><a href="/admin" className="text-gray-600 hover:text-gray-900">Admin</a></li>}
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Help Center</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Contact Us</a></li>
              <li><a href="#" className="text-gray-600 hover:text-gray-900">Privacy Policy</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium mb-4">Connect</h4>
            <p className="text-gray-600 text-sm">
              Stay updated with the latest menu changes and announcements.
            </p>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-8 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            © 2024 Daily Lunch Ordering. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {showHeader && (
        <>
          {isMobile ? <MobileHeader /> : <DesktopHeader />}
        </>
      )}

      <div className="flex flex-1">
        {showSidebar && !isMobile && (
          <aside className="w-64 bg-white border-r border-gray-200">
            <SidebarContent />
          </aside>
        )}

        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>

      {showFooter && (
        <>
          {isMobile ? <MobileFooter /> : <DesktopFooter />}
        </>
      )}
    </div>
  );
} 