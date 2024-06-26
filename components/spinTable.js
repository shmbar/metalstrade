import React from 'react'

const spinTable = () => {
    return (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-16 h-16 border-t-8 border-slate-500 border-solid rounded-full animate-spin">

            </div>
        </div>
    )
}

export default spinTable