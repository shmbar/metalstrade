
"use client";
import { useState, useContext, useMemo, useEffect } from "react";
import {
  Search, X, LayoutDashboard, Bot, FileText, Truck, Receipt, Wallet,
  Calculator, FileSearch, ClipboardCheck, Landmark, Boxes, FilePlus,
  Briefcase, Table2, CircleDollarSign, Sigma, Settings, Shield,
} from "lucide-react";
import Tltip from "../../../components/tlTip";
import { sideBar } from "../../../components/const";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { UserAuth } from "../../../contexts/useAuthContext";
import { getTtl } from "../../../utils/languages";

// One thin-line icon set (lucide) for the whole nav — replaces the /logo/*.svg map.
const NAV_ICONS = {
  Dashboard: LayoutDashboard,
  Assistant: Bot,
  Contracts: FileText,
  "Sales Contracts": FileText,
  "Shipments Tracking": Truck,
  Invoices: Receipt,
  Expenses: Wallet,
  Accounting: Calculator,
  "Contracts Review": FileSearch,
  "Invoices Review": ClipboardCheck,
  "Account Statement": Landmark,
  Stocks: Boxes,
  "Misc Invoices": FilePlus,
  "Company Expenses": Briefcase,
  "Material Tables": Table2,
  "Sharon Admin": Shield,
  "Gis Admin": Shield,
  Cashflow: CircleDollarSign,
  "Formulas Calc": Sigma,
  Settings: Settings,
};

