import { Link, useLocation } from "wouter";
import { LayoutDashboard, Briefcase, Settings, LogOut } from "lucide-react";
const logoImg = "/logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";
import { useListProjects } from "@workspace/api-client-react";
import { getAuthRequest } from "@/lib/api-helpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: projects } = useListProjects({ request: getAuthRequest() });

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar/95 backdrop-blur-xl">
      <SidebarContent>
        <div className="p-6 flex items-center gap-3 border-b border-border/50">
          <img src={logoImg} alt="Market Mind" className="w-8 h-8 rounded-lg flex-shrink-0" />
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Market Mind
          </span>
        </div>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/dashboard"} className="hover-elevate transition-all">
                  <Link href="/dashboard" className="flex items-center gap-3">
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/projects"} className="hover-elevate transition-all">
                  <Link href="/projects" className="flex items-center gap-3">
                    <Briefcase className="w-4 h-4" />
                    <span>All Projects</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Your Projects</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects?.slice(0, 5).map((project) => (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton asChild isActive={location === `/projects/${project.id}`} className="hover-elevate">
                    <Link href={`/projects/${project.id}`} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <div className="flex items-center gap-3 mb-4 px-2">
          <Avatar className="w-9 h-9 border border-border">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/20 text-primary">{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col flex-1 overflow-hidden">
            <span className="text-sm font-medium truncate text-foreground">{user?.name}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="hover-elevate text-muted-foreground hover:text-foreground">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} className="hover-elevate text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
