// Customs document generators — HTML ports of the web jsPDF AnnexVII + ISF forms
// (app/(root)/contracts/modals/pdf/*). Render the data saved on the contract
// (contract.annexVII / contract.isf) into branded A4 documents for export/share.

const esc = (v: any) => String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
};

const shell = (title: string, body: string) => `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; font-family: Helvetica, Arial, sans-serif; }
  body { color: #111; font-size: 10px; }
  h1 { font-size: 15px; text-align: center; margin: 0 0 2px; color: #103a7a; }
  .sub { text-align: center; color: #555; font-size: 10px; margin-bottom: 10px; }
  .bar { background: #103a7a; color: #fff; font-weight: 700; padding: 5px 8px; font-size: 11px; margin: 10px 0 0; }
  .sec { border: 1px solid #999; border-top: none; padding: 7px 8px; }
  .sec h3 { margin: 0 0 4px; font-size: 11px; color: #103a7a; }
  .grid { display: flex; flex-wrap: wrap; }
  .col { flex: 1; min-width: 45%; border: 1px solid #999; padding: 7px 8px; }
  .row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #eee; }
  .row span:first-child { color: #555; }
  .row span:last-child { font-weight: 600; text-align: right; }
  .note { font-size: 7px; color: #777; margin-top: 8px; line-height: 1.4; }
</style></head><body>${body}</body></html>`;

const kv = (label: string, value: any) =>
  `<div class="row"><span>${esc(label)}</span><span>${esc(value) || '—'}</span></div>`;

export function annexViiHtml(contract: any, compData: any, settings: any): string {
  const ax = contract?.annexVII ?? {};
  const client = (settings?.Client?.Client ?? []).find((c: any) => c.id === contract?.client);
  const clientAddr = [client?.street, client?.city, client?.country].filter(Boolean).join(', ');
  const shipDate = fmtDate(contract?.dateRange?.startDate);

  const body = `
    <h1>INFORMATION ACCOMPANYING SHIPMENTS OF WASTE</h1>
    <div class="sub">As referred to in Article 3(2) and (4) — Annex VII, Regulation (EC) No 1013/2006</div>

    <div class="bar">CONSIGNMENT INFORMATION</div>
    <div class="grid">
      <div class="col"><h3>1. Person who arranges the shipment</h3>
        ${kv('Name', compData?.name)}${kv('Address', compData?.street)}${kv('Contact', compData?.contact)}
        ${kv('Tel / Fax', `${compData?.phone || ''}  ${compData?.fax || ''}`)}${kv('E-Mail', compData?.email)}
      </div>
      <div class="col"><h3>2. Importer / Consignee</h3>
        ${kv('Name', client?.nname)}${kv('Address', clientAddr)}${kv('Contact', client?.poc)}
        ${kv('Tel / Fax', `${client?.phone || ''}  ${client?.fax || ''}`)}${kv('E-Mail', client?.email)}
      </div>
    </div>
    <div class="grid">
      <div class="col"><h3>3. Actual quantity</h3>${kv('Tonnes (Mg)', ax.quantityTonnes)}${kv('m³', ax.quantityM3)}</div>
      <div class="col"><h3>4. Actual date of shipment</h3>${kv('Date', shipDate)}</div>
    </div>
    <div class="grid">
      <div class="col"><h3>5(a) First Carrier</h3>${kv('Name', ax.carrier1Name)}${kv('Address', ax.carrier1Address)}${kv('Contact', ax.carrier1Contact)}${kv('Tel', ax.carrier1Tel)}${kv('Transport', ax.carrier1Transport)}${kv('Date of transfer', ax.carrier1Date)}</div>
      <div class="col"><h3>5(b) Second Carrier</h3>${kv('Name', ax.carrier2Name)}${kv('Address', ax.carrier2Address)}${kv('Contact', ax.carrier2Contact)}${kv('Tel', ax.carrier2Tel)}${kv('Transport', ax.carrier2Transport)}${kv('Date of transfer', ax.carrier2Date)}</div>
    </div>
    <div class="grid">
      <div class="col"><h3>6. Waste generator</h3>${kv('Name', compData?.name)}${kv('Address', compData?.street)}${kv('Contact', compData?.contact)}${kv('Tel', compData?.phone)}${kv('E-Mail', compData?.email)}</div>
      <div class="col"><h3>7. Recovery facility / Laboratory</h3>${kv('Name', client?.nname)}${kv('Address', clientAddr)}${kv('Contact', client?.poc)}${kv('Tel / Fax', `${client?.phone || ''}  ${client?.fax || ''}`)}</div>
    </div>
    <div class="grid">
      <div class="col"><h3>8. Recovery operation</h3>${kv('R-code / D-code', ax.rDCode)}</div>
      <div class="col"><h3>9. Usual description of the waste</h3><div>${esc(ax.wasteDescription) || '—'}</div></div>
    </div>
    <div class="sec"><h3>10. Waste identification codes</h3>
      ${kv('i) Basel Annex IX', ax.baselCode)}${kv('ii) OECD', ax.oecdCode)}${kv('iii) Annex IIIA', ax.annexIIIACode)}${kv('iv) Annex IIIB', ax.annexIIIBCode)}${kv('v) EU list of wastes', ax.euCode)}${kv('vi) National code', ax.nationalCode)}${kv('vii) Other', ax.otherCode)}
    </div>
    <div class="sec"><h3>11. Countries / State(s) concerned</h3>
      ${kv('Export / Dispatch', ax.exportCountry)}${kv('Transit', ax.transitCountry)}${kv('Import / Destination', ax.importCountry)}
    </div>
    <div class="sec"><h3>12. Declaration of the person who arranges the shipment</h3>
      <div style="font-size:8px;color:#555">I certify that the above information is complete and correct to my best knowledge, and that legally-binding written contractual obligations have been entered into with the consignee.</div>
      ${kv('Name', compData?.contact)}${kv('Date', shipDate)}
    </div>
    <div class="note">(¹) Pursuant to Regulation (EC) No 1013/2006, Annex IC. (²) If more than 3 carriers, attach information in blocks 5(a)(b)(c).
    (³) When the arranger is not the producer/collector, provide producer/collector info. (⁴⁵) Use relevant Annex IIIA/IIIB codes.</div>
  `;
  return shell('Annex VII', body);
}

