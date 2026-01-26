"use client";
import { useState, useContext } from "react";
import Tltip from "../../../components/tlTip";
import { FiSettings } from "react-icons/fi";
import { sideBar } from "../../../components/const";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { UserAuth } from "../../../contexts/useAuthContext";
import { getTtl } from "../../../utils/languages";
import styles from "./SideBar.module.css";

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
  const [openDropdowns, setOpenDropdowns] = useState({});

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
          background: "#E3F2FD",
          borderRadius: "0 0 12px 12px",
          margin: "0 8px 8px 8px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          borderRadius: "12px",
          
        }}
      >
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <ul style={{ paddingTop: "clamp(4px, 0.5vh, 6px)", paddingBottom: "clamp(4px, 0.5vh, 6px)" }}>
            {sideBar().map((x, i) => (
              <div key={i}>
                {/* Section Title */}
                {x.ttl && !collapsed && (
                  <div
                    className="font-semibold tracking-[0.1em] uppercase text-[#003366] truncate"
                    style={{
                      fontSize: "clamp(6px, 0.5vw, 8px)",
                      paddingLeft: collapsed ? "0" : "16px",
                      paddingRight: "0",
                      paddingBottom: "clamp(2px, 0.3vh, 4px)",
                      paddingTop: i === 0 ? "0" : "clamp(4px, 0.6vh, 8px)",
                      opacity: 0.7,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {getTtl(x.ttl, ln)}
                  </div>
                )}

                <div>
                  {x.items.map((y, k) => {
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
              </div>
            ))}

            {/* Settings - Inside the same scrollable area, no gap */}
            <div style={{ marginTop: "0" }}>
              <Tltip direction="right" tltpText={getTtl("Settings", ln)} show={collapsed}>
                <Link href="/settings">
                  <div
                    className={`group flex items-center rounded-lg cursor-pointer transition-all duration-200 ${
                      pathName === "/settings"
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
                    <FiSettings
                      className="shrink-0 transition-transform duration-200 group-hover:rotate-90 group-hover:scale-105"
                      style={{
                        fontSize: "clamp(11px, 0.9vw, 13px)",
                      }}
                    />
                    {!collapsed && (
                      <span
                        className="font-medium tracking-wide truncate"
                        style={{
                          fontSize: "clamp(9px, 0.75vw, 11px)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {getTtl("Settings", ln)}
                      </span>
                    )}
                  </div>
                </Link>
              </Tltip>
            </div>
          </ul>
        </nav>
      </div>
    </div>
  );
}