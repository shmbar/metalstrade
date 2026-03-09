'use client';

import { useContext } from "react";
import { FaSearch } from "react-icons/fa";
import { TiDeleteOutline } from "react-icons/ti";
import ColFilter from "./ColumnsFilter";
import { getTtl } from '../../utils/languages';
import { SettingsContext } from "../../contexts/useSettingsContext";
import { usePathname } from 'next/navigation';
import { GrAddCircle } from "react-icons/gr";
import Image from 'next/image';
import Tltip from "../../components/tlTip";
import { MdDeleteOutline } from "react-icons/md";
import { GrDocumentPdf } from "react-icons/gr";
import { QuickSumButton, QuickSumTotals } from './quicksum/QuickSumControl';
import DateRangePicker from '../../components/dateRangePicker';

const Header = ({
  data,
  cb,
  cb1,
  type,
  excellReport,
  globalFilter,
  setGlobalFilter,
  table,
  filterIcon,
  resetFilterTable,
  addMaterial,
  delTable,
  table1,
  runPdf,
  tableModes,
  datattl,
  isEditMode,
  setIsEditMode,
  quickSumEnabled = false,
  setQuickSumEnabled = () => {},
  quickSumColumns = [],
  setQuickSumColumns = () => {},
}) => {

  const { ln } = useContext(SettingsContext);
  const pathname = usePathname();

  const editEnabledRoutes = [
    '/invoices',
    '/expenses',
    '/accounting',
    '/contracts',
  ];

  const showEditButton = editEnabledRoutes.some(route =>
    pathname.startsWith(route)
  );

  return (
    <div className="sticky top-0 z-20">

      {/* Main Content - Single Row on Desktop, Two Rows on Mobile */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-2 gap-2">

        {/* Left Section: Search + All Action Icons */}
        <div className='flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 flex-1'>

          {/* Search Box */}
          {pathname !== '/accounting' && (
            <div className="flex items-center relative w-[120px] sm:w-[140px] h-7 border border-[var(--endeavour)] rounded-2xl bg-white focus-within:ring-1 focus-within:ring-blue-200 focus-within:border-blue-400 hover:border-gray-400 shadow-sm transition-all duration-200">
              <input
                className="bg-white border-0 shadow-none pr-8 pl-3 focus:outline-none focus:ring-0 w-full text-[var(--endeavour)] placeholder:text-[var(--endeavour)] h-full text-xs rounded-2xl"
                placeholder={getTtl('Search', ln)}
                value={globalFilter ?? ''}
                onChange={e => setGlobalFilter(e.target.value)}
                type='text'
              />
              {globalFilter === '' ? (
                <FaSearch className="text-gray-400 absolute right-3 top-1.5" style={{ fontSize: 14 }} />
              ) : (
                <TiDeleteOutline
                  className="text-gray-500 absolute right-3 top-2 cursor-pointer hover:text-red-500 transition-colors"
                  onClick={() => setGlobalFilter('')}
                  style={{ fontSize: 16 }}
                />
              )}
            </div>
          )}

          {/* All Action Icons */}
          <div className='flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0'>

            {/* Quick Sum Button - inline with other icons */}
            {pathname !== '/materialtables' && (
              <QuickSumButton
                table={table}
                enabled={quickSumEnabled}
                setEnabled={setQuickSumEnabled}
                selectedColumnIds={quickSumColumns}
                setSelectedColumnIds={setQuickSumColumns}
              />
            )}

            {/* Edit Mode */}
            {showEditButton && typeof setIsEditMode === 'function' && (
              <Tltip direction="bottom" tltpText={isEditMode ? 'Editing ON' : 'Edit'}>
                <div
                  onClick={() => setIsEditMode(prev => !prev)}
                  className={`w-8 h-8 inline-flex items-center justify-center rounded hover:bg-[var(--selago)] cursor-pointer transition-colors ${
                    isEditMode ? 'bg-[var(--selago)] text-[var(--endeavour)]' : 'text-gray-600'
                  }`}
                  title={isEditMode ? 'Editing ON' : 'Edit'}
                >
                  <Image
                    src="/logo/edit.svg"
                    alt="Edit"
                    width={16}
                    height={16}
                    className="w-4 h-4 object-cover"
                    priority
                  />
                </div>
              </Tltip>
            )}

            {/* Chat */}
            <Tltip direction="bottom" tltpText={getTtl('Ask question', ln) || 'Ask question'}>
              <div
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('ims:openChat'));
                  }
                }}
                className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-[var(--selago)] cursor-pointer text-[var(--endeavour)] transition-colors"
                aria-label={getTtl('Ask question', ln) || 'Ask question'}
                title={getTtl('Ask question', ln) || 'Ask question'}
              >
                <Image
                  src="/logo/chat.svg"
                  alt="Chat"
                  width={16}
                  height={16}
                  className="w-4 h-4 object-cover"
                  priority
                />
              </div>
            </Tltip>

            {/* Column Filter */}
            <div className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-[var(--selago)] cursor-pointer text-[var(--endeavour)] transition-colors">
              <ColFilter table={table} iconClassName="text-gray-600" iconSize={16} />
            </div>

            {/* Excel Report */}
            {excellReport && (
              <div className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-[var(--selago)] cursor-pointer text-[var(--endeavour)] transition-colors">
                {excellReport}
              </div>
            )}

            {/* Filter Icon */}
            {filterIcon && (
              <div className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-[var(--selago)] cursor-pointer text-[var(--endeavour)] transition-colors">
                {filterIcon}
              </div>
            )}

            {/* Reset Filter */}
            {resetFilterTable && (
              <>{resetFilterTable}</>
            )}

            {/* Material Table Actions */}
            {type === 'mTable' && (
              <div className='flex items-center gap-1.5 sm:gap-2'>
                <Tltip direction='bottom' tltpText='Add new material'>
                  <button
                    onClick={addMaterial}
                    className="w-8 h-8 hover:bg-[var(--selago)] text-[var(--endeavour)] inline-flex items-center justify-center rounded focus:outline-none transition-colors"
                  >
                    <GrAddCircle style={{ fontSize: 16 }} />
                  </button>
                </Tltip>

                <Tltip direction='bottom' tltpText='Export to PDF'>
                  <button
                    onClick={() => runPdf(table1)}
                    className="w-8 h-8 hover:bg-[var(--selago)] text-[var(--endeavour)] inline-flex items-center justify-center rounded focus:outline-none transition-colors"
                  >
                    <GrDocumentPdf style={{ fontSize: 16 }} />
                  </button>
                </Tltip>

                <Tltip direction='bottom' tltpText='Delete Table'>
                  <button
                    onClick={() => delTable(table1)}
                    className="w-8 h-8 hover:bg-red-50 text-gray-600 hover:text-red-600 inline-flex items-center justify-center rounded focus:outline-none transition-colors"
                  >
                    <MdDeleteOutline style={{ fontSize: 16 }} />
                  </button>
                </Tltip>
              </div>
            )}

            {/* Contract Statement Modes */}
            {type === 'contractStatementTableModes' && tableModes}
          </div>
        </div>

        {/* Right Section: Dropdown + DateRangePicker */}
        <div className='flex items-center gap-2 flex-wrap'>
          {/* Stock Selector Dropdown */}
          {cb && (
            <div className='flex-shrink-0'>
              {cb}
            </div>
          )}

          {/* DateRangePicker: Removed from Stocks, Settings and Material Tables */}
          {(pathname !== '/stocks' && pathname !== '/settings' && pathname !== '/materialtables') && (
            <div className='flex-shrink-0'>
              <DateRangePicker />
            </div>
          )}
        </div>
      </div>

      {/* Quick Sum Totals - separate row below, only shows when rows selected */}
      {pathname !== '/materialtables' && quickSumEnabled && (
        <div className="px-2 pb-1">
          <QuickSumTotals
            table={table}
            enabled={quickSumEnabled}
            selectedColumnIds={quickSumColumns}
          />
        </div>
      )}
    </div>
  );
};

export default Header;
