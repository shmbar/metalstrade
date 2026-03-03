import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";

export const expensesToolTip = (row, expensesData, settings, filt) => {
  let filteredArr =
    filt === "reduced"
      ? expensesData.filter((z) => z.paid === "222")
      : expensesData;
  const supplierName = row.original.supplier;
  filteredArr = filteredArr.filter((z) => {
    const name = settings?.Supplier?.Supplier?.find((q) => q.id === z.supplier)?.nname;
    return name === supplierName && z.cur === row.original.cur;
  });

  return (
    <div
      className="w-fit rounded-lg custom-tooltip-table"
      style={{
        background: "#f6f9ff",
        border: "1px solid #e0e0e0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        fontFamily:
          "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        fontSize: "10px",
        transitionProperty:
          "color, background-color, border-color, box-shadow",
        transitionDuration: "150ms",
        transitionTimingFunction: "ease-in-out",
      }}
    >
      <table style={{ width: "auto", borderCollapse: "collapse" }}>
        <thead>
          <tr
            style={{
              background: "#eaf4ff",
              borderBottom: "1px solid #e0e0e0",
            }}
          >
            <th
              style={{
                textAlign: "left",
                padding: "8px 16px 8px 8px",
                color: "#183d79",
                fontWeight: 600,
                fontSize: "11px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              PO#
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 16px 8px 8px",
                color: "#183d79",
                fontWeight: 600,
                fontSize: "11px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Expense Invoice
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 16px 8px 8px",
                color: "#183d79",
                fontWeight: 600,
                fontSize: "11px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Expense Type
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 16px 8px 8px",
                color: "#183d79",
                fontWeight: 600,
                fontSize: "11px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Amount
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 16px 8px 8px",
                color: "#183d79",
                fontWeight: 600,
                fontSize: "11px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Date
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 16px 8px 8px",
                color: "#183d79",
                fontWeight: 600,
                fontSize: "11px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Payment
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredArr.map((z, i) => {
            return (
              <tr
                key={i}
                style={{
                  borderBottom: "1px solid #e0e0e0",
                  background: i % 2 === 0 ? "#fff" : "#f9f9f9",
                  transition: "background-color 150ms ease-in-out",
                }}
              >
                <td style={{ textAlign: "left", padding: "8px 16px 8px 8px", color: "#1F2937", fontSize: "11px", whiteSpace: "nowrap" }}>
                  {z.poSupplier?.order ?? "Comp. Exp."}
                </td>
                <td style={{ textAlign: "left", padding: "8px 16px 8px 8px", color: "#1F2937", fontSize: "11px", whiteSpace: "nowrap" }}>
                  {z.expense}
                </td>
                <td style={{ textAlign: "left", padding: "8px 16px 8px 8px", color: "#1F2937", fontSize: "11px", whiteSpace: "nowrap" }}>
                  {settings.Expenses.Expenses.find((q) => q.id === z.expType)?.expType}
                </td>
                <td
                  style={{
                    textAlign: "left",
                    padding: "8px 16px 8px 8px",
                    color: "#183d79",
                    fontWeight: 500,
                    fontSize: "11px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <NumericFormat
                    value={z.amount}
                    displayType="text"
                    thousandSeparator
                    allowNegative={true}
                    prefix={z.cur === "us" ? "$" : "€"}
                    decimalScale={3}
                    fixedDecimalScale
                    className="!text-[11px]"
                  />
                </td>
                <td style={{ textAlign: "left", padding: "8px 16px 8px 8px", color: "#1F2937", fontSize: "11px", whiteSpace: "nowrap" }}>
                  {dateFormat(z.date, "dd-mmm-yy")}
                </td>
                <td style={{ textAlign: "left", padding: "8px 16px 8px 8px", color: "#1F2937", fontSize: "11px", whiteSpace: "nowrap" }}>
                  {z.paid === "111" ? "Paid" : "Unpaid"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
