
"use client";
import { useState, useContext, useMemo } from "react";
import { FiSearch } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
import Tltip from "../../../components/tlTip";
import { sideBar } from "../../../components/const";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { UserAuth } from "../../../contexts/useAuthContext";
import { getTtl } from "../../../utils/languages";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const getSvgIcon = (name) => {
    const map = {
      Dashboard: "dashboard.svg",
      Assistant: "ai assistant.svg",
      Contracts: "contracts.svg",
      "Shipments Tracking": "Shipments Tracking.svg",
      Invoices: "excel.svg",
      Expenses: "expenses.svg",
      Accounting: "accounting.svg",
      "Contracts Review": "Contracts Review & Statement.svg",
      "Invoices Review": "Invoices Review & Statement.svg",
      "Account Statement": "accounting.svg",
      Stocks: "Stocks.svg",
      "Misc Invoices": "edit.svg",
      "Company Expenses": "Company Expenses.svg",
      "Material Tables": "Material Tables.svg",
      "Sharon Admin": "dashboard.svg",
      "Gis Admin": "dashboard.svg",
      Cashflow: "Cashflow.svg",
      "Formulas Calc": "Formulas Calc.svg",
      Settings: "Settings.svg",
    };
    return map[name] || "dashboard.svg";
  };

  const pathName = usePathname();
  const { setDates, compData } = useContext(SettingsContext);
  const { userTitle, user } = UserAuth();
  const ln = compData?.lng || "English";
  
  const collapsibleSections = ["Shipments", "Statements", "Miscellaneous", "IMS Summary"];
  
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

  // ── Build a flat list of ALL searchable links from sideBar() ─────────────────
  // Include Settings as well since it's manually appended in IMS Summary
  const allLinks = useMemo(() => {
    const links = [];
    sideBar().forEach((section) => {
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
    borderRadius: isCollapsed ? "10px" : "10px",
    background: active ? "#ffffff" : "transparent",
    boxShadow: active ? "0 2px 10px 0 rgba(44, 130, 201, 0.18)" : "none",
    fontWeight: active ? 600 : 400,
    color: "#003366",
    marginLeft: isCollapsed ? "auto" : "8px",
    marginRight: isCollapsed ? "auto" : "8px",
    marginBottom: isCollapsed ? "0px" : "clamp(1px, 0.15vh, 2px)",
    paddingTop: isCollapsed ? "2px" : "clamp(4px, 0.5vh, 6px)",
    paddingBottom: isCollapsed ? "2px" : "clamp(4px, 0.5vh, 6px)",
    paddingLeft: isCollapsed ? "0" : "12px",
    paddingRight: isCollapsed ? "0" : "8px",
    width: isCollapsed ? "36px" : "auto",
    height: isCollapsed ? "36px" : "auto",
    gap: isCollapsed ? "0" : "clamp(5px, 0.7vw, 7px)",
    justifyContent: isCollapsed ? "center" : "flex-start",
    transition: "background 0.15s, box-shadow 0.15s",
  });

  const hoverOn = (e, active) => {
    if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.7)";
  };
  const hoverOff = (e, active) => {
    if (!active) e.currentTarget.style.background = "transparent";
  };

  const ItemContent = ({ name }) => (
    <>
      <span style={{ width: 16, height: 16, display: "flex", alignItems: "center", flexShrink: 0 }}>
        <img src={`/logo/${getSvgIcon(name)}`} alt={name} style={{ width: 16, height: 16, objectFit: "contain" }} />
      </span>
      {!collapsed && (
        <span style={{
          fontSize: "clamp(10px, 0.80vw, 12px)",
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
        background: "linear-gradient(to right, #e3f3ff 0%, #e3f3ff 60%, #f0f8ff 100%)",
      }}
    >
      {/* Logo spacer */}
      <div className="shrink-0" style={{ height: "clamp(56px, 7vh, 80px)", minHeight: "clamp(56px, 7vh, 80px)" }} />

      {/* Collapse/Expand button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute z-20 bg-white shadow rounded-full w-7 h-7 flex items-center justify-center"
        style={{ top: "clamp(56px, 7vh, 80px)", right: 0, transition: "transform 0.2s" }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          {collapsed
            ? <path d="M8 5l5 5-5 5" stroke="var(--chathams-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            : <path d="M12 5l-5 5 5 5" stroke="var(--chathams-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          }
        </svg>
      </button>

      {/* Main panel */}
      <div style={{
        background: "linear-gradient(180deg, #f7f9ff 0%, #def3ff 100%)",
        borderRadius: "12px",
        margin: "0 8px 8px 8px",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>

      {/* Search bar */}
      {!collapsed && (
        <div className="px-3 pt-2 pb-1 shrink-0">
          <div className="relative flex items-center rounded-full px-3 py-1.5" style={{ background: '#f8fbff', border: '1px solid #b8ddf8' }}>
            <FiSearch size={13} style={{ color: 'var(--chathams-blue)', flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search anything..."
              className="flex-1 bg-transparent border-0 outline-none text-[11px] placeholder:text-gray-400 pl-2 pr-5"
              style={{ color: 'var(--chathams-blue)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors hover:text-red-500"
                style={{ color: 'var(--chathams-blue)' }}
              >
                <IoClose size={14} />
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
                  <div style={{
                    textAlign: "center",
                    color: "#003366",
                    opacity: 0.7,
                    fontSize: "clamp(10px, 0.80vw, 12px)",
                    padding: "20px 16px",
                  }}>
                    No results found
                  </div>
                ) : (
                  <>
                    <div style={{
                      fontSize: "clamp(9px, 0.5vw, 10px)",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#003366",
                      opacity: 0.75,
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
                              <span style={{ width: 30, height: 30, display: "flex", alignItems: "center", flexShrink: 0 }}>
                                <img src={`/logo/${getSvgIcon(link.item)}`} alt={link.item} style={{ width: 30, height: 30, objectFit: "contain" }} />
                              </span>
                              {!collapsed && (
                                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                  <span style={{
                                    fontSize: "clamp(10px, 0.80vw, 12px)",
                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                    fontWeight: isActive ? 600 : 400,
                                  }}>
                                    {getTtl(link.item, ln)}
                                  </span>
                                  <span style={{
                                    fontSize: "clamp(7px, 0.55vw, 9px)",
                                    color: "#003366", opacity: 0.7,
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
              sideBar().map((section, i) => {
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
                      background: "#d4eafc",
                      borderRadius: "12px",
                      transition: "background 0.2s",
                      marginLeft: "4px",
                      marginRight: "4px",
                      marginBottom: "4px",
                      paddingBottom: "4px",
                    }
                  : { marginBottom: "4px" };

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
                          fontSize: "clamp(10px, 0.5vw, 12px)",
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "#003366",
                          opacity: 0.75,
                          paddingLeft: "12px",
                          paddingRight: "10px",
                          paddingTop: i === 0 ? "6px" : "clamp(6px, 0.8vh, 12px)",
                          paddingBottom: "clamp(2px, 0.3vh, 4px)",
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
                              <path d="M5 8l5 5 5-5" stroke="#003366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                background: "#fff", borderRadius: "999px",
                boxShadow: "0 2px 8px 0 rgba(44,130,201,0.10)",
                padding: collapsed ? "4px" : "4px 14px 4px 8px",
                minWidth: 0, width: "100%", maxWidth: 260, gap: collapsed ? 0 : 10,
                justifyContent: "center",
              }}>
                <img src="/logo/person.svg" alt="Profile" style={{ width: 22, height: 22, borderRadius: "50%", background: "#f3f6fa", objectFit: "cover" }} />
                {!collapsed && (
                  <span style={{ color: "#2176ae", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
                    {user?.displayName || user?.email?.split('@')[0] || 'User'}
                  </span>
                )}
                {!collapsed && (
                  <Link href="/settings" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src="/logo/Settings.svg" alt="Settings" style={{ width: 20, height: 20, marginLeft: 4, cursor: "pointer", filter: "brightness(0) saturate(100%) invert(18%) sepia(60%) saturate(800%) hue-rotate(190deg)" }} />
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