"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import MuiButton from "@mui/material/Button";

export function LogoutButton({ plain = false }: { plain?: boolean }) {
  const logout = async () => {
    const supabase = createClient();
    // Local so this browser signs out even if the Auth server is unreachable.
    // A full load is what redraws the header and sidebar for the signed-out session.
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      console.error("logout failed", error.message);
      return;
    }

    window.location.replace("/auth/login");
  };

  if (plain) {
    return (
      <MuiButton
        variant="text"
        onClick={logout}
        sx={{ minWidth: 0, px: 0, py: 0, textTransform: "none", color: "text.primary" }}
      >
        Logout
      </MuiButton>
    );
  }

  return <Button onClick={logout}>Logout</Button>;
}
