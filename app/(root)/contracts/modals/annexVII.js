import { useEffect, useMemo } from 'react';
import { Selector } from '@components/selectors/selectShad';
import { PdfAnnexVII } from './pdf/pdfAnnexVII';
import { BtnIcon } from '@components/buttonIcons';

/* Most of these fields hold a phone number, a date or a 5-character waste code, so a
   two-column grid gave each of them ~490px of an 1040px dialog and made the form twice
   as tall as it needed to be. Four columns, with a span for the few that hold an
   address or a description. */
const SPAN = { 1: '', 2: 'sm:col-span-2', 3: 'sm:col-span-2 lg:col-span-3', 4: 'sm:col-span-2 lg:col-span-4' };

const Field = ({ label, name, value, onChange, placeholder = '', span = 1 }) => (
    <div className={SPAN[span] || SPAN[1]}>
        <label className="block responsiveText font-medium text-[var(--ink-muted)] mb-1">{label}</label>
        <input
            name={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            className="input h-7"
            style={{ fontFamily: 'inherit' }}
        />
    </div>
);

const SectionLabel = ({ text }) => (
    <p className={`${SPAN[4]} responsiveText font-medium text-[var(--endeavour)] mt-1.5 border-b border-[var(--line)] pb-0.5`}>{text}</p>
);

const AnnexVII = ({ valueInv, setValueInv, compData, settings, valueCon }) => {
    const ax = valueInv.annexVII ?? {};
    const templates = settings['Annex VII']?.['Annex VII'] ?? [];
    const carriers = settings['Carrier']?.['Carrier'] ?? [];
    const hsArr = useMemo(
        () => (settings['Hs']?.['Hs'] ?? [])
            .map(h => { const v = String(h.hs ?? '').toUpperCase(); return { id: v, hs: v }; })
            .sort((a, b) => parseFloat(a.hs) - parseFloat(b.hs)),
        [settings]
    );

    const update = (key, val) => setValueInv(prev => ({
        ...prev,
        annexVII: { ...prev.annexVII, [key]: val }
    }));

    const handleInput = (e) => update(e.target.name, e.target.value);

    // Auto-fill weight, container, date AND material/waste description on mount
    // (only when those fields are still empty — never overwrites user edits).
    useEffect(() => {
        const rows = valueInv.productsDataInvoice?.filter(r => r.qnty !== 's') ?? [];
        const sum = rows.reduce((s, r) => s + (parseFloat(r.qnty) || 0), 0);
        const netWt = sum > 0 ? sum.toFixed(3) : '';
        const firstCtn = rows.find(r => r.container)?.container || '';

        let dateStr = '';
        if (valueInv.dateRange?.startDate) {
            const d = new Date(valueInv.dateRange.startDate);
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            dateStr = `${dd}.${mm}.${d.getFullYear()}`;
        }

        // Build a waste description string. Priority:
        // 1. Contract's certSpec (saved by the AI Certificate Checker) — most precise,
        //    has actual element composition with ranges.
        // 2. Invoice product descriptions concatenated — fallback when no cert spec.
        let wasteDesc = '';
        const certSpec = Array.isArray(valueCon?.certSpec) ? valueCon.certSpec : [];
        if (certSpec.length) {
            // Use the contract's product description as the material name, then
            // append the element composition we already validated.
            const materialName = (valueCon?.productsData || [])
                .map(p => p?.description)
                .filter(Boolean)
                .join(' / ');
            const elements = certSpec
                .filter(s => s.element)
                .map(s => {
                    const lo = s.min !== '' && s.min != null ? String(s.min) : '';
                    const hi = s.max !== '' && s.max != null ? String(s.max) : '';
                    if (lo && hi) return `${s.element} ${lo}–${hi}%`;
                    if (lo) return `${s.element} ≥${lo}%`;
                    if (hi) return `${s.element} ≤${hi}%`;
                    return s.element;
                })
                .join(', ');
            wasteDesc = materialName
                ? `${materialName}${elements ? ' — ' + elements : ''}`
                : elements;
        } else {
            // No cert spec — fall back to invoice product descriptions
            wasteDesc = rows
                .map(r => r?.description)
                .filter(Boolean)
                .join('; ');
        }

        setValueInv(prev => {
            const ax = prev.annexVII ?? {};
            const updates = {};
            if (netWt && !ax.quantityTonnes) updates.quantityTonnes = netWt;
            if (firstCtn && !ax.carrier1Transport) updates.carrier1Transport = firstCtn;
            if (dateStr && !ax.carrier1Date) updates.carrier1Date = dateStr;
            if (dateStr && !ax.carrier2Date) updates.carrier2Date = dateStr;
            if (wasteDesc && !ax.wasteDescription) updates.wasteDescription = wasteDesc;
            if (!Object.keys(updates).length) return prev;
            return { ...prev, annexVII: { ...ax, ...updates } };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            }
        }));
    };

    const selectCarrier = (num, carrierId) => {
        const c = carriers.find(x => x.id === carrierId);
        if (!c) return;
        const p = `carrier${num}`;
        setValueInv(prev => ({
            ...prev,
            annexVII: {
                ...prev.annexVII,
                [`${p}Id`]: carrierId,
                [`${p}Name`]: c.name || '',
                [`${p}Address`]: c.address || '',
                [`${p}Contact`]: c.contact || '',
                [`${p}Tel`]: c.tel || '',
                [`${p}Fax`]: c.fax || '',
                [`${p}Email`]: c.email || '',
            }
        }));
    };

    const clearCarrier = (num) => {
        const p = `carrier${num}`;
        setValueInv(prev => ({
            ...prev,
            annexVII: {
                ...prev.annexVII,
                [`${p}Id`]: '',
                [`${p}Name`]: '',
                [`${p}Address`]: '',
                [`${p}Contact`]: '',
                [`${p}Tel`]: '',
                [`${p}Fax`]: '',
                [`${p}Email`]: '',
            }
        }));
    };

    const clearTemplate = () => update('templateId', '');
    const generatePdf = () => PdfAnnexVII(valueInv, compData, settings);

    const carrierSortedArr = [...carriers]
        .filter(c => !c.deleted)
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map(c => ({ ...c, displayName: c.nickname || c.name }));

    return (
        <div className="border border-[var(--line)] rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
                <p className="responsiveText font-medium text-[var(--chathams-blue)]">Annex VII — EU Waste Shipment Document</p>
                <button onClick={generatePdf} className="blackButton">
                    <BtnIcon action="pdf" /> Annex VII PDF
                </button>
            </div>

            {/* Template selector */}
            {templates.length > 0 && (
                <div className="mb-3 flex items-center gap-2">
                    <label className="responsiveText font-medium text-[var(--ink-muted)] whitespace-nowrap">Load Template</label>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-2">

                {/* Section 3: Quantity */}
                <SectionLabel text="Section 3 — Actual Quantity" />
                <Field label="Tonnes (Mg)" name="quantityTonnes" value={ax.quantityTonnes} onChange={handleInput} placeholder="e.g. 15.154" />
                <Field label="m³" name="quantityM3" value={ax.quantityM3} onChange={handleInput} />

                {/* Section 5a: First Carrier */}
                <SectionLabel text="Section 5(a) — First Carrier" />
                {carriers.length > 0 && (
                    <div>
                        <label className="block responsiveText font-medium text-[var(--ink-muted)] mb-1">Pick Carrier</label>
                        <div>
                            <Selector
                                arr={carrierSortedArr}
                                value={{ carrier1Id: ax.carrier1Id || '' }}
                                onChange={v => selectCarrier(1, v)}
                                name="carrier1Id"
                                secondaryName="displayName"
                                clear={() => clearCarrier(1)}
                            />
                        </div>
                    </div>
                )}
                <Field label="Carrier Name" name="carrier1Name" value={ax.carrier1Name} onChange={handleInput} />
                <Field label="Carrier Address" name="carrier1Address" value={ax.carrier1Address} onChange={handleInput} span={2} />
                <Field label="Contact Person" name="carrier1Contact" value={ax.carrier1Contact} onChange={handleInput} />
                <Field label="Tel." name="carrier1Tel" value={ax.carrier1Tel} onChange={handleInput} />
                <Field label="Fax" name="carrier1Fax" value={ax.carrier1Fax} onChange={handleInput} />
                <Field label="E-Mail" name="carrier1Email" value={ax.carrier1Email} onChange={handleInput} />
                <Field label="Means of Transport" name="carrier1Transport" value={ax.carrier1Transport} onChange={handleInput} span={2} />
                <Field label="Date of Transfer" name="carrier1Date" value={ax.carrier1Date} onChange={handleInput} placeholder="dd.mm.yyyy" />

                {/* Section 5b: Second Carrier */}
                <SectionLabel text="Section 5(b) — Second Carrier (optional)" />
                {carriers.length > 0 && (
                    <div>
                        <label className="block responsiveText font-medium text-[var(--ink-muted)] mb-1">Pick Carrier</label>
                        <div>
                            <Selector
                                arr={carrierSortedArr}
                                value={{ carrier2Id: ax.carrier2Id || '' }}
                                onChange={v => selectCarrier(2, v)}
                                name="carrier2Id"
                                secondaryName="displayName"
                                clear={() => clearCarrier(2)}
                            />
                        </div>
                    </div>
                )}
                <Field label="Carrier Name" name="carrier2Name" value={ax.carrier2Name} onChange={handleInput} />
                <Field label="Carrier Address" name="carrier2Address" value={ax.carrier2Address} onChange={handleInput} span={2} />
                <Field label="Contact Person" name="carrier2Contact" value={ax.carrier2Contact} onChange={handleInput} />
                <Field label="Tel." name="carrier2Tel" value={ax.carrier2Tel} onChange={handleInput} />
                <Field label="Fax" name="carrier2Fax" value={ax.carrier2Fax} onChange={handleInput} />
                <Field label="E-Mail" name="carrier2Email" value={ax.carrier2Email} onChange={handleInput} />
                <Field label="Means of Transport" name="carrier2Transport" value={ax.carrier2Transport} onChange={handleInput} span={2} />
                <Field label="Date of Transfer" name="carrier2Date" value={ax.carrier2Date} onChange={handleInput} placeholder="dd.mm.yyyy" />

                {/* Section 8 + 9: Recovery operation & Waste description */}
                <SectionLabel text="Section 8–9 — Recovery Operation & Waste Description" />
                <Field label="R-Code / D-Code (field 8)" name="rDCode" value={ax.rDCode} onChange={handleInput} placeholder="e.g. R4" />
                <Field label="Waste Description (field 9)" name="wasteDescription" value={ax.wasteDescription} onChange={handleInput} placeholder="e.g. Ni Cr Turnings" span={3} />

                {/* Section 10: Waste codes */}
                <SectionLabel text="Section 10 — Waste Identification Codes" />
                <Field label="i) Basel Annex IX" name="baselCode" value={ax.baselCode} onChange={handleInput} placeholder="e.g. B1010" />
                <Field label="ii) OECD Code" name="oecdCode" value={ax.oecdCode} onChange={handleInput} />
                <Field label="iii) Annex IIIA" name="annexIIIACode" value={ax.annexIIIACode} onChange={handleInput} />
                <Field label="iv) Annex IIIB" name="annexIIIBCode" value={ax.annexIIIBCode} onChange={handleInput} />
                <Field label="v) EU List of Wastes" name="euCode" value={ax.euCode} onChange={handleInput} placeholder="e.g. 19.12.02" />

                {/* vi) National Code — HS picker or free-text */}
                <div>
                    <label className="block responsiveText font-medium text-[var(--ink-muted)] mb-1">vi) National Code (HS)</label>
                    {hsArr.length > 0 ? (
                        <Selector
                            arr={hsArr}
                            value={{ nationalCode: ax.nationalCode || '' }}
                            onChange={v => update('nationalCode', v)}
                            name="nationalCode"
                            secondaryName="hs"
                            clear={() => update('nationalCode', '')}
                        />
                    ) : (
                        <input
                            name="nationalCode"
                            value={ax.nationalCode || ''}
                            onChange={handleInput}
                            placeholder="e.g. 7503"
                            className="input h-7"
                            style={{ fontFamily: 'inherit' }}
                        />
                    )}
                </div>

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
