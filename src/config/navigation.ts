import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  UtensilsCrossed,
  HeartPulse,
  Bell,
  Settings,
  Award,
  BarChart3,
  Shield,
  Baby,
  type LucideIcon,
} from "lucide-react";

export type UserRole = "admin" | "teacher" | "staff" | "guardian";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  roles?: UserRole[];
}

export const mainNavItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Học Sinh", icon: Users },
  { to: "/teachers", label: "Giáo Viên", icon: GraduationCap, roles: ["admin"] },
  { to: "/classes", label: "Lớp Học", icon: BookOpen },
  { to: "/attendance", label: "Điểm Danh", icon: ClipboardCheck, roles: ["admin", "teacher"] },
  { to: "/teacher-attendance", label: "Điểm Danh GV", icon: ClipboardList, roles: ["admin"] },
  { to: "/finance", label: "Tài Chính", icon: CreditCard, roles: ["admin"] },
  { to: "/nutrition", label: "Dinh Dưỡng", icon: UtensilsCrossed },
  { to: "/health", label: "Sức Khỏe", icon: HeartPulse, roles: ["admin", "teacher"] },
  { to: "/evaluations", label: "Đánh Giá", icon: Award, roles: ["admin", "teacher"] },
  { to: "/reports", label: "Báo Cáo", icon: BarChart3, roles: ["admin"] },
  { to: "/audit-log", label: "Nhật Ký", icon: Shield, roles: ["admin"] },
  { to: "/guardian", label: "Cổng PH", icon: Baby, roles: ["guardian"] },
];

export const bottomNavItems: NavItem[] = [
  { to: "/notifications", label: "Thông Báo", icon: Bell },
  { to: "/settings", label: "Cài Đặt", icon: Settings, roles: ["admin", "teacher"] },
];

/** Routes shown as fixed tabs in the mobile bottom nav bar, in order. */
export const mobileTabRoutes = ["/", "/students", "/attendance", "/notifications"];

function itemsForRole(role: UserRole | undefined): NavItem[] {
  return [...mainNavItems, ...bottomNavItems].filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );
}

/** The (up to 4) items shown as fixed tabs in the mobile bottom nav, falling
 *  back to the next available item per role if a preferred route is missing. */
export function getMobileTabItems(role: UserRole | undefined): NavItem[] {
  const available = itemsForRole(role);
  const preferred = mobileTabRoutes
    .map((route) => available.find((item) => item.to === route))
    .filter((item): item is NavItem => Boolean(item));
  const remaining = available.filter((item) => !preferred.includes(item));
  return [...preferred, ...remaining].slice(0, 4);
}

/** Every remaining nav item (for this role) not already shown in the bottom
 *  tab bar — listed in the mobile "Quản lý" sheet. */
export function getMobileMoreItems(role: UserRole | undefined): NavItem[] {
  const available = itemsForRole(role);
  const tabItems = getMobileTabItems(role);
  return available.filter((item) => !tabItems.includes(item));
}
