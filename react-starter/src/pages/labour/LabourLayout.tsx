import { useState, useRef, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Heart,
  Activity,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";

const navItems = [
  { path: "/labour", label: "แดชบอร์ด", icon: LayoutDashboard },
  { path: "/labour/cases", label: "เคสการคลอด", icon: Heart },
  { path: "/labour/reports", label: "รายงาน", icon: BarChart3 },
  { path: "/labour/settings", label: "ตั้งค่า", icon: Settings },
];

export default function LabourLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!userMenu) return;
    const handler = (e: MouseEvent) => { if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenu]);

  const isActive = (path: string) => {
    if (path === "/labour") return location.pathname === "/labour";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* ── Top Header ── */}
      <header className="bg-white text-gray-900 border border-gray-200 shadow-sm shrink-0 z-40 mx-4 md:mx-8 lg:mx-12 xl:mx-16 mt-4 rounded-2xl">
        <div className="flex items-center justify-between h-14 px-4 md:px-6">
          {/* Brand — left */}
          <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 shrink-0">
              <Activity size={18} className="text-teal-600" />
            </div>
            <span className="text-base font-bold hidden sm:inline">Smart Labour Room</span>
          </div>

          {/* Desktop nav — center */}
          <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 justify-center flex-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={[
                    "flex items-center gap-1.5 px-3 lg:px-4 py-2 rounded-lg text-sm lg:text-base font-semibold transition-colors",
                    active
                      ? "bg-teal-600 text-white"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
                  ].join(" ")}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User avatar — right */}
          <div
            className="hidden md:flex items-center justify-end shrink-0 relative"
            ref={userRef}
            onMouseEnter={() => setUserMenu(true)}
            onMouseLeave={() => setUserMenu(false)}
          >
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-sm font-bold text-teal-600">
                สศ
              </div>
              <span className="text-sm text-gray-600 font-medium">พยาบาล สมศรี</span>
            </div>
            {userMenu && (
              <div className="absolute right-0 top-full w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                <Link to="/labour/settings" onClick={() => setUserMenu(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <Settings size={16} />
                  ตั้งค่า
                </Link>
                <button onClick={() => setUserMenu(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors w-full">
                  <LogOut size={16} />
                  ออกจากระบบ
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-gray-200 px-4 py-2 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={[
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-teal-600 text-white"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
                  ].join(" ")}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto px-4 py-4 md:px-8 lg:px-12 xl:px-16">
        <Outlet />
      </main>
    </div>
  );
}
