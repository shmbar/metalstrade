// 'use client';
// import { useEffect, useState } from "react";

// export default function EditableCell({ getValue, row, column, table }) {
//   const initialValue = getValue();
//   const [value, setValue] = useState(initialValue ?? "");

//   useEffect(() => setValue(initialValue ?? ""), [initialValue]);

//   const commit = () => {
//     table.options.meta?.updateData?.(row.index, column.id, value);
//   };

//   return (
//     <input
//       value={value}
//       onChange={(e) => setValue(e.target.value)}
//       onBlur={commit}
//       onKeyDown={(e) => {
//         if (e.key === "Enter") e.currentTarget.blur();
//         if (e.key === "Escape") {
//           setValue(initialValue ?? "");
//           e.currentTarget.blur();
//         }
//       }}
//       className="w-full bg-transparent px-1 py-0.5 border border-transparent rounded
//                  focus:bg-white focus:border-gray-400 outline-none"
//     />
//   );
// }
'use client';
import { useEffect, useMemo, useState } from "react";

export default function EditableCell({ getValue, row, column, table }) {
  const isEditMode = !!table?.options?.meta?.isEditMode;

  const initialValue = getValue();
  const [value, setValue] = useState(initialValue ?? "");

  useEffect(() => setValue(initialValue ?? ""), [initialValue]);

  const commit = () => {
    if (!isEditMode) return;
    table.options.meta?.updateData?.(row.index, column.id, value);
  };

  // ✅ NEW: when editing is OFF, show plain text (not an input)
  if (!isEditMode) {
    return <span>{initialValue ?? ""}</span>;
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setValue(initialValue ?? "");
          e.currentTarget.blur();
        }
      }}
      className="w-full bg-transparent px-1 py-0.5 outline-none focus:bg-white focus:ring-1 focus:ring-[var(--endeavour)] rounded-lg"
    />
  );
}
