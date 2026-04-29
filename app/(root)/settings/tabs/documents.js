import { useState, useContext } from 'react';
import { SettingsContext } from '../../../../contexts/useSettingsContext';
import { UserAuth } from '../../../../contexts/useAuthContext';
import { v4 as uuidv4 } from 'uuid';
import { CirclePlus, Trash, PenLine, Save } from 'lucide-react';

const ANNEX_FIELDS = [
    { key: 'name', label: 'Template Name', required: true },
    { key: 'rDCode', label: 'R-Code / D-Code (field 8)', placeholder: 'e.g. R4' },
    { key: 'wasteDescription', label: 'Waste Description (field 9)', placeholder: 'e.g. Ni Cr Turnings' },
    { key: 'baselCode', label: 'Basel Annex IX (field 10.i)', placeholder: 'e.g. B1010' },
    { key: 'oecdCode', label: 'OECD Code (field 10.ii)', placeholder: '' },
    { key: 'annexIIIACode', label: 'Annex IIIA Code (field 10.iii)', placeholder: '' },
    { key: 'annexIIIBCode', label: 'Annex IIIB Code (field 10.iv)', placeholder: '' },
    { key: 'euCode', label: 'EU List of Wastes (field 10.v)', placeholder: 'e.g. 19.12.02' },
    { key: 'nationalCode', label: 'National Code (field 10.vi)', placeholder: 'e.g. 7503' },
    { key: 'otherCode', label: 'Other Code (field 10.vii)', placeholder: '' },
    { key: 'exportCountry', label: 'Export / Dispatch Country (field 11)', placeholder: 'e.g. US' },
    { key: 'transitCountry', label: 'Transit Country (field 11)', placeholder: '' },
    { key: 'importCountry', label: 'Import / Destination Country (field 11)', placeholder: 'e.g. NL' },
];

const ISF_FIELDS = [
    { key: 'name', label: 'Template Name', required: true },
    { key: 'importerRecordNum', label: 'Importer of Record Number', placeholder: '' },
    { key: 'consigneeNum', label: 'Consignee Number', placeholder: '' },
    { key: 'htsCommodityCode', label: 'HTS-6 Commodity Code', placeholder: 'e.g. 7503.00' },
    { key: 'containerStuffingLocation', label: 'Container Stuffing Location', placeholder: '' },
    { key: 'consolidator', label: 'Consolidator', placeholder: '' },
];

const CARRIER_FIELDS = [
    { key: 'name', label: 'Carrier Name', required: true },
    { key: 'address', label: 'Address', placeholder: '' },
    { key: 'contact', label: 'Contact Person', placeholder: '' },
    { key: 'tel', label: 'Tel.', placeholder: '' },
    { key: 'fax', label: 'Fax', placeholder: '' },
    { key: 'email', label: 'E-Mail', placeholder: '' },
];

const blankAnnex = () => ANNEX_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), { id: '' });
const blankIsf = () => ISF_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), { id: '' });
const blankCarrier = () => CARRIER_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), { id: '' });

const getBlank = (doc) => doc === 'Annex VII' ? blankAnnex() : doc === 'ISF' ? blankIsf() : blankCarrier();
const getFields = (doc) => doc === 'Annex VII' ? ANNEX_FIELDS : doc === 'ISF' ? ISF_FIELDS : CARRIER_FIELDS;

