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
      className="w-fit custom-tooltip-table"
      style={{
        background: "var(--surface-pill)",
        border: "1px solid var(--border-divider)",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 16px rgba(var(--endeavour-rgb),0.12)",
        fontFamily:
          "var(--font-poppins), 'Poppins', sans-serif",
        fontSize: "0.68rem",
      }}
    >
      <table style={{ width: "auto", borderCollapse: "collapse" }}>
        <thead>
          <tr
            style={{
              background: "var(--selago)",
              borderBottom: "1px solid var(--border-neutral)",
            }}
          >
            <th
              style={{
                textAlign: "left",
                padding: "8px 16px 8px 8px",
                color: "var(--chathams-blue)",
                fontWeight: 500,
                fontSize: "0.68rem",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}
            >
              PO#
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 16px 8px 8px",
                color: "var(--chathams-blue)",
                fontWeight: 500,
                fontSize: "0.68rem",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}
            >
              Expense Invoice
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 16px 8px 8px",
                color: "var(--chathams-blue)",
                fontWeight: 500,
                fontSize: "0.68rem",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}
            >
              Expense Type
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 16px 8px 8px",
                color: "var(--chathams-blue)",
                fontWeight: 500,
                fontSize: "0.68rem",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}
            >
              Amount
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 16px 8px 8px",
                color: "var(--chathams-blue)",
                fontWeight: 500,
                fontSize: "0.68rem",
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
              }}
            >
              Date
            </th>
            <th
              style={{
                textAlign: "left",
                padding: "8px 16px 8px 8px",
                color: "var(--chathams-blue)",
                fontWeight: 500,
                fontSize: "0.68rem",
                letterSpacing: "0.05em",
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
                  borderBottom: "1px solid var(--border-neutral)",
                  background: i % 2 === 0 ? "#fff" : "var(--surface-base)",
                  transition: "background-color 150ms ease-in-out",
                }}
              >
                <td style={{ textAlign: "left", padding: "8px 16px 8px 8px", color: "var(--port-gore)", fontSize: "0.68rem", whiteSpace: "nowrap" }}>
                  {z.poSupplier?.order ?? "Comp. Exp."}
                </td>
                <td style={{ textAlign: "left", padding: "8px 16px 8px 8px", color: "var(--port-gore)", fontSize: "0.68rem", whiteSpace: "nowrap" }}>
                  {z.expense}
                </td>
                <td style={{ textAlign: "left", padding: "8px 16px 8px 8px", color: "var(--port-gore)", fontSize: "0.68rem", whiteSpace: "nowrap" }}>
                  {settings.Expenses.Expenses.find((q) => q.id === z.expType)?.expType}
                </td>
                <td
                  style={{
                    textAlign: "left",
                    padding: "8px 16px 8px 8px",
                    color: "var(--chathams-blue)",
                    fontWeight: 500,
                    fontSize: "0.68rem",
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
                    className="responsiveTextTable"
                  />
                </td>
                <td style={{ textAlign: "left", padding: "8px 16px 8px 8px", color: "var(--port-gore)", fontSize: "0.68rem", whiteSpace: "nowrap" }}>
                  {dateFormat(z.date, "dd.mm.yy")}
                </td>
                <td style={{ textAlign: "left", padding: "8px 16px 8px 8px", color: "var(--port-gore)", fontSize: "0.68rem", whiteSpace: "nowrap" }}>
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