const NavIcon = ({ name, size = 16 }) => {
  const Icon = NAV_ICONS[name] || LayoutDashboard;
  return <Icon size={size} strokeWidth={1.75} style={{ flexShrink: 0 }} />;
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const pathName = usePathname();
  const { setDates, compData } = useContext(SettingsContext);
  const { userTitle, user, gisAccount } = UserAuth();
  const ln = compData?.lng || "English";
  
  const collapsibleSections = [];
  
  // Initialize all sections as open by default
  const [openSections, setOpenSections] = useState(
    collapsibleSections.reduce((acc, section) => {
      acc[section] = true;
      return acc;
    }, {})
  );

  const handleSectionToggle = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Publish the nav's own width so viewport-fixed overlays (the toast) can start
  // where the content does. Only the collapsed override lives here — the
  // expanded default and the below-md zero are in globals.css, so the var is
  // right on the first paint too.
  useEffect(() => {
    const root = document.documentElement;
    if (collapsed) root.style.setProperty("--sidebar-w-desktop", "60px");
    else root.style.removeProperty("--sidebar-w-desktop");
  }, [collapsed]);

  const anyDropdownOpen = collapsibleSections.some((s) => openSections[s]);

  const isSectionActive = (section) => {
    return section.items.some((item) => {
      if (item.hasDropdown) {
        return item.subItems?.some(
          (sub) =>
            pathName.slice(1) === sub.page ||
            pathName.startsWith(`/${sub.page}/`)
        );
      }
      return (
        pathName.slice(1) === item.page ||
        pathName.startsWith(`/${item.page}/`)
      );
    });
  };

  // ── Build a flat list of ALL searchable links from sideBar(userTitle, gisAccount) ─────────────────
  // Include Settings as well since it's manually appended in IMS Summary
  const allLinks = useMemo(() => {
    const links = [];
    sideBar(userTitle, gisAccount).forEach((section) => {
      section.items.forEach((item) => {
        if (item.hasDropdown) {
          item.subItems?.forEach((sub) => {
            links.push({ item: sub.item, page: sub.page, section: section.ttl });
          });
        } else {
          links.push({ item: item.item, page: item.page, section: section.ttl });
        }
      });
    });
    // Add Settings manually
    links.push({ item: "Settings", page: "settings", section: "IMS Summary" });
    return links;
  }, []);

  // ── Filter links based on search query ───────────────────────────────────────
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allLinks.filter((link) =>
      link.item.toLowerCase().includes(q) ||
      link.section.toLowerCase().includes(q)
    );
  }, [searchQuery, allLinks]);

  const isSearching = searchQuery.trim().length > 0;

  const makeItemStyle = (active, isCollapsed) => ({
    display: "flex",
    alignItems: "center",
    cursor: "pointer",
    borderRadius: "10px",
    background: active ? "var(--brand-soft)" : "transparent",
    boxShadow: active && !isCollapsed ? "inset 3px 0 0 0 var(--brand)" : "none",
    fontWeight: active ? 600 : 500,
    color: active ? "var(--brand)" : "var(--ink-secondary)",
    marginLeft: isCollapsed ? "auto" : "8px",
    marginRight: isCollapsed ? "auto" : "8px",
    marginBottom: isCollapsed ? "0px" : "1px",
    paddingTop: isCollapsed ? "2px" : "clamp(3px, 0.4vh, 5px)",
    paddingBottom: isCollapsed ? "2px" : "clamp(3px, 0.4vh, 5px)",
    paddingLeft: isCollapsed ? "0" : "12px",
    paddingRight: isCollapsed ? "0" : "8px",
    width: isCollapsed ? "36px" : "auto",
    height: isCollapsed ? "36px" : "auto",
    gap: isCollapsed ? "0" : "clamp(5px, 0.7vw, 7px)",
    justifyContent: isCollapsed ? "center" : "flex-start",
    transition: "background 0.15s, box-shadow 0.15s",
  });

  const hoverOn = (e, active) => {
    if (!active) e.currentTarget.style.background = "var(--bg-subtle)";
  };
  const hoverOff = (e, active) => {
    if (!active) e.currentTarget.style.background = "transparent";
  };

  const ItemContent = ({ name }) => (
    <>
      <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", flexShrink: 0 }}>
        <NavIcon name={name} size={16} />
      </span>
      {!collapsed && (
        <span className="responsiveText" style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {getTtl(name, ln)}
        </span>
      )}
    </>
  );

  return (
    <div
      className="relative flex flex-col h-screen overflow-hidden transition-all duration-200"
      style={{
        width: collapsed ? "60px" : "clamp(190px, 15vw, 220px)",
        minWidth: collapsed ? "60px" : "clamp(190px, 15vw, 220px)",
        maxWidth: collapsed ? "60px" : "clamp(190px, 15vw, 220px)",
        borderRadius: "12px",
        zIndex: 0,
        background: "transparent",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
    >
      {/* Logo spacer */}
      <div className="shrink-0" style={{ height: "clamp(56px, 7vh, 80px)", minHeight: "clamp(56px, 7vh, 80px)" }} />

      {/* Collapse/Expand button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute z-20 bg-[var(--bg-card)] rounded-lg w-7 h-7 flex items-center justify-center border border-[var(--line)]"
        style={{ top: "clamp(56px, 7vh, 80px)", right: 0, transition: "transform 0.2s", boxShadow: "var(--shadow-sm)" }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          {collapsed
            ? <path d="M8 5l5 5-5 5" stroke="var(--ink-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            : <path d="M12 5l-5 5 5 5" stroke="var(--ink-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          }
        </svg>
      </button>

      {/* Main panel */}
      <div style={{
        background: "var(--bg-card)",
        borderRadius: "12px",
        border: "1px solid var(--line)",
        boxShadow: "var(--shadow-xs)",
        margin: "0 8px 8px 2px",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

      {/* Search bar */}
      {!collapsed && (
        <div className="px-3 pt-2 pb-1 shrink-0">
          <div className="sidebar-search relative flex items-center rounded-control px-3 py-1.5 responsiveTextTable transition-colors">
            <Search size={13} strokeWidth={1.75} style={{ color: 'var(--ink-muted)', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search anything..."
              className="flex-1 bg-transparent border-0 outline-none placeholder:text-[var(--ink-muted)] pl-2 pr-5"
              style={{ fontSize: 'inherit', color: 'var(--ink)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-[var(--ink)]"
                style={{ color: 'var(--ink-muted)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}

        <nav className={`flex-1 min-h-0 overflow-x-hidden ${collapsed ? 'overflow-y-auto' : 'overflow-y-auto'}`}>
          <ul style={{ paddingTop: collapsed ? "2px" : "clamp(4px,0.5vh,6px)", paddingBottom: collapsed ? "4px" : "clamp(4px,0.5vh,6px)" }}>

            {/* ── SEARCH RESULTS MODE ─────────────────────────────────────────── */}
            {isSearching ? (
              <div>
                {searchResults.length === 0 ? (
                  <div className="responsiveText" style={{
                    textAlign: "center",
                    color: "var(--ink-muted)",
                    padding: "20px 16px",
                  }}>
                    No results found
                  </div>
                ) : (
                  <>
                    <div style={{
                      fontWeight: 600,
                      fontSize: "var(--fs-table)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--ink-muted)",
                      paddingLeft: "12px",
                      paddingBottom: "4px",
                      paddingTop: "2px",
                    }}>
                      Results
                    </div>
                    {searchResults.map((link, idx) => {
                      const isActive =
                        pathName.slice(1) === link.page ||
                        pathName.startsWith(`/${link.page}/`);
                      return (
                        <Link
                          key={idx}
                          href={`/${link.page}`}
                          onClick={() => { setDates?.(); setSearchQuery(""); }}
                        >
                          <Tltip direction="right" tltpText={getTtl(link.item, ln)} show={collapsed}>
                            <div
                              style={makeItemStyle(isActive, collapsed)}
                              onMouseEnter={(e) => hoverOn(e, isActive)}
                              onMouseLeave={(e) => hoverOff(e, isActive)}
                            >
                              <span style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <NavIcon name={link.item} size={18} />
                              </span>
                              {!collapsed && (
                                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                  <span className="responsiveText" style={{
                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                    fontWeight: isActive ? 600 : 500,
                                  }}>
                                    {getTtl(link.item, ln)}
                                  </span>
                                  <span style={{
                                    fontSize: "var(--fs-table)",
                                    color: "var(--ink-muted)",
                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                  }}>
                                    {link.section}
                                  </span>
                                </div>
                              )}
                            </div>
                          </Tltip>
                        </Link>
                      );
                    })}
                  </>
                )}
              </div>
            ) : (

              /* ── NORMAL SIDEBAR MODE ───────────────────────────────────────── */
              sideBar(userTitle, gisAccount).map((section, i) => {
                const isCollapsible = collapsibleSections.includes(section.ttl);
                const isOpen = openSections[section.ttl];
                const sectionHasActiveItem =
                  isSectionActive(section) ||
                  (section.ttl === "IMS Summary" && pathName.slice(1) === "settings");

                const shouldHighlightSection = isCollapsible
                  ? isOpen
                  : sectionHasActiveItem && !anyDropdownOpen;

                const sectionWrapStyle = shouldHighlightSection && !collapsed
                  ? {
                      background: "var(--bg-subtle)",
                      borderRadius: "12px",
                      transition: "background 0.2s",
                      marginLeft: "4px",
                      marginRight: "4px",
                      marginBottom: "4px",
                      paddingBottom: "2px",
                    }
                  : { marginBottom: "10px" };

                return (
                  <div key={i} style={sectionWrapStyle}>

                    {/* Section heading */}
                    {section.ttl && !collapsed && (
                      <div
                        onClick={isCollapsible ? () => handleSectionToggle(section.ttl) : undefined}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontWeight: 600,
                          fontSize: "var(--fs-table)",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "var(--ink-muted)",
                          paddingLeft: "12px",
                          paddingRight: "10px",
                          paddingTop: i === 0 ? "4px" : "clamp(4px, 0.5vh, 6px)",
                          paddingBottom: "2px",
                          cursor: isCollapsible ? "pointer" : "default",
                          userSelect: "none",
                        }}
                      >
                        <span>{getTtl(section.ttl, ln)}</span>
                        {isCollapsible && (
                          <span style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            width: 18, height: 18,
                            transition: "transform 0.2s",
                            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                          }}>
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                              <path d="M5 8l5 5 5-5" stroke="var(--ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Section items */}
                    {(!isCollapsible || isOpen) && (
                      <div>
                        {section.items.map((y, k) => {
                          const isActive =
                            pathName.slice(1) === y.page ||
                            pathName.startsWith(`/${y.page}/`);

                          if (y.hasDropdown) {
                            return (
                              <div key={k}>
                                {y.subItems.map((sub, si) => {
                                  const isSubActive =
                                    pathName.slice(1) === sub.page ||
                                    pathName.startsWith(`/${sub.page}/`);
                                  return (
                                    <Link href={`/${sub.page}`} key={si} onClick={setDates}>
                                      <Tltip direction="right" tltpText={getTtl(sub.item, ln)} show={collapsed}>
                                        <div
                                          style={makeItemStyle(isSubActive, collapsed)}
                                          onMouseEnter={(e) => hoverOn(e, isSubActive)}
                                          onMouseLeave={(e) => hoverOff(e, isSubActive)}
                                        >
                                          <ItemContent name={sub.item} />
                                        </div>
                                      </Tltip>
                                    </Link>
                                  );
                                })}
                              </div>
                            );
                          }

                          return (
                            <Link href={`/${y.page}`} key={k} onClick={setDates}>
                              <Tltip direction="right" tltpText={getTtl(y.item, ln)} show={collapsed}>
                                <div
                                  style={makeItemStyle(isActive, collapsed)}
                                  onMouseEnter={(e) => hoverOn(e, isActive)}
                                  onMouseLeave={(e) => hoverOff(e, isActive)}
                                >
                                  <ItemContent name={y.item} />
                                </div>
                              </Tltip>
                            </Link>
                          );
                        })}

                        {/* Settings link inside IMS Summary */}
                        {section.ttl === "IMS Summary" && (
                          <Link href="/settings" onClick={setDates}>
                            <Tltip direction="right" tltpText={getTtl("Settings", ln)} show={collapsed}>
                              <div
                                style={makeItemStyle(pathName.slice(1) === "settings", collapsed)}
                                onMouseEnter={(e) => hoverOn(e, pathName.slice(1) === "settings")}
                                onMouseLeave={(e) => hoverOff(e, pathName.slice(1) === "settings")}
                              >
                                <ItemContent name="Settings" />
                              </div>
                            </Tltip>
                          </Link>
                        )}
                      </div>
                    )}

                  </div>
                );
              })
            )}

            {/* User profile pill */}
            <div style={{
              position: "fixed", bottom: 18, left: 0,
              width: collapsed ? "60px" : "clamp(190px, 15vw, 220px)",
              zIndex: 0, padding: collapsed ? "0 8px" : "0 16px", display: "flex", justifyContent: "center",
            }}>
              <div style={{
                display: "flex", alignItems: "center",
                background: "var(--bg-card)", borderRadius: "999px",
                border: "1px solid var(--line)",
                boxShadow: "var(--shadow-sm)",
                padding: collapsed ? "4px" : "4px 14px 4px 8px",
                minWidth: 0, width: "100%", maxWidth: 260, gap: collapsed ? 0 : 10,
                justifyContent: "center",
              }}>
                <span style={{
                  width: 22, height: 22, borderRadius: "50%", background: "var(--brand-soft)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  color: "var(--brand)", fontWeight: 600, fontSize: 11, textTransform: "uppercase",
                }}>
                  {(user?.displayName || user?.email || 'U').charAt(0)}
                </span>
                {!collapsed && (
                  <span style={{ color: "var(--ink)", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                    {user?.displayName || user?.email?.split('@')[0] || 'User'}
                  </span>
                )}
                {!collapsed && (
                  <Link href="/settings" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-muted)" }}>
                    <Settings size={16} strokeWidth={1.75} style={{ marginLeft: 4, cursor: "pointer" }} />
                  </Link>
                )}
              </div>
            </div>

          </ul>
        </nav>
      </div>
    </div>
  );
}
