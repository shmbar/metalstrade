"use client";
import { useState, useContext } from "react";
import { FiSearch } from "react-icons/fi";
import Tltip from "../../../components/tlTip";
import { FiSettings } from "react-icons/fi";
import { sideBar } from "../../../components/const";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { UserAuth } from "../../../contexts/useAuthContext";
import { getTtl } from "../../../utils/languages";


export default function Sidebar() {
  // Collapsed state
  const [collapsed, setCollapsed] = useState(false);

  // Helper to map sidebar item names to SVG filenames
  const getSvgIcon = (name) => {
    const map = {
      Dashboard: "dashboard.svg",
      "Assistant": "ai assistant.svg",
      "Contracts": "contracts.svg",
      "Invoices": "excel.svg",
      "Expenses": "expenses.svg",
      "Accounting": "accounting.svg",
      "Contracts Review & Statement": "Contracts Review & Statement.svg",
      "Invoices Review & Statement": "Invoices Review & Statement.svg",
      "Account Statement": "accounting.svg",
      "Stocks": "Stocks.svg",
      "Misc Invoices": "edit.svg",
      "Company Expenses": "Company Expenses.svg",
      "Material Tables": "Material Tables.svg",
      "Sharon Admin": "dashboard.svg",
      "Cashflow": "Cashflow.svg",
      "Formulas Calc": "Formulas Calc.svg",
    };
    return map[name] || "dashboard.svg";
  };

  const pathName = usePathname();
  const { setDates, compData } = useContext(SettingsContext);
  const { userTitle } = UserAuth();
  const ln = compData?.lng || "English";
  // Track open/closed state for collapsible sections
  const [openSections, setOpenSections] = useState({});

  // Toggle section open/closed
  const handleSectionToggle = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div
      className="relative flex flex-col h-screen overflow-hidden transition-all duration-200"
      style={{
        width: collapsed ? "60px" : "clamp(220px, 18vw, 260px)",
        minWidth: collapsed ? "60px" : "clamp(220px, 18vw, 260px)",
        maxWidth: collapsed ? "60px" : "clamp(220px, 18vw, 260px)",
        borderRadius: "12px",
        zIndex: 10,
        background: "linear-gradient(to right, #bce1ff 0%, #bce1ff 60%, rgba(255,255,255,0) 100%)",
      }}
    >
      <div
        className="shrink-0"
        style={{
          height: "clamp(56px, 7vh, 80px)",
          minHeight: "clamp(56px, 7vh, 80px)",
          borderRadius: "12px 12px 0 0",
        }}
      />
      {/* Search Bar - Styled to match sidebar with icon */}
     
      {/* Collapse/Expand Arrow Button */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute z-20 bg-white shadow rounded-full w-7 h-7 flex items-center justify-center transition-transform"
        style={{
          top: "clamp(56px, 7vh, 80px)",
          right: 0,
          transition: "transform 0.2s",
        }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          {collapsed ? (
            // Arrow points right (>)
            <path d="M8 5l5 5-5 5" stroke="#11497c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          ) : (
            // Arrow points left (<)
            <path d="M12 5l-5 5 5 5" stroke="#11497c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          )}
        </svg>
      </button>

      {/* Links wrapper with separate background */}
      <div
        style={{
          background: "linear-gradient(180deg, #f7f9ff 0%, #def3ff 100%)",
          borderRadius: "0 0 12px 12px",
          margin: "0 8px 8px 8px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "12px",
          
        }}
      >
          <div style={{ padding: '12px 16px 8px 16px', background: 'transparent' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <span style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#003366',
            opacity: 0.7,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            fontSize: 'clamp(13px, 0.9vw, 15px)'
          }}>
            <FiSearch />
          </span>
          <input
            type="text"
            placeholder="Search"
            className="w-full pl-7 pr-1 py-1 rounded-xl bg-white shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-blue-200 text-[#003366]"
            style={{ fontSize: 'clamp(10px, 0.8vw, 13px)', height: '28px', boxShadow: '0 2px 8px 0 rgba(44, 130, 201, 0.08)' }}
          />
        </div>
      </div>
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <ul style={{ paddingTop: "clamp(4px, 0.5vh, 6px)", paddingBottom: "clamp(4px, 0.5vh, 6px)" }}>
            {sideBar().map((section, i) => {
              // Only make Shipments, Statements, Miscellaneous, IMS Summary collapsible
              const collapsibleSections = ["Shipments", "Statements", "Miscellaneous", "IMS Summary"];
              const isCollapsible = collapsibleSections.includes(section.ttl);
              // Highlight section background if open
              const sectionActiveBg = openSections[section.ttl] ? { background: '#d4eafc', borderRadius: '12px', transition: 'background 0.2s', marginLeft: '8px', marginRight: '8px' } : {};
              return (
                <div key={i} style={sectionActiveBg}>
                  {/* Section Title */}
                  {section.ttl && !collapsed && (
                    <div
                      className="font-semibold tracking-[0.1em] uppercase text-[#003366] truncate flex items-center cursor-pointer"
                      style={{
                        fontSize: "clamp(10px, 0.5vw, 12px)",
                        paddingLeft: collapsed ? "0" : "16px",
                        paddingRight: "0",
                        paddingBottom: "clamp(2px, 0.3vh, 4px)",
                        paddingTop: i === 0 ? "0" : "clamp(4px, 0.6vh, 8px)",
                        opacity: 0.7,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                      onClick={isCollapsible ? () => handleSectionToggle(section.ttl) : undefined}
                    >
                      <span>{getTtl(section.ttl, ln)}</span>
                      {isCollapsible && (
                        <span style={{
                          marginLeft: "auto",
                          marginRight: "8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 20,
                          height: 20,
                          transition: "transform 0.2s",
                          transform: openSections[section.ttl] ? "rotate(90deg)" : "rotate(0deg)",
                        }}>
                          {/* Arrow icon */}
                          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                            <path d="M6 8l4 4 4-4" stroke="#003366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Section Items: show if not collapsible or open */}
                  {(!isCollapsible || openSections[section.ttl]) && (
                    <div>
                      {section.items.map((y, k) => {
                        const isActive =
                          pathName.slice(1) === y.page ||
                          pathName.startsWith(`/${y.page}/`);

                        if (y.hasDropdown) {
                          return (
                            <div key={k}>
                              {y.subItems.map((sub, si) => {
                                const isSubActive = pathName.slice(1) === sub.page;

                                return (
                                  <Link
                                    href={`/${sub.page}`}
                                    key={si}
                                    onClick={setDates}
                                  >
                                    <Tltip direction="right" tltpText={getTtl(sub.item, ln)} show={collapsed}>
                                      <div
                                        className={`group flex items-center rounded-md cursor-pointer transition-all duration-200
                                        ${
                                          isSubActive
                                            ? "bg-white text-[#003366] font-medium scale-[1.01]"
                                            : "text-[#003366] hover:bg-white/50 hover:translate-x-0.5"
                                        }`}
                                        style={{
                                          gap: collapsed ? "0" : "clamp(4px, 0.6vw, 6px)",
                                          paddingTop: "clamp(3px, 0.4vh, 5px)",
                                          paddingBottom: "clamp(3px, 0.4vh, 5px)",
                                          paddingLeft: collapsed ? "0" : "24px",
                                          paddingRight: "0",
                                          marginBottom: "clamp(1px, 0.15vh, 2px)",
                                          justifyContent: collapsed ? "center" : "flex-start",
                                          alignItems: "center"
                                        }}
                                      >
                                        <span
                                          className="shrink-0 flex items-center"
                                          style={{
                                            width: 16,
                                            height: 16,
                                            display: "flex",
                                            alignItems: "center",
                                          }}
                                        >
                                          <img
                                            src={`/logo/${getSvgIcon(sub.item)}`}
                                            alt={sub.item}
                                            style={{
                                              width: 16,
                                              height: 16,
                                              objectFit: "contain",
                                            }}
                                          />
                                        </span>
                                        {!collapsed && (
                                          <span
                                            className="truncate"
                                            style={{
                                              fontSize: "clamp(8px, 0.65vw, 10px)",
                                              whiteSpace: "nowrap",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                            }}
                                          >
                                            {getTtl(sub.item, ln)}
                                          </span>
                                        )}
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
                                className={`group flex items-center rounded-lg cursor-pointer transition-all duration-200
                                ${
                                  isActive
                                    ? "bg-white text-[#003366] font-medium scale-[1.01]"
                                    : "text-[#003366] hover:bg-white/50 hover:translate-x-0.5"
                                }`}
                                style={{
                                  gap: collapsed ? "0" : "clamp(5px, 0.7vw, 7px)",
                                  paddingTop: "clamp(4px, 0.5vh, 6px)",
                                  paddingBottom: "clamp(4px, 0.5vh, 6px)",
                                  paddingLeft: collapsed ? "0" : "24px",
                                  paddingRight: "0",
                                  marginBottom: "clamp(1px, 0.15vh, 2px)",
                                  justifyContent: collapsed ? "center" : "flex-start",
                                  alignItems: "center"
                                }}
                              >
                                <span
                                  className="shrink-0 flex items-center"
                                  style={{ width: 16, height: 16, display: "flex", alignItems: "center" }}
                                >
                                  <img
                                    src={`/logo/${getSvgIcon(y.item)}`}
                                    alt={y.item}
                                    style={{ width: 16, height: 16, objectFit: "contain" }}
                                  />
                                </span>
                                {!collapsed && (
                                  <span
                                    className="truncate"
                                    style={{
                                      fontSize: "clamp(9px, 0.75vw, 11px)",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {getTtl(y.item, ln)}
                                  </span>
                                )}
                              </div>
                            </Tltip>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* User Profile & Settings - Fixed at bottom, pill style */}
            <div style={{
              position: "fixed",
              bottom: 18,
              left: 0,
              width: collapsed ? "60px" : "clamp(220px, 18vw, 260px)",
              zIndex: 20,
              padding: "0 16px",
              display: 'flex',
              justifyContent: 'center',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#fff',
                borderRadius: '999px',
                boxShadow: '0 2px 8px 0 rgba(44, 130, 201, 0.10)',
                padding: '6px 18px 6px 10px',
                minWidth: 0,
                width: '100%',
                maxWidth: 260,
                gap: 10,
              }}>
                <img src="/logo/person.svg" alt="Profile" style={{ width: 28, height: 28, borderRadius: '50%', background: '#f3f6fa', objectFit: 'cover' }} />
                <span style={{ color: '#2176ae', fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                  Sharon
                </span>
                <Link href="/settings" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/logo/Settings.svg" alt="Settings" style={{ width: 22, height: 22, marginLeft: 4, cursor: 'pointer' }} />
                </Link>
              </div>
            </div>
          </ul>
        </nav>
      </div>
    </div>
  );
}