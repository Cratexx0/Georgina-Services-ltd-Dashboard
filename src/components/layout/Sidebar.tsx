import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar
} from "@/components/ui/sidebar";
import {
  BarChartBig,
  Package,
  ShoppingCart,
  Users,
  Settings,
  CalendarCheck,
  WrapText,
  FolderTree,
  MessageCircle,
  User2
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  active?: boolean;
}

function SidebarItem({ icon: Icon, label, path, active }: SidebarItemProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={label}
        className={cn(
          active &&
            "border-l-4 border-sidebar-primary bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm",
        )}
      >
        <Link to={path} className="flex items-center gap-3">
          <Icon className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span>{label}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function DashboardSidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const isActive = (paths: string | string[]) => {
    const pathList = Array.isArray(paths) ? paths : [paths];
    return pathList.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {!isCollapsed && (
            <div className="flex flex-col">
              <div>
                <Link to="/">
                  <img
                    src="/gina_logo.png"
                    alt="Gina E-Commerce Logo"
                    className="h-14 mb-1"
                  />
                </Link>
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>Main</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarItem
                icon={BarChartBig}
                label="Dashboard"
                path="/dashboard"
                active={isActive("/dashboard")}
              />

              <SidebarItem
                icon={BarChartBig}
                label="Analytics"
                path="/analytics"
                active={isActive("/analytics")}
              />

              <SidebarItem
                icon={Package}
                label="Products"
                path="/products"
                active={isActive(["/products", "/admin/products"])}
              />
              <SidebarItem
                icon={FolderTree}
                label="Categories"
                path="/categories"
                active={isActive("/categories")}
              />
              <SidebarItem
                icon={ShoppingCart}
                label="Orders"
                path="/orders"
                active={isActive("/orders")}
              />



              <SidebarItem
                icon={User2}
                label="Users"
                path="/users"
                active={isActive("/users")}
              />
              <SidebarItem
                icon={BarChartBig}
                label="Reviews"
                path="/review"
                active={isActive("/review")}
              />


            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!isCollapsed && <SidebarGroupLabel>Settings</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarItem
                icon={Settings}
                label="Settings"
                path="/settings"
                active={isActive("/settings")}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}