// Branded HTML → PDF templates (rendered by expo-print). Parity with the web's
// PO / invoice PDFs, styled for a clean A4 document.

const money = (n: number, sym = '$') =>
  sym + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);
const qty = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(Number(n) || 0);

const shell = (title: string, company: string, inner: string) => `
<!doctype html><html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0f1b35; margin: 0; padding: 32px; }
  .top { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 3px solid #0366ae; padding-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 800; color: #0366ae; letter-spacing: .5px; }
  .doc { text-align:right; }
  .doc h1 { margin:0; font-size: 20px; color:#0f1b35; }
  .doc .muted { color:#5a6a85; font-size: 12px; margin-top:2px; }
  .row { display:flex; justify-content:space-between; gap: 24px; margin-top: 20px; }
  .box { flex:1; background:#f4f6fb; border:1px solid #e7ecf3; border-radius:10px; padding:12px; }
  .box .label { font-size: 10px; text-transform:uppercase; letter-spacing:.08em; color:#97a3b8; }
  .box .val { font-size: 13px; margin-top:4px; }
  table { width:100%; border-collapse: collapse; margin-top: 24px; font-size: 12px; }
  th { text-align:left; background:#0366ae; color:#fff; padding:8px 10px; }
  th.r, td.r { text-align:right; }
  td { padding:8px 10px; border-bottom:1px solid #eef2f8; }
  tr:nth-child(even) td { background:#fafcff; }
  .totals { margin-top: 16px; display:flex; justify-content:flex-end; }
  .totals .t { min-width: 240px; }
  .totals .line { display:flex; justify-content:space-between; padding:6px 0; }
  .totals .grand { border-top:2px solid #0f1b35; font-weight:800; font-size:14px; }
  .foot { margin-top: 28px; color:#97a3b8; font-size: 10px; text-align:center; }
</style></head><body>
  <div class="top"><div class="brand">${company}</div><div class="doc">${title}</div></div>
  ${inner}
  <div class="foot">Generated from IMS Mobile · ${new Date().toLocaleDateString()}</div>
</body></html>`;

export function contractPoHtml(contract: any, v: any, compData: any): string {
  const company = compData?.companyName || compData?.cmpnyName || 'IMS';
  const sym = v.currency === 'eu' ? '€' : '$';
  const rows = (contract.productsData || [])
    .map((p: any) => {
      const total = (Number(p.qnty) || 0) * (Number(p.unitPrc) || 0);
      return `<tr><td>${p.description || '—'}</td><td class="r">${qty(p.qnty)}</td><td class="r">${money(p.unitPrc, sym)}</td><td class="r">${money(total, sym)}</td></tr>`;
    })
    .join('');
  const title = `<h1>Purchase Order</h1><div class="muted">${contract.order || ''}</div><div class="muted">${(contract.date || '').substring(0, 10)}</div>`;
  const inner = `
    <div class="row">
      <div class="box"><div class="label">Supplier</div><div class="val">${v.supplierName}</div></div>
      <div class="box"><div class="label">Currency</div><div class="val">${sym === '€' ? 'EUR' : 'USD'}</div></div>
      <div class="box"><div class="label">Quantity</div><div class="val">${v.mtLabel}</div></div>
    </div>
    <table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit Price</th><th class="r">Total</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No products</td></tr>'}</tbody></table>
    <div class="totals"><div class="t"><div class="line grand"><span>Total</span><span>${v.valueLabel}</span></div></div></div>
    ${contract.termPmnt ? `<div class="box" style="margin-top:20px"><div class="label">Payment terms</div><div class="val">${contract.termPmnt}</div></div>` : ''}`;
  return shell(title, company, inner);
}

export function invoiceHtml(view: any, compData: any): string {
  const company = compData?.companyName || compData?.cmpnyName || 'IMS';
  const sym = view.cur === 'eu' ? '€' : '$';
  const rows = (view.raw.productsDataInvoice || [])
    .map((p: any) => {
      const total = Number(p.total) || (Number(p.qnty) || 0) * (Number(p.unitPrc) || 0);
      return `<tr><td>${p.description || '—'}</td><td class="r">${qty(p.qnty)}</td><td class="r">${money(p.unitPrc, sym)}</td><td class="r">${money(total, sym)}</td></tr>`;
    })
    .join('');
  const title = `<h1>Invoice #${view.number ?? ''}</h1><div class="muted">${view.dateIso || ''}</div>`;
  const inner = `
    <div class="row">
      <div class="box"><div class="label">Bill to</div><div class="val">${view.clientName}</div></div>
      <div class="box"><div class="label">Status</div><div class="val">${view.status}</div></div>
    </div>
    <table><thead><tr><th>Material</th><th class="r">Qty</th><th class="r">Unit Price</th><th class="r">Total</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No items</td></tr>'}</tbody></table>
    <div class="totals"><div class="t">
      <div class="line"><span>Total</span><span>${view.totalLabel}</span></div>
      <div class="line"><span>Paid</span><span>${sym}${new Intl.NumberFormat('en-US',{minimumFractionDigits:2}).format(view.paid)}</span></div>
      <div class="line grand"><span>Balance due</span><span>${view.balanceLabel}</span></div>
    </div></div>`;
  return shell(title, company, inner);
}
