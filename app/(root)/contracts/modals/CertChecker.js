'use client';
import { useState, useRef, useContext, useEffect } from 'react';
import { Upload, Loader2, CheckCircle2, XCircle, FileText, X, AlertTriangle, Plus, Trash2, Save } from 'lucide-react';
import { ContractsContext } from '@contexts/useContractsContext';
import { UserAuth } from '@contexts/useAuthContext';
import { updateContractField } from '@utils/utils';
import { authedFetch } from '@utils/aiClient';

const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const ELEMENT_PRESETS = ['Ni', 'Cr', 'Mo', 'Co', 'Fe', 'Cu', 'Mn', 'Si', 'C', 'W', 'Nb', 'Ti', 'Al', 'V'];

const CertChecker = () => {
    const { valueCon, setValueCon } = useContext(ContractsContext);
    const { uidCollection } = UserAuth();

    const [file, setFile] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [spec, setSpec] = useState(() => valueCon?.certSpec || []); // [{ element, min, max, tolerance }]
    const [newElement, setNewElement] = useState('');
    const [newMin, setNewMin] = useState('');
    const [newMax, setNewMax] = useState('');
    const [newTolerance, setNewTolerance] = useState('');
    const [savingSpec, setSavingSpec] = useState(false);
    const inputRef = useRef(null);

    // Pre-load saved spec from the contract whenever the active contract changes.
    // We intentionally exclude `valueCon.certSpec` from deps — re-syncing on every
    // internal spec edit would wipe in-progress changes. Only resync on contract switch.
    useEffect(() => {
        if (valueCon?.certSpec?.length) setSpec(valueCon.certSpec);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [valueCon?.id]);

    // Material context: contract's product descriptions help the AI identify the alloy
    const materialContext = (valueCon?.productsData || [])
        .map(p => p.description)
        .filter(Boolean)
        .join(' / ');

    const saveSpecToContract = async () => {
        if (!valueCon?.id || !uidCollection) return;
        setSavingSpec(true);
        try {
            const cleanSpec = spec.filter(s => s.element && (s.min !== '' || s.max !== ''));
            await updateContractField(uidCollection, valueCon.id, valueCon.date, { certSpec: cleanSpec });
            setValueCon(prev => ({ ...prev, certSpec: cleanSpec }));
        } catch (e) {
            setError('Could not save spec: ' + (e.message || 'unknown error'));
        } finally {
            setSavingSpec(false);
        }
    };

    const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handleFile = (f) => {
        if (!f) return;
        if (!ACCEPTED.includes(f.type)) {
            setError('Only PDF, JPG, and PNG files are supported.');
            return;
        }
        if (f.size > 10 * 1024 * 1024) {
            setError('File must be under 10 MB.');
            return;
        }
        setFile(f);
        setResult(null);
        setError(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const analyze = async () => {
        if (!file || analyzing) return;
        setAnalyzing(true);
        setResult(null);
        setError(null);
        try {
            const b64 = await toBase64(file);
            const res = await authedFetch('/api/ai/cert-checker', {
                method: 'POST',
                body: JSON.stringify({
                    fileBase64: b64,
                    mimeType: file.type,
                    contractSpec: spec.filter(s => s.element && (s.min !== '' || s.max !== '')),
                    materialContext: materialContext || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || 'Analysis failed');
            setResult(data);
        } catch (e) {
            setError(e.message || 'Analysis failed. Please try again.');
        } finally {
            setAnalyzing(false);
        }
    };

    const addSpec = () => {
        if (!newElement.trim()) return;
        setSpec(prev => [...prev, {
            element: newElement.trim().toUpperCase(),
            min: newMin,
            max: newMax,
            tolerance: newTolerance,
        }]);
        setNewElement('');
        setNewMin('');
        setNewMax('');
        setNewTolerance('');
    };

    const removeSpec = (i) => setSpec(prev => prev.filter((_, k) => k !== i));

    return (
        <div className='p-3 space-y-3'>

            {/* Optional spec input */}
            <div className='rounded-xl p-3' style={{ border: '1px solid #b8ddf8', background: '#f8fbff' }}>
                <div className='flex items-center justify-between mb-2'>
                    <p className='font-semibold' style={{ fontSize: '0.68rem', color: 'var(--chathams-blue)' }}>
                        Contract Specification {valueCon?.certSpec?.length ? '(saved)' : '(optional)'}
                    </p>
                    {valueCon?.id && spec.length > 0 && (
                        <button
                            onClick={saveSpecToContract}
                            disabled={savingSpec}
                            className='flex items-center gap-1 px-2 py-0.5 rounded-full text-white disabled:opacity-50'
                            style={{ fontSize: '0.58rem', background: 'var(--endeavour)' }}
                        >
                            {savingSpec ? <Loader2 className='w-2.5 h-2.5 animate-spin' /> : <Save className='w-2.5 h-2.5' />}
                            Save spec to contract
                        </button>
                    )}
                </div>
                {materialContext && (
                    <p style={{ fontSize: '0.58rem', color: 'var(--regent-gray)', marginBottom: '6px' }}>
                        Material context: <span style={{ color: 'var(--chathams-blue)', fontWeight: 600 }}>{materialContext}</span>
                    </p>
                )}
                <div className='flex flex-wrap gap-1.5 mb-2'>
                    {spec.map((s, i) => (
                        <div key={i} className='flex items-center gap-1 px-2 py-1 rounded-full' style={{ background: '#dbeeff', border: '1px solid #b8ddf8', fontSize: '0.6rem', color: 'var(--chathams-blue)' }}>
                            <span className='font-semibold'>{s.element}</span>
                            {(s.min !== '' || s.max !== '') && <span>{s.min || '—'}–{s.max || '—'}%</span>}
                            {s.tolerance && parseFloat(s.tolerance) > 0 && <span>±{s.tolerance}</span>}
                            <button onClick={() => removeSpec(i)}><X className='w-2.5 h-2.5' /></button>
                        </div>
                    ))}
                </div>
                <div className='flex items-center gap-1.5 flex-wrap'>
                    <select
                        value={newElement}
                        onChange={e => setNewElement(e.target.value)}
                        className='rounded-full border px-2 py-0.5 outline-none focus:border-[var(--endeavour)]'
                        style={{ fontSize: '0.62rem', borderColor: '#b8ddf8', background: 'white', color: 'var(--port-gore)' }}
                    >
                        <option value=''>Element</option>
                        {ELEMENT_PRESETS.filter(e => !spec.find(s => s.element === e)).map(e => (
                            <option key={e} value={e}>{e}</option>
                        ))}
                    </select>
                    <input placeholder='Min %' value={newMin} onChange={e => setNewMin(e.target.value)} type='number' step='any'
                        className='w-16 rounded-full border px-2 py-0.5 outline-none focus:border-[var(--endeavour)]'
                        style={{ fontSize: '0.62rem', borderColor: '#b8ddf8', background: 'white', color: 'var(--port-gore)' }} />
                    <input placeholder='Max %' value={newMax} onChange={e => setNewMax(e.target.value)} type='number' step='any'
                        className='w-16 rounded-full border px-2 py-0.5 outline-none focus:border-[var(--endeavour)]'
                        style={{ fontSize: '0.62rem', borderColor: '#b8ddf8', background: 'white', color: 'var(--port-gore)' }} />
                    <input placeholder='±tol' value={newTolerance} onChange={e => setNewTolerance(e.target.value)} type='number' step='any' title='Tolerance — allowed deviation from min/max (e.g. 0.05)'
                        className='w-14 rounded-full border px-2 py-0.5 outline-none focus:border-[var(--endeavour)]'
                        style={{ fontSize: '0.62rem', borderColor: '#b8ddf8', background: 'white', color: 'var(--port-gore)' }} />
                    <button onClick={addSpec} disabled={!newElement}
                        className='flex items-center gap-1 px-2.5 py-0.5 rounded-full text-white disabled:opacity-40'
                        style={{ fontSize: '0.62rem', background: 'var(--endeavour)' }}>
                        <Plus className='w-2.5 h-2.5' /> Add
                    </button>
                </div>
            </div>

            {/* Drop zone */}
            <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !file && inputRef.current?.click()}
                onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !file) { e.preventDefault(); inputRef.current?.click(); } }}
                role='button'
                tabIndex={file ? -1 : 0}
                aria-label='Upload certificate — drop a PDF, JPG or PNG here, or click to browse'
                className='rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[var(--endeavour)]/30'
                style={{
                    border: `2px dashed ${dragging ? 'var(--endeavour)' : '#b8ddf8'}`,
                    background: dragging ? '#dbeeff' : '#f8fbff',
                    minHeight: '80px',
                    padding: '16px',
                }}
            >
                <input ref={inputRef} type='file' accept='.pdf,.jpg,.jpeg,.png' className='hidden'
                    onChange={e => handleFile(e.target.files[0])} />
                {file ? (
                    <div className='flex items-center gap-2'>
                        <FileText className='w-4 h-4' style={{ color: 'var(--endeavour)' }} />
                        <span style={{ fontSize: '0.68rem', color: 'var(--chathams-blue)' }}>{file.name}</span>
                        <button onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }} className='ml-1'>
                            <X className='w-3 h-3' style={{ color: '#ef4444' }} />
                        </button>
                    </div>
                ) : (
                    <>
                        <Upload className='w-5 h-5 mb-1' style={{ color: '#b8ddf8' }} />
                        <p style={{ fontSize: '0.65rem', color: 'var(--chathams-blue)' }}>Drop certificate here or click to upload</p>
                        <p style={{ fontSize: '0.58rem', color: 'var(--regent-gray)' }}>PDF, JPG, PNG · max 10 MB</p>
                    </>
                )}
            </div>

            {/* Analyze button */}
            {file && !result && (
                <button onClick={analyze} disabled={analyzing}
                    className='w-full flex items-center justify-center gap-2 py-2 rounded-xl text-white font-medium transition-all disabled:opacity-60'
                    style={{ background: 'var(--endeavour)', fontSize: '0.72rem' }}>
                    {analyzing ? <><Loader2 className='w-4 h-4 animate-spin' /> Analyzing certificate…</> : '✦ Analyze Certificate'}
                </button>
            )}

            {/* Error */}
            {error && (
                <div className='flex items-center gap-2 p-2.5 rounded-lg' style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
                    <AlertTriangle className='w-3.5 h-3.5 flex-shrink-0' style={{ color: '#991b1b' }} />
                    <span style={{ fontSize: '0.65rem', color: '#991b1b' }}>{error}</span>
                </div>
            )}

            {/* Results */}
            {result && (
                <div className='space-y-2'>
                    {/* Cert metadata */}
                    <div className='flex flex-wrap gap-2'>
                        {result.certificateNumber && (
                            <span className='px-2 py-0.5 rounded-full' style={{ fontSize: '0.6rem', background: '#dbeeff', color: 'var(--chathams-blue)', border: '1px solid #b8ddf8' }}>
                                Cert # {result.certificateNumber}
                            </span>
                        )}
                        {result.date && (
                            <span className='px-2 py-0.5 rounded-full' style={{ fontSize: '0.6rem', background: '#dbeeff', color: 'var(--chathams-blue)', border: '1px solid #b8ddf8' }}>
                                {result.date}
                            </span>
                        )}
                        {result.material && (
                            <span className='px-2 py-0.5 rounded-full' style={{ fontSize: '0.6rem', background: '#dbeeff', color: 'var(--chathams-blue)', border: '1px solid #b8ddf8' }}>
                                {result.material}
                            </span>
                        )}
                    </div>

                    {/* Results table (with spec comparison) */}
                    {result.results?.length > 0 && (
                        <div>
                            <p className='font-semibold mb-1' style={{ fontSize: '0.65rem', color: 'var(--chathams-blue)' }}>Specification Check</p>
                            <div className='rounded-xl overflow-hidden' style={{ border: '1px solid #b8ddf8' }}>
                                <table className='w-full'>
                                    <thead>
                                        <tr style={{ background: 'var(--selago)' }}>
                                            {['Element', 'Spec', 'Certificate', 'Result'].map(h => (
                                                <th key={h} className='px-3 py-1.5 text-left font-semibold' style={{ fontSize: '0.6rem', color: 'var(--chathams-blue)' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.results.map((row, i) => (
                                            <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fbff', borderTop: '1px solid #dbeeff' }}>
                                                <td className='px-3 py-1.5 font-semibold' style={{ fontSize: '0.65rem', color: 'var(--port-gore)' }}>{row.element}</td>
                                                <td className='px-3 py-1.5' style={{ fontSize: '0.62rem', color: 'var(--regent-gray)' }}>{row.spec || '—'}</td>
                                                <td className='px-3 py-1.5 font-semibold' style={{ fontSize: '0.65rem', color: 'var(--port-gore)' }}>{row.actual ?? '—'}{row.actual != null ? '%' : ''}</td>
                                                <td className='px-3 py-1.5'>
                                                    {row.pass ? (
                                                        <span
                                                            className='flex items-center gap-1 px-2 py-0.5 rounded-full w-fit'
                                                            style={{ fontSize: '0.58rem', background: '#d1fae5', color: '#065f46' }}
                                                            role='status'
                                                            aria-label={`${row.element} pass`}
                                                        >
                                                            <CheckCircle2 className='w-3 h-3' aria-hidden='true' /> Pass
                                                        </span>
                                                    ) : (
                                                        <div className='flex flex-col gap-0.5'>
                                                            <span
                                                                className='flex items-center gap-1 px-2 py-0.5 rounded-full w-fit'
                                                                style={{ fontSize: '0.58rem', background: '#fee2e2', color: '#991b1b' }}
                                                                role='status'
                                                                aria-label={`${row.element} fail${row.reason ? ': ' + row.reason : ''}`}
                                                            >
                                                                <XCircle className='w-3 h-3' aria-hidden='true' /> Fail
                                                            </span>
                                                            {row.reason && (
                                                                <span style={{ fontSize: '0.55rem', color: '#991b1b' }}>{row.reason}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Extracted elements (no spec) */}
                    {result.extractedElements?.length > 0 && !result.results?.length && (
                        <div>
                            <p className='font-semibold mb-1' style={{ fontSize: '0.65rem', color: 'var(--chathams-blue)' }}>Extracted Composition</p>
                            <div className='flex flex-wrap gap-1.5'>
                                {result.extractedElements.map((el, i) => (
                                    <span key={i} className='px-2.5 py-1 rounded-full font-medium' style={{ fontSize: '0.62rem', background: '#dbeeff', color: 'var(--chathams-blue)', border: '1px solid #b8ddf8' }}>
                                        {el.element}: {el.value}{el.unit || '%'}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <button onClick={() => { setFile(null); setResult(null); setError(null); }}
                        className='flex items-center gap-1 px-3 py-1 rounded-full border transition-colors hover:border-[var(--endeavour)]'
                        style={{ fontSize: '0.62rem', borderColor: '#b8ddf8', color: 'var(--chathams-blue)' }}>
                        <Trash2 className='w-3 h-3' /> Check another certificate
                    </button>
                </div>
            )}
        </div>
    );
};

export default CertChecker;
