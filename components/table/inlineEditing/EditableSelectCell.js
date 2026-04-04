'use client';
import React, { useEffect, useState, Fragment, useRef } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { createPortal } from "react-dom";
import { HiSelector, HiCheck } from "react-icons/hi";
import Tltip from "../../tlTip";

// Simple event bus for dropdown open/close
const dropdownEventBus = {
  listeners: [],
  subscribe(fn) { this.listeners.push(fn); return () => this.listeners = this.listeners.filter(l => l !== fn); },
  emit(id) { this.listeners.forEach(fn => fn(id)); }
};

export default function EditableSelectCell({ getValue, row, column, table }) {
  const isEditMode = !!table?.options?.meta?.isEditMode;
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue ?? "");
  const options = column.columnDef?.meta?.options ?? [];
  const [dropdownPosition, setDropdownPosition] = useState(null);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const [dropdownWidth, setDropdownWidth] = useState(0);
  const [dropUp, setDropUp] = useState(false);

  // Unique id for this cell (row+column)
  const dropdownId = `${row?.id ?? row?.index ?? ""}-${column?.id ?? ""}`;

  useEffect(() => setValue(initialValue ?? ""), [initialValue]);

  // Measure the widest option
  useEffect(() => {
    if (!open) return;
    const span = document.createElement("span");
    span.style.visibility = "hidden";
    span.style.position = "absolute";
    span.style.whiteSpace = "nowrap";
    span.style.fontSize = "11px";
    span.style.fontFamily = "inherit";
    document.body.appendChild(span);

    let maxWidth = buttonRef.current ? buttonRef.current.offsetWidth : 0;
    options.forEach((o) => {
      span.innerText = o.label;
      maxWidth = Math.max(maxWidth, span.offsetWidth + 40);
    });

    setDropdownWidth(maxWidth);
    document.body.removeChild(span);
  }, [open, options]);

  // Scroll to selected option on open
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      const selected = document.querySelector('.dropdown-option-selected');
      if (selected && selected.scrollIntoView) selected.scrollIntoView({ block: 'nearest' });
    }, 0);
  }, [open, value]);

  // Listen for global dropdown open events
  useEffect(() => {
    const unsub = dropdownEventBus.subscribe((id) => {
      if (id !== dropdownId) setOpen(false);
    });
    return unsub;
  }, [dropdownId]);

  // Close on outside click (already handled by your overlay)
  // But also close on Escape key
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const commit = (v) => {
    if (!isEditMode) return;
    table.options.meta?.updateData?.(row.index, column.id, v);
  };

  if (!isEditMode) {
    const val = initialValue;
    const found = options.find(o => String(o.value) === String(val));
    const rawLabel = found?.label ?? val ?? "";
    const safeLabel =
      typeof rawLabel === "string" || typeof rawLabel === "number"
        ? rawLabel
        : (rawLabel?.nname ?? rawLabel?.name ?? JSON.stringify(rawLabel));
    return (
      <Tltip direction="top" tltpText={String(safeLabel)}>
        <span
          style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', cursor: 'default' }}
        >
          {safeLabel}
        </span>
      </Tltip>
    );
  }

  // Find the selected option object
  const selectedOption = options.find(o => String(o.value) === String(value)) || options[0];

  // Calculate dropdown position for portal
  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Estimate dropdown height (max 192px, or less if fewer options)
      const estimatedHeight = Math.min(options.length * 40, 192); // 40px per option, max 192px
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      // If not enough space below, but enough above, open upwards
      if (spaceBelow < estimatedHeight && spaceAbove > estimatedHeight) {
        setDropUp(true);
        setDropdownPosition({
          bottom: window.innerHeight - rect.top + window.scrollY,
          left: rect.left + window.scrollX,
        });
      } else {
        setDropUp(false);
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
        });
      }
    }
    dropdownEventBus.emit(dropdownId);
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  // Portal dropdown menu
  const DropdownMenu = (
    <Transition
      as={Fragment}
      show={open}
      enter="transition ease-out duration-150"
      enterFrom="opacity-0 translate-y-2"
      enterTo="opacity-100 translate-y-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <Listbox.Options
        static
        className="z-[9999] max-h-48 overflow-auto rounded-xl bg-white py-1 text-xs shadow-lg focus:outline-none border border-[#dbeeff] custom-scrollbar"
        style={{
          position: "absolute",
          ...(dropUp
            ? { bottom: dropdownPosition?.bottom ?? 0 }
            : { top: dropdownPosition?.top ?? 0 }),
          left: dropdownPosition?.left ?? 0,
          width: dropdownWidth ? `${dropdownWidth}px` : undefined,
          minWidth: buttonRef.current ? buttonRef.current.offsetWidth : undefined,
        }}
      >
        {options.length === 0 ? (
          <div className="px-4 py-2 text-gray-400 text-center text-xs">No options</div>
        ) : (
          options.map((o) => (
            <Listbox.Option
              key={o.value}
              className={({ active, selected }) =>
                `relative cursor-pointer select-none py-2 pl-4 pr-4 rounded-lg text-left
                ${selected ? 'bg-[#dbeeff] text-[var(--endeavour)] dropdown-option-selected' : active ? 'bg-[#dbeeff] text-[var(--endeavour)]' : 'text-[var(--port-gore)]'}`
              }
              value={o.value}
            >
              {({ selected }) => (
                <div className="flex items-center gap-x-2">
                  {selected ? (
                    <span className="text-[var(--endeavour)]">
                      <HiCheck className="h-4 w-4" aria-hidden="true" />
                    </span>
                  ) : null}
                  <span
                    className="block text-left whitespace-normal text-[11px] font-normal"
                  >
                    {o.label}
                  </span>
                </div>
              )}
            </Listbox.Option>
          ))
        )}
      </Listbox.Options>
    </Transition>
  );

  // Custom scrollbar styles (add to your global CSS or Tailwind config)
  // .custom-scrollbar::-webkit-scrollbar { width: 8px; }
  // .custom-scrollbar::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 8px; }

  return (
    <div className="relative w-full">
      <Listbox value={value} onChange={v => { setValue(v); commit(v); handleClose(); }}>
        <div className="relative">
          <Listbox.Button
            ref={buttonRef}
            onClick={handleOpen}
            className="w-full cursor-pointer rounded-xl py-1.5 pl-3 pr-8 text-left text-xs flex items-center"
            aria-label={column?.columnDef?.header || "Select option"}
          >
            <span className="flex-1 block truncate overflow-hidden text-ellipsis text-left">
              {selectedOption?.label ?? ""}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <HiSelector className="h-4 w-4 text-[var(--rock-blue)]" aria-hidden="true" />
            </span>
          </Listbox.Button>
          {/* Render dropdown in portal to avoid clipping */}
          {typeof window !== "undefined" && open &&
            createPortal(
              <>
                <div
                  className="fixed inset-0 z-[9998]"
                  onClick={handleClose}
                  aria-hidden="true"
                />
                {DropdownMenu}
              </>,
              document.body
            )
          }
        </div>
      </Listbox>
      {/* Close dropdown on outside click */}
      {open && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
