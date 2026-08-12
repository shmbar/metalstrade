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
      className="w-fit"
      style={{
        background: "var(--bg-subtle)",
        border: "1px solid var(--line)",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
        fontFamily:
          "var(--font-jakarta), 'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Type, weight, padding and the header band all come from
          .detail-popup-table in globals.css — the same band .custom-table uses,
          so this popup matches the summary table it opens from. */}
      <table className="detail-popup-table" style={{ fontFamily: "inherit" }}>
        <thead>
          <tr>
            <th>PO#</th>
            <th>Expense Invoice</th>
            <th>Expense Type</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Payment</th>
          </tr>
        </thead>
        <tbody>
          {filteredArr.map((z, i) => {
            return (
              <tr key={i}>
                <td>{z.poSupplier?.order ?? "Comp. Exp."}</td>
                <td>{z.expense}</td>
                <td>{settings.Expenses.Expenses.find((q) => q.id === z.expType)?.expType}</td>
                <td>
                  <NumericFormat
                    value={z.amount}
                    displayType="text"
                    thousandSeparator
                    allowNegative={true}
                    prefix={z.cur === "us" ? "$" : "€"}
                    decimalScale={3}
                    fixedDecimalScale
                  />
                </td>
                <td>{dateFormat(z.date, "dd.mm.yy")}</td>
                <td>{z.paid === "111" ? "Paid" : "Unpaid"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