const Documents = () => {
    const { settings, updateSettings } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const [activeDoc, setActiveDoc] = useState('Annex VII');
    const [form, setForm] = useState(blankAnnex());
    const [editId, setEditId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [error, setError] = useState('');

    const fields = getFields(activeDoc);
    const templates = settings[activeDoc]?.[activeDoc] ?? [];

    const switchDoc = (doc) => {
        setActiveDoc(doc);
        setForm(getBlank(doc));
        setEditId(null);
        setShowForm(false);
        setError('');
    };

    const handleField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const save = () => {
        if (!form.name?.trim()) { setError(`${activeDoc === 'Carrier' ? 'Carrier name' : 'Template name'} is required.`); return; }
        setError('');
        let newList;
        if (editId) {
            newList = templates.map(t => t.id === editId ? { ...form, id: editId } : t);
        } else {
            newList = [...templates, { ...form, id: uuidv4() }];
        }
        const newObj = { [activeDoc]: newList };
        updateSettings(uidCollection, newObj, activeDoc, true);
        setForm(getBlank(activeDoc));
        setEditId(null);
        setShowForm(false);
    };

    const edit = (t) => {
        setForm({ ...t });
        setEditId(t.id);
        setShowForm(true);
        setError('');
    };

    const del = (id) => {
        const newList = templates.filter(t => t.id !== id);
        const newObj = { [activeDoc]: newList };
        updateSettings(uidCollection, newObj, activeDoc, true);
        if (editId === id) {
            setForm(getBlank(activeDoc));
            setEditId(null);
            setShowForm(false);
        }
    };

    const cancel = () => {
        setForm(getBlank(activeDoc));
        setEditId(null);
        setShowForm(false);
        setError('');
    };

    const listLabel = activeDoc === 'Carrier' ? 'Carrier' : 'Template';

    return (
        <div className="p-2 flex w-full">
            <div className="flex w-full flex-col md:flex-row gap-4">

                {/* LEFT — list */}
                <div className="md:w-[35%] flex-shrink-0">
                    {/* Doc type toggle */}
                    <div className="flex gap-2 mb-3 flex-wrap">
                        {['Annex VII', 'ISF', 'Carrier'].map(doc => (
                            <button key={doc} onClick={() => switchDoc(doc)}
                                className={`px-4 py-1.5 rounded-full text-[0.75rem] font-medium transition-all border
                                    ${activeDoc === doc
                                        ? 'bg-[var(--endeavour)] text-white border-[var(--endeavour)]'
                                        : 'text-[var(--chathams-blue)] border-[#b8ddf8] hover:bg-[var(--selago)]'}`}>
                                {doc}
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    <ul className="flex flex-col ring-1 ring-black/5 rounded-2xl bg-[#e3f3ff] py-2 min-h-[60px]">
                        {templates.length === 0 && (
                            <li className="px-4 py-2 text-[0.75rem] text-[var(--regent-gray)] italic">
                                No {activeDoc === 'Carrier' ? 'carriers' : 'templates'} yet
                            </li>
                        )}
                        {templates.map(t => (
                            <li key={t.id}
                                className={`flex items-center justify-between px-4 py-2 rounded-full mx-2 cursor-pointer
                                    text-[0.75rem] text-[var(--chathams-blue)] hover:bg-[var(--selago)]
                                    ${editId === t.id ? 'bg-white font-semibold' : ''}`}>
                                <span onClick={() => edit(t)} className="flex-1 truncate">{t.name || '(unnamed)'}</span>
                                <div className="flex gap-2 ml-2">
                                    <PenLine size={14} className="opacity-50 hover:opacity-100 cursor-pointer" onClick={() => edit(t)} />
                                    <Trash size={14} className="opacity-50 hover:opacity-100 cursor-pointer text-red-500" onClick={() => del(t.id)} />
                                </div>
                            </li>
                        ))}
                    </ul>

                    <button onClick={() => { setForm(getBlank(activeDoc)); setEditId(null); setShowForm(true); setError(''); }}
                        className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.75rem] font-medium
                            border border-[#b8ddf8] text-[var(--chathams-blue)] hover:bg-[var(--selago)] transition-all">
                        <CirclePlus size={14} /> Add {listLabel}
                    </button>
                </div>

                {/* RIGHT — form */}
                {showForm && <div className="flex-1 border border-[#b8ddf8] rounded-2xl p-4">
                    <p className="text-[0.75rem] font-semibold text-[var(--chathams-blue)] mb-3 border-l-4 border-[var(--chathams-blue)] pl-2">
                        {editId ? `Edit ${listLabel}` : `New ${listLabel}`}
                    </p>
                    {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {fields.map(f => (
                            <div key={f.key} className={f.key === 'name' ? 'md:col-span-2' : ''}>
                                <label className="block text-[0.7rem] font-medium text-[var(--chathams-blue)] mb-0.5">
                                    {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                                </label>
                                <input
                                    value={form[f.key] || ''}
                                    onChange={e => handleField(f.key, e.target.value)}
                                    placeholder={f.placeholder || ''}
                                    className="border border-[#b8ddf8] rounded-full px-3 py-1 h-7 text-[0.75rem] w-full
                                        focus:outline-none focus:ring-1 focus:ring-[var(--endeavour)]"
                                    style={{ fontFamily: 'inherit' }}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button onClick={save}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[0.75rem] font-medium
                                bg-[var(--endeavour)] text-white hover:opacity-90 transition-all">
                            <Save size={13} /> {editId ? 'Update' : `Save ${listLabel}`}
                        </button>
                        <button onClick={cancel}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[0.75rem] font-medium
                                border border-[#b8ddf8] text-[var(--chathams-blue)] hover:bg-[var(--selago)]">
                            Cancel
                        </button>
                    </div>
                </div>}
            </div>
        </div>
    );
};

export default Documents;
