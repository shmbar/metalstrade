import { Selector } from '@components/selectors/selectShad';
import { PdfISF } from './pdf/pdfISF';
import { FileText } from 'lucide-react';

const Field = ({ label, name, value, onChange, placeholder = '' }) => (
    <div>
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

const ISF = ({ valueInv, setValueInv, compData, settings, valueCon }) => {
    const isf = valueInv.isf ?? {};
    const templates = settings['ISF']?.['ISF'] ?? [];

    const sups = settings.Supplier?.Supplier ?? [];
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
                containerStuffingLocation: tmpl.containerStuffingLocation || '',
                consolidator: tmpl.consolidator || '',
            }
        }));
    };

    const clearTemplate = () => update('templateId', '');
    const clearSeller = () => update('seller', '');
    const clearShipTo = () => update('shipTo', '');

    const generatePdf = () => PdfISF(valueInv, compData, settings, valueCon);

    // Resolve display names for auto-populated fields
    const sellerName = sups.find(s => s.id === (isf.seller || valueCon?.supplier))?.nname || '';
    const shipToName = clts.find(c => c.id === (isf.shipTo || valueInv.client))?.nname || '';
    const originLabel = settings.Origin?.Origin?.find(o => o.id === valueInv.origin)?.origin || '';

    return (
        <div className="border-2 border-[#b8ddf8] rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
                <p className="text-[0.75rem] font-semibold text-[var(--chathams-blue)]">ISF — Importer Security Filing (10+2)</p>
                <button
                    onClick={generatePdf}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.72rem] font-medium
                        border border-[#b8ddf8] text-[var(--chathams-blue)] hover:bg-[var(--selago)] transition-all"
                >
                    <FileText size={13} /> Generate PDF
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
                            clear={clearTemplate}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">

                {/* Auto-populated from contract / invoice */}
                <div className="md:col-span-2 bg-[#f8fbff] border border-[#dbeeff] rounded-xl p-2">
                    <p className="text-[0.68rem] font-semibold text-[var(--endeavour)] mb-1.5">Auto-populated from Contract / Invoice</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[0.68rem] text-[var(--port-gore)]">
                        <div><span className="font-medium">Seller (Supplier):</span> {sellerName || '—'}</div>
                        <div><span className="font-medium">Buyer (Company):</span> {compData.name || '—'}</div>
                        <div><span className="font-medium">Ship To (Client):</span> {shipToName || '—'}</div>
                        <div><span className="font-medium">Country of Origin:</span> {originLabel || '—'}</div>
                    </div>
                </div>

                {/* Seller override */}
                <div>
                    <label className="block text-[0.68rem] font-medium text-[var(--chathams-blue)] mb-0.5">1. Seller (override)</label>
                    <Selector
                        arr={sups.filter(s => !s.deleted).sort((a, b) => (a.nname || '').localeCompare(b.nname || ''))}
                        value={isf}
                        onChange={v => update('seller', v)}
                        name="seller"
                        clear={clearSeller}
                    />
                </div>

                {/* Ship To override */}
                <div>
                    <label className="block text-[0.68rem] font-medium text-[var(--chathams-blue)] mb-0.5">6. Ship To Party (override)</label>
                    <Selector
                        arr={clts.filter(c => !c.deleted).sort((a, b) => (a.nname || '').localeCompare(b.nname || ''))}
                        value={isf}
                        onChange={v => update('shipTo', v)}
                        name="shipTo"
                        clear={clearShipTo}
                    />
                </div>

                <Field label="3. Importer of Record Number" name="importerRecordNum" value={isf.importerRecordNum} onChange={handleInput} />
                <Field label="4. Consignee Number" name="consigneeNum" value={isf.consigneeNum} onChange={handleInput} />
                <Field label="8. HTS-6 Commodity Code" name="htsCommodityCode" value={isf.htsCommodityCode} onChange={handleInput} placeholder="e.g. 7503.00" />
                <Field label="9. Container Stuffing Location" name="containerStuffingLocation" value={isf.containerStuffingLocation} onChange={handleInput} />
                <Field label="10. Consolidator" name="consolidator" value={isf.consolidator} onChange={handleInput} />
            </div>
        </div>
    );
};

export default ISF;
