"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ActivityTracker } from "@/components/activity-tracker";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { LanguageSwitcher, useLanguage } from "@/components/language-provider";
import { ThemeToggle } from "@/components/theme-provider";
import { PRODUCT_NAME, PROJECT_NAME } from "@/lib/config";
import { canAccessSection } from "@/lib/permissions";
import type { CurrentUser, SectionKey } from "@/lib/types";

type NavigationItem = {
  href: string;
  icon: string;
  label: string;
  section: SectionKey;
};

const projectNav: NavigationItem[] = [
  { href: "/dashboard", icon: "◫", label: "Executive Overview", section: "overview" },
  { href: "/dashboard/document-control", icon: "▤", label: "Document Control", section: "document_control" },
  { href: "/dashboard/progress", icon: "⌁", label: "Progress & S-Curves", section: "progress" },
  { href: "/dashboard/schedule", icon: "▥", label: "Project Schedule", section: "schedule" }
];

const administrationNav: NavigationItem[] = [
  { href: "/dashboard/admin/imports", icon: "⇧", label: "Import & Publish", section: "imports" },
  { href: "/dashboard/users", icon: "◎", label: "User Access", section: "user_access" },
  { href: "/dashboard/activity", icon: "◷", label: "Activity Log", section: "activity_log" }
];

const mobileNavOrder = [
  projectNav[0],
  projectNav[2],
  projectNav[1],
  projectNav[3]
];

function MobileNavIcon({ section }: { section: SectionKey }) {
  if (section === "overview") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5h-5.6v-7H9.1v7H3.5a.5.5 0 0 1-.5-.5v-9.7Z" /></svg>;
  if (section === "progress") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 19V5M4 19h16M7 15l3-4 3 2 5-7M15 6h3v3" /></svg>;
  if (section === "document_control") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6V3Zm8 0v5h4M9 12h6M9 16h6" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 5h14v16H5V5Zm3-2v4m8-4v4M5 9h14M8 13h2m2 0h2m2 0h1M8 17h2m2 0h2" /></svg>;
}

function NavigationLinks({ items, pathname, close, translate }: {
  items: NavigationItem[];
  pathname: string;
  close: () => void;
  translate: (value: string) => string;
}) {
  return items.map((item) => (
    <div key={item.href}>
      <Link className={pathname === item.href ? "active" : ""} href={item.href} onClick={close}>
        <i>{item.icon}</i>
        <span>{translate(item.label)}</span>
      </Link>
    </div>
  ));
}

export function AppShell({ user, children, dataDate }: { user: CurrentUser; children: React.ReactNode; dataDate?: string | null }) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const projectItems = projectNav.filter((item) => canAccessSection(user, item.section));
  const administrationItems = administrationNav.filter((item) => canAccessSection(user, item.section));

  return (
    <div className="app-frame">
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="taurus-logo-wrap sidebar-logo">
            <Image alt="Taurus" height={35} priority src="/taurus-logo.jpeg" width={140} />
          </div>
          <div>
            <strong>{PRODUCT_NAME}</strong>
            <small>{t("CONTROLLED DATA PORTAL")}</small>
          </div>
        </div>
        <nav className="side-nav">
          <span className="nav-section-label">{t("PROJECT CONTROL")}</span>
          <NavigationLinks items={projectItems} pathname={pathname} close={() => setOpen(false)} translate={t} />
          {administrationItems.length ? <span className="nav-section-label admin-label">{t("ADMINISTRATION")}</span> : null}
          <NavigationLinks items={administrationItems} pathname={pathname} close={() => setOpen(false)} translate={t} />
        </nav>
        <div className="sidebar-footer">
          <div className="avatar">{user.fullName.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{user.fullName}</strong>
            <small>{user.role.replaceAll("_", " ")}</small>
          </div>
          <form action="/api/auth/logout" method="post">
            <button title={t("Sign out")} type="submit">↪</button>
          </form>
        </div>
      </aside>
      <PresenceHeartbeat />
      <div className="main-column">
        <header className="mobile-app-header">
          <div className="mobile-app-brand">
            <Image alt="Taurus Project Control" height={48} priority src="/taurus-app-icon.png" width={48} />
            <strong>{PRODUCT_NAME}</strong>
          </div>
          <button aria-label={t("Open navigation")} className="mobile-menu-trigger" onClick={() => setOpen((value) => !value)} type="button">
            <span /><span /><span />
          </button>
        </header>
        <header className="topbar">
          <button className="menu-button" onClick={() => setOpen((value) => !value)} type="button">☰</button>
          <div>
            <span>{t("ACTIVE PROJECT")}</span>
            <strong>{PROJECT_NAME}</strong>
          </div>
          <div className="topbar-actions">
            <ThemeToggle compact />
            <LanguageSwitcher compact />
            <span className="live-indicator"><i /> {dataDate ? t("Published data") : t("Awaiting first publish")}</span>
            <div className="date-badge"><span>{t("DATA DATE")}</span><strong>{dataDate ?? t("Not published")}</strong></div>
          </div>
        </header>
        <main className="page-content">{children}</main>
        <nav aria-label={t("Primary navigation")} className="mobile-bottom-nav">
          {mobileNavOrder.filter((item) => canAccessSection(user, item.section)).map((item) => (
            <Link className={pathname === item.href ? "active" : ""} href={item.href} key={item.href}>
              <i><MobileNavIcon section={item.section} /></i>
              <span>{t(item.label === "Executive Overview" ? "Overview" : item.label === "Progress & S-Curves" ? "Progress" : item.label === "Document Control" ? "Documents" : "Schedule")}</span>
            </Link>
          ))}
        </nav>
        <ActivityTracker />
      </div>
    </div>
  );
}
