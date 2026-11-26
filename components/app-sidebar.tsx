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

  return (
    <aside className="w-56 shrink-0 border-r">
      <SidebarNav role={role} />
    </aside>
  );
}
