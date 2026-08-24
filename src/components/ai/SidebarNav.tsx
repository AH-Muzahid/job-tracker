"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  LogOut,
  Check,
  ChevronDown,
  X,
  SquarePen,
  Home,
  Search,
  Plus,
  Bot,
  Settings,
  PanelLeftClose,
  UserPlus,
  Trash2,
  Briefcase,
  Brain,
  Sparkles,
} from "lucide-react";
import GlideMenu from "@/components/primitives/GlideMenu";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

/* ─────────────────────────────────────────────────────────
 * ICON WRAPPERS
 * Clean SVG/Lucide wrappers matching the exact design schema
 * ───────────────────────────────────────────────────────── */
export function IconArrowBoxLeft({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <LogOut size={size} className={className} />;
}
export function IconCheckmark1Small({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <Check size={size} className={className} />;
}
export function IconChevronDownSmall({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <ChevronDown size={size} className={className} />;
}
export function IconCrossSmall({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <X size={size} className={className} />;
}
export function IconEditBig({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <SquarePen size={size} className={className} />;
}
export function IconHome({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <Home size={size} className={className} />;
}
export function IconMagnifyingGlass({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <Search size={size} className={className} />;
}
export function IconPlusMedium({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <Plus size={size} className={className} />;
}
export function IconPopsicle2({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <Sparkles size={size} className={className} />;
}
export function IconSettingsGear1({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <Settings size={size} className={className} />;
}
export function IconSidebarLeftArrow({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <PanelLeftClose size={size} className={className} />;
}
export function IconUserAdd({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <UserPlus size={size} className={className} />;
}

/* ─────────────────────────────────────────────────────────
 * SIDEBAR NAV
 * Shared by the design-system preview and the harness shell:
 * compact workspace switcher, primary navigation, searchable
 * chat history, and a collapse that preserves icon alignment.
 * ───────────────────────────────────────────────────────── */

const DEFAULT_WORKSPACE = { key: "careertrack", name: "CareerTrack AI", monogram: "C" };

const DEFAULT_NAV_ITEMS = [
  { key: "home", label: "Dashboard", href: "/dashboard", icon: <IconHome size={18} /> },
  { key: "applications", label: "Applications", href: "/applications", icon: <Briefcase size={18} /> },
  { key: "prep", label: "Interview Prep", href: "/interview-prep", icon: <Brain size={18} /> },
];

export type SidebarRecent = {
  id: string;
  label: string;
  prompt?: string;
};

const DEFAULT_RECENTS: SidebarRecent[] = [
  { id: "suppliers", label: "Supplier records" },
  { id: "todos", label: "Urgent to-dos this morning" },
  { id: "flavor", label: "Flavor page ticket" },
  { id: "workload", label: "Workload summary" },
  { id: "offboarding", label: "Off-board a supplier" },
  { id: "restock", label: "Batch restock function" },
  { id: "edits", label: "Propose flavor edits" },
  { id: "subway", label: "Subway surfing" },
];

export type SidebarNavProps = {
  activeTitle?: string | null;
  activeId?: string | null;
  className?: string;
  fill?: boolean;
  onNewChat?: () => void;
  onPick?: (id: string, label: string, prompt?: string) => void;
  onDeleteChat?: (id: string) => void;
  /** controlled primary-nav selection */
  activeNav?: string;
  onNavigate?: (key: string) => void;
  /** footer call-to-action */
  footerLabel?: string;
  footerIcon?: ReactNode;
  onFooterClick?: () => void;
  recents?: SidebarRecent[];
  variant?: string;
  collapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  workspaceName?: string;
  workspaceMonogram?: string;
};

const SIDEBAR_MOTION = {
  expandedWidth: 224,
  collapsedWidth: 52,
  duration: 280,
  copyDuration: 180,
  copyOffset: 8,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
};

/* ─────────────────────────────────────────────────────────
 * CHAT SEARCH STORYBOARD
 *
 *   0ms   search is triggered; Chats label begins fading
 *   0ms   field grows right → left from the search control
 * 180ms   field fills the row; cursor is focused and ready
 * ───────────────────────────────────────────────────────── */
const CHAT_SEARCH_MOTION = {
  duration: 180,
  closedWidth: 28,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
};

function GlideGroup({ children }: { children: ReactNode }) {
  return (
    <GlideMenu
      rowSelector="[data-row]"
      highlightClassName="sidebar-glide-highlight rounded-[7px] bg-hover-2"
      className="group/glide flex flex-col gap-px"
    >
      {children}
    </GlideMenu>
  );
}

function RailButton({
  icon,
  label,
  active = false,
  count,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  count?: string;
  onClick?: () => void;
}) {
  return (
    <button
      data-row
      type="button"
      onClick={onClick}
      className={`sidebar-row relative z-10 mx-2 flex h-8 items-center rounded-[8px] px-2 text-left
        transition-[width,background-color,color,transform] duration-150 active:scale-[0.98] cursor-pointer
        ${active ? "bg-hover-2 group-hover/glide:bg-transparent" : ""}`}
    >
      <span className={`flex size-5 shrink-0 items-center justify-center ${active ? "text-ink" : "text-ink-2"}`}>
        {icon}
      </span>
      <span className={`sidebar-copy ml-1.5 min-w-0 flex-1 truncate text-[14px] font-medium ${active ? "text-ink" : "text-ink-2"}`}>
        {label}
      </span>
      {count && (
        <span className="sidebar-copy mr-2 shrink-0 text-[12px] font-medium tabular-nums text-ink-3">
          {count}
        </span>
      )}
    </button>
  );
}

function WorkspaceMenu({
  position,
  workspace,
  onClose,
  onSignOut,
  onNavigate,
}: {
  position: { top: number; left: number };
  workspace: { name: string; monogram: string };
  onClose: () => void;
  onSignOut: () => void;
  onNavigate: (path: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-workspace-menu
      className="fixed z-50 w-64 rounded-[14px] bg-surface p-1.5 shadow-overlay border border-line"
      style={{
        top: position.top,
        left: position.left,
        animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both",
        transformOrigin: "top left",
      }}
    >
      <GlideMenu
        rowSelector="[data-menu-row]"
        className="flex flex-col gap-px"
        highlightClassName="inset-x-0 rounded-[8px] bg-hover-2"
      >
        <button
          data-menu-row
          type="button"
          onClick={onClose}
          className="relative z-10 flex h-10 w-full items-center gap-1.5 rounded-[8px] px-2 text-left cursor-pointer"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-ink text-[11px] font-semibold text-surface">
            {workspace.monogram}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{workspace.name}</span>
          <span className="shrink-0 text-ink"><IconCheckmark1Small size={18} /></span>
        </button>
        <div className="my-1 h-px bg-line" />
        {[
          { label: "New chat", icon: <IconPlusMedium size={16} />, action: () => onNavigate("new-chat") },
          { label: "Workspace settings", icon: <IconSettingsGear1 size={16} />, action: () => onNavigate("/settings") },
          { label: "Interview Prep", icon: <Brain size={16} />, action: () => onNavigate("/interview-prep") },
          { label: "Job Applications", icon: <Briefcase size={16} />, action: () => onNavigate("/applications") },
        ].map((item) => (
          <button
            key={item.label}
            data-menu-row
            type="button"
            onClick={() => {
              onClose();
              item.action();
            }}
            className="relative z-10 flex h-9 w-full items-center gap-1.5 rounded-[8px] px-2 text-left cursor-pointer"
          >
            <span className="flex size-5 shrink-0 items-center justify-center text-ink-2">{item.icon}</span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{item.label}</span>
          </button>
        ))}
        <div className="my-1 h-px bg-line" />
        <button
          data-menu-row
          type="button"
          onClick={() => {
            onClose();
            onSignOut();
          }}
          className="relative z-10 flex h-9 w-full items-center gap-1.5 rounded-[8px] px-2 text-left cursor-pointer text-destructive"
        >
          <span className="flex size-5 shrink-0 items-center justify-center"><IconArrowBoxLeft size={16} /></span>
          <span className="min-w-0 flex-1 truncate text-[13.5px]">Sign out</span>
        </button>
      </GlideMenu>
    </div>,
    document.body,
  );
}

export default function SidebarNav({
  activeTitle,
  activeId,
  className = "",
  fill = false,
  onNewChat,
  onPick,
  onDeleteChat,
  activeNav,
  onNavigate,
  footerLabel = "Configure AI",
  footerIcon = <IconSettingsGear1 size={15} />,
  onFooterClick,
  recents = DEFAULT_RECENTS,
  collapsed: controlledCollapsed,
  onToggleCollapse,
  workspaceName = DEFAULT_WORKSPACE.name,
  workspaceMonogram = DEFAULT_WORKSPACE.monogram,
}: SidebarNavProps) {
  const router = useRouter();
  const { signOut } = useClerk();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const setCollapsed = (val: boolean) => {
    if (controlledCollapsed === undefined) {
      setInternalCollapsed(val);
    }
    onToggleCollapse?.(val);
  };

  const [internalNav, setInternalNav] = useState("chats");
  const currentNav = activeNav ?? internalNav;
  const selectNav = (key: string, href?: string) => {
    setInternalNav(key);
    onNavigate?.(key);
    if (href) {
      router.push(href);
    }
  };

  const [demoActiveTitle, setDemoActiveTitle] = useState<string | null>(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspacePosition, setWorkspacePosition] = useState({ top: 0, left: 0 });
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const workspaceButtonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedTitle = activeTitle === undefined ? demoActiveTitle : activeTitle;
  const visibleRecents = recents.filter((item) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  useEffect(() => {
    if (!workspaceOpen) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-workspace-trigger]") && !target.closest("[data-workspace-menu]")) {
        setWorkspaceOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [workspaceOpen]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const collapse = () => {
    setCollapsed(true);
    setWorkspaceOpen(false);
    setSearchOpen(false);
    setQuery("");
  };

  return (
    <aside
      data-sidebar-collapsed={isCollapsed}
      aria-label="Workspace navigation"
      className={`relative flex shrink-0 select-none overflow-hidden transition-[width] border-r border-line bg-surface ${
        fill ? "h-full" : "h-[600px]"
      } ${className}`}
      style={{
        width: isCollapsed ? SIDEBAR_MOTION.collapsedWidth : SIDEBAR_MOTION.expandedWidth,
        transitionDuration: `${SIDEBAR_MOTION.duration}ms`,
        transitionTimingFunction: SIDEBAR_MOTION.easing,
        "--sidebar-copy-duration": `${SIDEBAR_MOTION.copyDuration}ms`,
        "--sidebar-copy-offset": `${SIDEBAR_MOTION.copyOffset}px`,
        "--sidebar-easing": SIDEBAR_MOTION.easing,
      } as CSSProperties}
    >
      <div className="flex min-h-0 w-[224px] shrink-0 flex-col py-2">
        {/* Workspace Switcher & Collapse Controls */}
        <div className="relative mb-2.5 h-10 shrink-0 px-2">
          <button
            ref={workspaceButtonRef}
            data-workspace-trigger
            type="button"
            aria-expanded={workspaceOpen}
            aria-hidden={isCollapsed}
            tabIndex={isCollapsed ? -1 : 0}
            onClick={() => {
              if (!workspaceOpen && workspaceButtonRef.current) {
                const rect = workspaceButtonRef.current.getBoundingClientRect();
                setWorkspacePosition({ top: rect.bottom + 6, left: rect.left });
              }
              setWorkspaceOpen((open) => !open);
            }}
            className="sidebar-workspace-control absolute left-2 top-1 flex h-8 w-[164px] items-center rounded-[8px] px-2 text-left transition-[background-color,transform] duration-100 hover:bg-hover-2 active:scale-[0.99] cursor-pointer"
          >
            <span className="sidebar-logo flex size-5 shrink-0 items-center justify-center text-ink">
              <IconPopsicle2 size={18} />
            </span>
            <span className="sidebar-copy ml-1.5 min-w-0 flex-1 truncate text-[14px] font-medium text-ink-2">
              {workspaceName}
            </span>
            <span className="sidebar-copy ml-1 flex shrink-0 text-ink-3">
              <IconChevronDownSmall size={16} />
            </span>
          </button>

          {workspaceOpen && (
            <WorkspaceMenu
              position={workspacePosition}
              workspace={{ name: workspaceName, monogram: workspaceMonogram }}
              onClose={() => setWorkspaceOpen(false)}
              onSignOut={() => signOut({ redirectUrl: "/sign-in" })}
              onNavigate={(path) => {
                if (path === "new-chat") {
                  onNewChat?.();
                } else {
                  router.push(path);
                }
              }}
            />
          )}

          <button
            type="button"
            aria-label="Collapse sidebar"
            aria-hidden={isCollapsed}
            tabIndex={isCollapsed ? -1 : 0}
            onClick={collapse}
            className="sidebar-collapse-control absolute right-2 top-1 flex size-8 items-center justify-center rounded-[8px] text-ink-3 transition-[opacity,background-color,color] duration-150 hover:bg-hover-2 hover:text-ink cursor-pointer"
          >
            <IconSidebarLeftArrow size={18} />
          </button>
          <button
            type="button"
            aria-label="Expand sidebar"
            aria-hidden={!isCollapsed}
            tabIndex={isCollapsed ? 0 : -1}
            onClick={() => setCollapsed(false)}
            className="sidebar-expand-control absolute left-2 top-0.5 flex size-9 items-center justify-center rounded-[8px] text-ink-3 transition-[opacity,background-color,color] duration-150 hover:bg-hover-2 hover:text-ink cursor-pointer"
          >
            <IconSidebarLeftArrow size={18} className="rotate-180" />
          </button>
        </div>

        {/* Primary Action & Nav Items */}
        <GlideGroup>
          <RailButton
            icon={<IconEditBig size={18} />}
            label="New chat"
            onClick={() => {
              if (activeTitle === undefined) setDemoActiveTitle(null);
              selectNav("chats");
              onNewChat?.();
            }}
          />
          {DEFAULT_NAV_ITEMS.map((item) => (
            <RailButton
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={currentNav === item.key}
              onClick={() => selectNav(item.key, item.href)}
            />
          ))}
        </GlideGroup>

        {/* Chat History with Search */}
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          <div className="sidebar-copy relative mx-2 mb-1 h-8">
            <div
              aria-hidden={searchOpen}
              className={`absolute inset-0 flex items-center gap-1.5 px-2 text-[12.5px] font-medium text-ink-3 transition-[opacity,transform] ${
                searchOpen ? "pointer-events-none -translate-x-1 opacity-0" : "translate-x-0 opacity-100"
              }`}
              style={{
                transitionDuration: `${CHAT_SEARCH_MOTION.duration}ms`,
                transitionTimingFunction: CHAT_SEARCH_MOTION.easing,
              }}
            >
              <IconChevronDownSmall size={16} />
              <span>Chats</span>
            </div>

            <button
              type="button"
              aria-label="Search chats"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(true)}
              className={`absolute right-0 top-0 z-10 flex size-8 items-center justify-center rounded-[8px] text-ink-3 transition-[opacity,background-color,color,transform] hover:bg-hover-2 hover:text-ink active:scale-[0.96] cursor-pointer ${
                searchOpen ? "pointer-events-none opacity-0" : "opacity-100"
              }`}
              style={{ transitionDuration: `${CHAT_SEARCH_MOTION.duration}ms` }}
            >
              <IconMagnifyingGlass size={16} />
            </button>

            <div
              className={`absolute right-0 top-0 z-20 flex h-8 items-center overflow-hidden rounded-[8px] bg-field text-ink-3 shadow-hairline transition-[width,opacity] focus-within:text-ink-2 ${
                searchOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
              }`}
              style={{
                width: searchOpen ? "100%" : CHAT_SEARCH_MOTION.closedWidth,
                transitionDuration: `${CHAT_SEARCH_MOTION.duration}ms`,
                transitionTimingFunction: CHAT_SEARCH_MOTION.easing,
              }}
            >
              <span className="ml-2 flex shrink-0 items-center justify-center">
                <IconMagnifyingGlass size={15} />
              </span>
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setSearchOpen(false);
                    setQuery("");
                  }
                }}
                placeholder="Search chats"
                aria-label="Search chat history"
                className="ml-1.5 min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ink outline-none placeholder:text-ink-3"
              />
              <button
                type="button"
                aria-label="Close chat search"
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-[8px] text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover-2 hover:text-ink active:scale-[0.96] cursor-pointer"
              >
                <IconCrossSmall size={16} />
              </button>
            </div>
          </div>

          <GlideGroup>
            {visibleRecents.map((item) => {
              const active = (activeId && item.id === activeId) || item.label === selectedTitle;
              return (
                <div
                  key={item.id}
                  data-row
                  className={`group/item sidebar-row relative z-10 mx-2 flex h-8 items-center rounded-[8px] px-2 text-left transition-[width,background-color,color,transform] duration-150 active:scale-[0.98] cursor-pointer ${
                    active ? "bg-hover-2 group-hover/glide:bg-transparent" : ""
                  }`}
                  onClick={() => {
                    selectNav("chats");
                    if (activeTitle === undefined) setDemoActiveTitle(item.label);
                    onPick?.(item.id, item.label, item.prompt);
                  }}
                >
                  <span
                    title={item.label}
                    className={`sidebar-copy min-w-0 flex-1 truncate text-[14px] font-medium ${
                      active ? "text-ink" : "text-ink-2"
                    }`}
                  >
                    {item.label}
                  </span>

                  {onDeleteChat && (
                    <button
                      type="button"
                      aria-label="Delete chat"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(item.id);
                      }}
                      className="sidebar-copy ml-1 hidden size-5 items-center justify-center rounded text-ink-3 hover:text-destructive group-hover/item:flex cursor-pointer transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
            {query && visibleRecents.length === 0 && (
              <div className="sidebar-copy mx-2 px-2 py-2 text-[12.5px] text-ink-3">No chats found</div>
            )}
            {!query && visibleRecents.length === 0 && (
              <div className="sidebar-copy mx-2 px-2 py-4 text-center text-[12.5px] text-ink-3">
                No recent chats
              </div>
            )}
          </GlideGroup>
        </div>

        {/* Footer CTA */}
        <div className="sidebar-copy mx-2 mt-3 w-[208px] border-t border-line pt-3">
          <button
            type="button"
            onClick={onFooterClick ?? onNewChat}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-control bg-hover-2 text-[12.5px] font-medium text-ink transition-[background-color,transform] duration-150 hover:bg-line-strong active:scale-[0.98] cursor-pointer"
          >
            {footerIcon}
            {footerLabel}
          </button>
        </div>
      </div>
    </aside>
  );
}
