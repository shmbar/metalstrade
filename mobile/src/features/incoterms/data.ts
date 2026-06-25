// Incoterms® 2020 — static reference data, copied verbatim from the web page
// (app/(root)/incoterms/page.js). No Firestore; pure reference lookup.
export interface Incoterm {
  code: string;
  name: string;
  mode: 'any' | 'sea';
  desc: string;
  risk: string;
  carriage: string;
  insurance: string;
  exportC: string;
  importC: string;
}

export const INCOTERMS: Incoterm[] = [
  {
    code: 'EXW', name: 'Ex Works', mode: 'any',
    desc: "Seller makes the goods available at its own premises (or another named place). The buyer bears all costs and risks of taking the goods from there — the minimum obligation for the seller.",
    risk: "At the seller's premises, when the goods are placed at the buyer's disposal (not loaded).",
    carriage: 'Buyer — arranges and pays all transport',
    insurance: 'Not required',
    exportC: 'Buyer', importC: 'Buyer',
  },
  {
    code: 'FCA', name: 'Free Carrier', mode: 'any',
    desc: "Seller delivers the goods, cleared for export, to the carrier nominated by the buyer at the named place. Risk passes at that handover.",
    risk: "When goods are handed to the buyer's carrier (loaded, if delivery is at the seller's premises).",
    carriage: 'Buyer — main carriage',
    insurance: 'Not required',
    exportC: 'Seller', importC: 'Buyer',
  },
  {
    code: 'CPT', name: 'Carriage Paid To', mode: 'any',
    desc: "Seller pays for carriage to the named destination, but risk transfers to the buyer as soon as the goods are handed to the first carrier.",
    risk: 'When goods are handed to the first carrier (at origin).',
    carriage: 'Seller — pays to the named destination',
    insurance: 'Not required',
    exportC: 'Seller', importC: 'Buyer',
  },
  {
    code: 'CIP', name: 'Carriage and Insurance Paid To', mode: 'any',
    desc: "As CPT, but the seller also buys insurance covering the buyer's risk. Under the 2020 rules the seller must provide all-risk cover (Institute Cargo Clauses A).",
    risk: 'When goods are handed to the first carrier (at origin).',
    carriage: 'Seller — pays to the named destination',
    insurance: 'Seller — all-risk cover (ICC A)',
    exportC: 'Seller', importC: 'Buyer',
  },
  {
    code: 'DAP', name: 'Delivered at Place', mode: 'any',
    desc: "Seller delivers when the goods are placed at the buyer's disposal at the named destination, ready for unloading. The seller bears all risk up to that point.",
    risk: 'At the named destination, ready for unloading (seller does not unload).',
    carriage: 'Seller — to the named destination',
    insurance: 'Not required (seller bears risk to destination)',
    exportC: 'Seller', importC: 'Buyer',
  },
  {
    code: 'DPU', name: 'Delivered at Place Unloaded', mode: 'any',
    desc: "Seller delivers when the goods, once unloaded, are placed at the buyer's disposal at the named place. The only Incoterm that requires the seller to unload.",
    risk: 'At the named place, once the goods are unloaded.',
    carriage: 'Seller — to the named place, including unloading',
    insurance: 'Not required',
    exportC: 'Seller', importC: 'Buyer',
  },
  {
    code: 'DDP', name: 'Delivered Duty Paid', mode: 'any',
    desc: "Seller delivers the goods cleared for import at the named destination and pays all duties and taxes — the maximum obligation for the seller.",
    risk: 'At the named destination, ready for unloading.',
    carriage: 'Seller — to the named destination',
    insurance: 'Not required',
    exportC: 'Seller', importC: 'Seller — incl. duties & taxes',
  },
  {
    code: 'FAS', name: 'Free Alongside Ship', mode: 'sea',
    desc: "Seller delivers when the goods are placed alongside the vessel (e.g. on the quay) at the named port of shipment.",
    risk: 'When goods are placed alongside the vessel at the port of shipment.',
    carriage: 'Buyer — main carriage',
    insurance: 'Not required',
    exportC: 'Seller', importC: 'Buyer',
  },
  {
    code: 'FOB', name: 'Free on Board', mode: 'sea',
    desc: "Seller delivers when the goods are on board the vessel nominated by the buyer at the named port of shipment.",
    risk: 'When goods are on board the vessel at the port of shipment.',
    carriage: 'Buyer — main carriage',
    insurance: 'Not required',
    exportC: 'Seller', importC: 'Buyer',
  },
  {
    code: 'CFR', name: 'Cost and Freight', mode: 'sea',
    desc: "Seller pays the cost and freight to bring the goods to the destination port, but risk transfers once the goods are on board at origin.",
    risk: 'When goods are on board the vessel at the port of shipment.',
    carriage: 'Seller — pays freight to the destination port',
    insurance: 'Not required',
    exportC: 'Seller', importC: 'Buyer',
  },
  {
    code: 'CIF', name: 'Cost, Insurance and Freight', mode: 'sea',
    desc: "As CFR, but the seller also provides marine insurance covering the buyer's risk. Under the 2020 rules minimum cover (Institute Cargo Clauses C) is required.",
    risk: 'When goods are on board the vessel at the port of shipment.',
    carriage: 'Seller — pays freight to the destination port',
    insurance: 'Seller — minimum cover (ICC C)',
    exportC: 'Seller', importC: 'Buyer',
  },
];

export const MODE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'any', label: 'Any mode' },
  { key: 'sea', label: 'Sea / inland' },
] as const;
