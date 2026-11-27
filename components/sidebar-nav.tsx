"use client";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import EditCalendarOutlinedIcon from "@mui/icons-material/EditCalendarOutlined";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

type SidebarItem = {
  href: string;
  label: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
};

const openWidth = 224;
const closedWidth = 72;

const studentItems: SidebarItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: <DashboardOutlinedIcon />,
    isActive: (pathname) => pathname === "/",
  },
  {
    href: "/consultations/book",
    label: "Book consultation",
    icon: <EditCalendarOutlinedIcon />,
    isActive: (pathname) => pathname.startsWith("/consultations/book"),
  },
];

const adminItems: SidebarItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: <DashboardOutlinedIcon />,
    isActive: (pathname) => pathname === "/",
  },
];

export function SidebarNav({ role }: { role: "student" | "admin" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const items = role === "admin" ? adminItems : studentItems;
  const label = role === "admin" ? "Admin" : "Student";
  const width = open ? openWidth : closedWidth;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        transition: (theme) =>
          theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: open
              ? theme.transitions.duration.enteringScreen
              : theme.transitions.duration.leavingScreen,
          }),
        "& .MuiDrawer-paper": {
          width,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflowX: "hidden",
          boxSizing: "border-box",
          borderRight: 1,
          borderColor: "divider",
          transition: (theme) =>
            theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: open
                ? theme.transitions.duration.enteringScreen
                : theme.transitions.duration.leavingScreen,
            }),
        },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: open ? "flex-end" : "center", p: 1 }}>
        <IconButton
          aria-label={open ? "Close sidebar" : "Open sidebar"}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>
      <List component="nav" aria-label={label}>
        {items.map((item) => {
          const active = item.isActive(pathname);

          return (
            <Tooltip
              key={item.href}
              title={open ? "" : item.label}
              placement="right"
              disableHoverListener={open}
              disableFocusListener={open}
              disableTouchListener={open}
            >
              <ListItemButton
                component={Link}
                href={item.href}
                selected={active}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? "initial" : "center",
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 2 : 0,
                    justifyContent: "center",
                    color: "inherit",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open ? <ListItemText primary={item.label} sx={{ whiteSpace: "nowrap" }} /> : null}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>
    </Drawer>
  );
}
