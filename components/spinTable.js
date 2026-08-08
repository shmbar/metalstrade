import React from 'react'

// Same spinner look as spinner.js / videoLoader.js — one loader recipe app-wide.
const spinTable = () => {
    return (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
            <div
                className="w-10 h-10 rounded-full border-4 border-[var(--brand-soft)] animate-spin"
                style={{ borderTopColor: 'var(--brand)' }}
            />
        </div>
    )
}

export default spinTable
