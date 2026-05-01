import { Selector } from '@components/selectors/selectShad';
import { PdfISF } from './pdf/pdfISF';
import { FileText } from 'lucide-react';

const Field = ({ label, name, value, onChange, placeholder = '', wide = false }) => (
    <div className={wide ? 'md:col-span-2' : ''}>
        <label className="block text-[0.68rem] font-medium text-[var(--chathams-blue)] mb-0.5">{label}</label>
        <input
            name={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            className="border border-[#b8ddf8] rounded-full px-3 h-7 text-[0.75rem] w-full
                focus:outline-none focus:ring-1 focus:ring-[var(--endeavour)]"
            style={{ fontFamily: 'inherit' }}
        />
    </div>
);

const SectionLabel = ({ text }) => (
    <p className="md:col-span-2 text-[0.7rem] font-semibold text-[var(--endeavour)] mt-2 border-b border-[#dbeeff] pb-0.5">{text}</p>
);

const SHIPMENT_TYPES = ['FCL', 'LCL', 'BULK', 'CONSOL'];
const BL_TYPES = ['House', 'Straight', 'Telex', 'Waybill'];

const ISF = ({ valueInv, setValueInv, compData, settings, valueCon }) => {
    const isf = valueInv.isf ?? {};
    const templates = settings['ISF']?.['ISF'] ?? [];
    const clts = settings.Client?.Client ?? [];

    const update = (key, val) => setValueInv(prev => ({
        ...prev,
        isf: { ...prev.isf, [key]: val }
    }));

    const handleInput = (e) => update(e.target.name, e.target.value);

    const selectTemplate = (id) => {
        const tmpl = templates.find(t => t.id === id);
        if (!tmpl) return;
        setValueInv(prev => ({
            ...prev,
            isf: {
                ...prev.isf,
                templateId: id,
                importerRecordNum: tmpl.importerRecordNum || '',
                consigneeNum: tmpl.consigneeNum || '',
                htsCommodityCode: tmpl.htsCommodityCode || '',
                itemDescription: tmpl.itemDescription || '',
                email1: tmpl.email1 || '',
                email2: tmpl.email2 || '',
            }
        }));
    };

    const clearTemplate = () => update('templateId', '');
    const clearShipTo = () => update('shipTo', '');

    const generatePdf = () => PdfISF(valueInv, compData, settings, valueCon);

    const shipToName = clts.find(c => c.id === (isf.shipTo || valueInv.client))?.nname || '';
    const originLabel = settings.Origin?.Origin?.find(o => o.id === valueInv.origin)?.origin || '';

    return (
        <div className="border-2 border-[#b8ddf8] rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
                <p className="text-[0.75rem] font-semibold text-[var(--chathams-blue)]">ISF — Importer Security Filing (10+2)</p>
                <button
                    onClick={generatePdf}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.72rem] font-medium
                        bg-emerald-600 text-white hover:opacity-90 transition-all"
                >
                    <FileText size={13} /> ISF PDF
                </button>
            </div>

            {/* Template selector */}
            {templates.length > 0 && (
                <div className="mb-3 flex items-center gap-2">
                    <label className="text-[0.68rem] font-medium text-[var(--chathams-blue)] whitespace-nowrap">Load Template:</label>
                    <div className="w-64">
                        <Selector
                            arr={templates}
                            value={isf}
                            onChange={selectTemplate}
                            name="templateId"
                            secondaryName="name"
                            clear={clearTemplate}
                        />
                    </div>
                </div>
            )}

            {/* Auto-populated info */}
            <div className="md:col-span-2 bg-[#f8fbff] border border-[#dbeeff] rounded-xl p-2 mb-3">
                <p className="text-[0.68rem] font-semibold text-[var(--endeavour)] mb-1.5">Auto-populated from Contract / Invoice</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[0.68rem] text-[var(--port-gore)]">
                    <div><span className="font-medium">Seller (our company):</span> {compData.name || '—'}</div>
                    <div><span className="font-medium">Ship To / Buyer:</span> {shipToName || '—'}</div>
                    <div><span className="font-medium">Country of Origin:</span> {originLabel || '—'}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">

                {/* Part I */}
                <SectionLabel text="Part I — Shipment Info" />

                {/* Shipment Type */}
                <div>
                    <label className="block text-[0.68rem] font-medium text-[var(--chathams-blue)] mb-0.5">Shipment Type</label>
                    <div className="flex gap-2 flex-wrap">
                        {SHIPMENT_TYPES.map(type => (
                            <button
                                key={type}
                                onClick={() => update('shipmentType', isf.shipmentType === type ? '' : type)}
                                className={`px-3 py-0.5 rounded-full text-[0.72rem] border transition-all
                                    ${isf.shipmentType === type
                                        ? 'bg-[var(--endeavour)] text-white border-[var(--endeavour)]'
                                        : 'text-[var(--chathams-blue)] border-[#b8ddf8] hover:bg-[var(--selago)]'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ship To override */}
                <div>
                    <label className="block text-[0.68rem] font-medium text-[var(--chathams-blue)] mb-0.5">Ship To / ISF Importer (override)</label>
                    <Selector
                        arr={clts.filter(c => !c.deleted).sort((a, b) => (a.nname || '').localeCompare(b.nname || ''))}
                        value={isf}
                        onChange={v => update('shipTo', v)}
                        name="shipTo"
                        secondaryName="nname"
                        clear={clearShipTo}
                    />
                </div>

                <Field label="Port of Discharge / 1st Port of Call" name="pod" value={isf.pod} onChange={handleInput} placeholder="e.g. Rotterdam" />
                <Field label="ETA (Estimated Time of Arrival)" name="eta" value={isf.eta} onChange={handleInput} placeholder="dd mmm yyyy" />
                <Field label="Importer Reference #" name="importerRecordNum" value={isf.importerRecordNum} onChange={handleInput} />
                <Field label="Consignee Number" name="consigneeNum" value={isf.consigneeNum} onChange={handleInput} />

                {/* Part II */}
                <SectionLabel text="Part II — B/L Data" />

                <Field label="SCAC Code" name="blScac" value={isf.blScac} onChange={handleInput} placeholder="e.g. HLCU" />
                <Field label="Bill of Lading Number" name="blNum" value={isf.blNum} onChange={handleInput} />

                {/* BL Type */}
                <div className="md:col-span-2">
                    <label className="block text-[0.68rem] font-medium text-[var(--chathams-blue)] mb-0.5">B/L Type</label>
                    <div className="flex gap-2 flex-wrap">
                        {BL_TYPES.map(type => (
                            <button
                                key={type}
                                onClick={() => update('blType', isf.blType === type ? '' : type)}
                                className={`px-3 py-0.5 rounded-full text-[0.72rem] border transition-all
                                    ${isf.blType === type
                                        ? 'bg-[var(--endeavour)] text-white border-[var(--endeavour)]'
                                        : 'text-[var(--chathams-blue)] border-[#b8ddf8] hover:bg-[var(--selago)]'}`}
                            >
                                {type === 'House' ? 'House B/L' : type === 'Straight' ? 'Straight B/L' : type === 'Telex' ? 'Telex Release' : 'Sea Waybill'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Part IV */}
                <SectionLabel text="Part IV — Commodity" />

                <Field label="HTS-6 Commodity Code" name="htsCommodityCode" value={isf.htsCommodityCode} onChange={handleInput} placeholder="e.g. 7503.00" />
                <Field label="Item Description" name="itemDescription" value={isf.itemDescription} onChange={handleInput} placeholder="e.g. Ni Cr Stainless Steel Turnings" />

                {/* Part V */}
                <SectionLabel text="Part V — Notification Emails" />

                <Field label="Email Address 1" name="email1" value={isf.email1} onChange={handleInput} placeholder="e.g. compliance@company.com" />
                <Field label="Email Address 2" name="email2" value={isf.email2} onChange={handleInput} />
            </div>
        </div>
    );
};

export default ISF;