export function isfHtml(contract: any, compData: any, settings: any): string {
  const isf = contract?.isf ?? {};
  const shipTo = (settings?.Client?.Client ?? []).find((c: any) => c.id === (isf.shipTo || contract?.client));
  const origin = (settings?.Origin?.Origin ?? []).find((o: any) => o.id === contract?.origin)?.origin || '';
  const shipToAddr = [shipTo?.street, shipTo?.city, shipTo?.country].filter(Boolean).join(', ');
  const etd = fmtDate(contract?.dateRange?.startDate);

  const body = `
    <h1>Declaration for IMPORTER SECURITY FILING (ISF)</h1>
    <div class="sub">U.S. Customs and Border Protection — CBP</div>

    <div class="sec">${kv('ISF Importer Company Name', compData?.name)}${kv('Invoice #', contract?.order)}</div>

    <div class="bar">PART I — ISF DATA</div>
    <div class="sec">${kv('ISF Importer ID', isf.isfImporterId)}${kv('Importer of Record #', isf.importerRecordNum)}${kv('Consignee #', isf.consigneeNum)}${kv('IOR ID', isf.iorId)}${kv('Shipment Type', isf.shipmentType)}</div>

    <div class="bar">PART II — B/L DATA</div>
    <div class="sec">${kv('Bill of Lading Number', isf.blNum)}${kv('B/L SCAC', isf.blScac)}${kv('B/L Type', isf.blType)}${kv('Carnet #', isf.carnetNum)}${kv('Port of Discharge (POD)', isf.pod)}${kv('ETA', isf.eta || etd)}</div>

    <div class="bar">PART III — PARTY DATA</div>
    <div class="sec">${kv('Ship To', shipTo?.nname)}${kv('Address', shipToAddr)}${kv('Country of Origin', origin)}</div>

    <div class="bar">PART IV — INVOICE / COMMODITY DATA</div>
    <div class="sec">${kv('Item Description', isf.itemDescription)}${kv('HTS Commodity Code', isf.htsCommodityCode)}${kv('ETD', etd)}</div>

    <div class="bar">PART V — NOTIFICATION EMAILS & CERTIFICATION</div>
    <div class="sec">${kv('Email Address 1', isf.email1)}${kv('Email Address 2', isf.email2)}${kv('Company', compData?.name)}
      <div class="row"><span>Authorized Signature</span><span>__________________</span></div>
    </div>
  `;
  return shell('ISF', body);
}
