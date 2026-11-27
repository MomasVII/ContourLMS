import { getCurrentRole } from "@/lib/api/auth";
import { hasEnvVars } from "@/lib/utils";

import { SidebarNav } from "./sidebar-nav";

export async function AppSidebar() {
  if (!hasEnvVars) {
    return null;
  }

  const role = await getCurrentRole();

  if (!role) {
    return null;
  }

  return <SidebarNav role={role} />;
}
