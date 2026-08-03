'use client';
import { useState, useEffect, useRef } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';

const EditableCell = ({
    value: initialValue,
    row,
    column,
    onSave,
    editable = true,
    type = 'text', // text, number, select
    options = [], // for select type
}) => {
    const [value, setValue] = useState(initialValue);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef(null);

    // Sync with external value changes
    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (type === 'text' || type === 'number') {
                inputRef.current.select();
            }
        }
    }, [isEditing, type]);

    const handleDoubleClick = (e) => {
        e.stopPropagation();
        if (editable) {
            setIsEditing(true);
        }
    };

    const handleSave = async () => {
        if (value === initialValue) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        try {
            if (onSave) {
                await onSave(row.original, column.id, value);
            }
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving:', error);
            setValue(initialValue); // Revert on error
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setValue(initialValue);
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const handleBlur = () => {
        // Small delay to allow button clicks
        setTimeout(() => {
            if (isEditing) {
                handleSave();
            }
        }, 150);
    };

    if (!editable) {
        return <span>{initialValue || '-'}</span>;
    }

    if (isEditing) {
        return (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {type === 'select' ? (
                    <select
                        ref={inputRef}
                        value={value || ''}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        disabled={isSaving}
                        className="w-full px-2 py-1 responsiveTextInput border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-[var(--surface-card)]"
                    >
                        <option value="">-</option>
                        {options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        ref={inputRef}
                        type={type}
                        value={value || ''}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        disabled={isSaving}
                        className="w-full px-2 py-1 responsiveTextInput border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ minWidth: '60px' }}
                    />
                )}
                {isSaving && (
                    <span className="responsiveTextInput text-blue-500 animate-pulse">...</span>
                )}
            </div>
        );
    }

    return (
        <div
            onDoubleClick={handleDoubleClick}
            className="cursor-text hover:bg-blue-50 px-1 py-0.5 rounded min-h-[20px] transition-colors"
            title="Double-click to edit"
        >
            {value || '-'}
        </div>
    );
};

export default EditableCell;
