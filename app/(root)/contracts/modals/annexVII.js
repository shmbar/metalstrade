import { Selector } from '@components/selectors/selectShad';
import { PdfAnnexVII } from './pdf/pdfAnnexVII';
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

const AnnexVII = ({ valueInv, setValueInv, compData, settings }) => {
    const ax = valueInv.annexVII ?? {};
    const templates = settings['Annex VII']?.['Annex VII'] ?? [];

    const update = (key, val) => setValueInv(prev => ({
        ...prev,
        annexVII: { ...prev.annexVII, [key]: val }
    }));

    const handleInput = (e) => update(e.target.name, e.target.value);

    const selectTemplate = (id) => {
        const tmpl = templates.find(t => t.id === id);
        if (!tmpl) return;
        setValueInv(prev => ({
            ...prev,
            annexVII: {
                ...prev.annexVII,
                templateId: id,
                wasteDescription: tmpl.wasteDescription || '',
                baselCode: tmpl.baselCode || '',
                oecdCode: tmpl.oecdCode || '',
                annexIIIACode: tmpl.annexIIIACode || '',
                annexIIIBCode: tmpl.annexIIIBCode || '',
                euCode: tmpl.euCode || '',
                nationalCode: tmpl.nationalCode || '',
                otherCode: tmpl.otherCode || '',
                rDCode: tmpl.rDCode || '',
                exportCountry: tmpl.exportCountry || '',
                transitCountry: tmpl.transitCountry || '',
                importCountry: tmpl.importCountry || '',
                carrier1Name: tmpl.carrier1Name || '',
                carrier1Address: tmpl.carrier1Address || '',
                carrier1Contact: tmpl.carrier1Contact || '',
                carrier1Tel: tmpl.carrier1Tel || '',
                carrier1Fax: tmpl.carrier1Fax || '',
                carrier1Email: tmpl.carrier1Email || '',
                carrier1Transport: tmpl.carrier1Transport || '',
            }
        }));
    };

    const clearTemplate = () => update('templateId', '');

    const generatePdf = () => PdfAnnexVII(valueInv, compData, settings);

    return (
        <div className="border-2 border-[#b8ddf8] rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
                <p className="text-[0.75rem] font-semibold text-[var(--chathams-blue)]">Annex VII — EU Waste Shipment Document</p>
                <button
                    onClick={generatePdf}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.72rem] font-medium
                        bg-[var(--endeavour)] text-white hover:opacity-90 transition-all"
                >
                    <FileText size={13} /> Annex VII PDF
                </button>
            </div>

            {/* Template selector */}
            {templates.length > 0 && (
                <div className="mb-3 flex items-center gap-2">
                    <label className="text-[0.68rem] font-medium text-[var(--chathams-blue)] whitespace-nowrap">Load Template:</label>
                    <div className="w-64">
                        <Selector
                            arr={templates}
                            value={ax}
                            onChange={selectTemplate}
                            name="templateId"
                            secondaryName="name"
                            clear={clearTemplate}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">

                {/* Section 3: Quantity */}
                <SectionLabel text="Section 3 — Actual Quantity" />
                <Field label="Tonnes (Mg)" name="quantityTonnes" value={ax.quantityTonnes} onChange={handleInput} placeholder="e.g. 15.154" />
                <Field label="m³" name="quantityM3" value={ax.quantityM3} onChange={handleInput} placeholder="" />

                {/* Section 5a: First Carrier */}
                <SectionLabel text="Section 5(a) — First Carrier" />
                <Field label="Carrier Name" name="carrier1Name" value={ax.carrier1Name} onChange={handleInput} />
                <Field label="Carrier Address" name="carrier1Address" value={ax.carrier1Address} onChange={handleInput} />
                <Field label="Contact Person" name="carrier1Contact" value={ax.carrier1Contact} onChange={handleInput} />
                <Field label="Tel." name="carrier1Tel" value={ax.carrier1Tel} onChange={handleInput} />
                <Field label="Fax" name="carrier1Fax" value={ax.carrier1Fax} onChange={handleInput} />
                <Field label="E-Mail" name="carrier1Email" value={ax.carrier1Email} onChange={handleInput} />
                <Field label="Means of Transport" name="carrier1Transport" value={ax.carrier1Transport} onChange={handleInput} />
                <Field label="Date of Transfer" name="carrier1Date" value={ax.carrier1Date} onChange={handleInput} placeholder="dd.mm.yyyy" />

                {/* Section 5b: Second Carrier */}
                <SectionLabel text="Section 5(b) — Second Carrier (optional)" />
                <Field label="Carrier Name" name="carrier2Name" value={ax.carrier2Name} onChange={handleInput} />
                <Field label="Carrier Address" name="carrier2Address" value={ax.carrier2Address} onChange={handleInput} />
                <Field label="Contact Person" name="carrier2Contact" value={ax.carrier2Contact} onChange={handleInput} />
                <Field label="Tel." name="carrier2Tel" value={ax.carrier2Tel} onChange={handleInput} />
                <Field label="Fax" name="carrier2Fax" value={ax.carrier2Fax} onChange={handleInput} />
                <Field label="E-Mail" name="carrier2Email" value={ax.carrier2Email} onChange={handleInput} />
                <Field label="Means of Transport" name="carrier2Transport" value={ax.carrier2Transport} onChange={handleInput} />
                <Field label="Date of Transfer" name="carrier2Date" value={ax.carrier2Date} onChange={handleInput} placeholder="dd.mm.yyyy" />

                {/* Section 8 + 9: Recovery operation & Waste description */}
                <SectionLabel text="Section 8–9 — Recovery Operation & Waste Description" />
                <Field label="R-Code / D-Code (field 8)" name="rDCode" value={ax.rDCode} onChange={handleInput} placeholder="e.g. R4" />
                <Field label="Waste Description (field 9)" name="wasteDescription" value={ax.wasteDescription} onChange={handleInput} placeholder="e.g. Ni Cr Turnings" />

                {/* Section 10: Waste codes */}
                <SectionLabel text="Section 10 — Waste Identification Codes" />
                <Field label="i) Basel Annex IX" name="baselCode" value={ax.baselCode} onChange={handleInput} placeholder="e.g. B1010" />
                <Field label="ii) OECD Code" name="oecdCode" value={ax.oecdCode} onChange={handleInput} />
                <Field label="iii) Annex IIIA" name="annexIIIACode" value={ax.annexIIIACode} onChange={handleInput} />
                <Field label="iv) Annex IIIB" name="annexIIIBCode" value={ax.annexIIIBCode} onChange={handleInput} />
                <Field label="v) EU List of Wastes" name="euCode" value={ax.euCode} onChange={handleInput} placeholder="e.g. 19.12.02" />
                <Field label="vi) National Code" name="nationalCode" value={ax.nationalCode} onChange={handleInput} placeholder="e.g. 7503" />
                <Field label="vii) Other" name="otherCode" value={ax.otherCode} onChange={handleInput} />

                {/* Section 11: Countries */}
                <SectionLabel text="Section 11 — Countries / States Concerned" />
                <Field label="Export / Dispatch Country" name="exportCountry" value={ax.exportCountry} onChange={handleInput} placeholder="e.g. US" />
                <Field label="Transit Country" name="transitCountry" value={ax.transitCountry} onChange={handleInput} />
                <Field label="Import / Destination Country" name="importCountry" value={ax.importCountry} onChange={handleInput} placeholder="e.g. NL" />
            </div>
        </div>
    );
};

export default AnnexVII;
