'use client'

import { NumericFormat } from 'react-number-format'

// Group stock rows by grade (descriptionName + currency), returning total
// quantity and the weighted average cost per MT for each grade. Shared between
// the on-screen "Avg Cost Price per Grade" table and the Excel export so both
// reflect the same (filtered) data.
export const computeGradeSummary = (dataTable, settings) => {
  if (!dataTable || dataTable.length === 0) return []

  const gCur = (id) => settings?.Currency?.Currency?.find(q => q.id === id)?.cur || id

  // Group by descriptionName + cur, sum qnty and total value
  const groups = {}
  dataTable.forEach(row => {
    const name = row.descriptionName || '-'
    const curId = row.cur || ''
    const key = `${name}|${curId}`
    if (!groups[key]) {
      groups[key] = { descriptionName: name, curId, totalQnty: 0, totalValue: 0 }
    }
    const qty = parseFloat(row.qnty) || 0
    const val = row.total === '-' ? 0 : parseFloat(row.total) || 0
    groups[key].totalQnty += qty
    groups[key].totalValue += val
  })

  return Object.values(groups)
    .filter(r => r.totalQnty > 0.1)
    .sort((a, b) => a.descriptionName.localeCompare(b.descriptionName))
    .map(r => {
      const curCode = gCur(r.curId)
      const isoCode = curCode?.toLowerCase() === 'eur' ? 'EUR' : 'USD'
      return {
        ...r,
        avgPrice: r.totalQnty > 0 ? r.totalValue / r.totalQnty : 0,
        isoCode,
      }
    })
}

const GradeTable = ({ dataTable, loading, settings }) => {
  if (loading) return null

  const rows = computeGradeSummary(dataTable, settings)

  if (rows.length === 0) return null

  const thStyle = {
    color: 'var(--chathams-blue)',
    background: '#dbeeff',
    padding: '6px 10px',
    borderBottom: '1px solid #b8ddf8',
    whiteSpace: 'nowrap',
    fontWeight: 500,
  }

  const tdStyle = {
    color: 'var(--chathams-blue)',
    padding: '6px 10px',
    borderBottom: '1px solid #b8ddf8',
    whiteSpace: 'nowrap',
    textAlign: 'center',
  }

  return (
    <div className="mt-5 min-w-[420px]">
      <div
        style={{
          borderRadius: '16px',
          border: '1px solid #b8ddf8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Title */}
        <div
          className="responsiveTextTable font-medium text-center"
          style={{
            background: '#dbeeff',
            padding: '8px 16px',
            borderBottom: '1px solid #b8ddf8',
            color: 'var(--chathams-blue)',
            fontWeight: '500'
          }}
        >
          Avg Cost Price per Grade
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          <table className="w-full" style={{ tableLayout: 'auto', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr>
                <th className="responsiveTextTable font-medium text-center" style={thStyle}>Description</th>
                <th className="responsiveTextTable font-medium text-center" style={thStyle}>Total Weight (MT)</th>
                <th className="responsiveTextTable font-medium text-center" style={thStyle}>Avg Cost /MT</th>
                <th className="responsiveTextTable font-medium text-center" style={thStyle}>$/€</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const { avgPrice, isoCode } = r
                return (
                  <tr key={i} style={{ background: '#fff' }}>
                    <td className="responsiveTextTable" style={{ ...tdStyle, textAlign: 'left', paddingLeft: '14px' }}>
                      {r.descriptionName}
                    </td>
                    <td className="responsiveTextTable" style={tdStyle}>
                      <NumericFormat
                        value={r.totalQnty}
                        displayType="text"
                        thousandSeparator
                        decimalScale={3}
                        fixedDecimalScale
                      />
                    </td>
                    <td className="responsiveTextTable" style={tdStyle}>
                      <NumericFormat
                        value={avgPrice}
                        displayType="text"
                        thousandSeparator
                        prefix={isoCode === 'EUR' ? '€' : '$'}
                        decimalScale={2}
                        fixedDecimalScale
                      />
                    </td>
                    <td className="responsiveTextTable" style={tdStyle}>
                      {isoCode === 'EUR' ? '€' : '$'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default GradeTable
