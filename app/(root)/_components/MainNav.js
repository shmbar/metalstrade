'use client'

import { useContext, useState, useRef, useEffect } from 'react'
import { UserAuth } from '../../../contexts/useAuthContext'
import { SettingsContext } from '../../../contexts/useSettingsContext'
import { getTtl } from '../../../utils/languages'
import { useRouter } from 'next/navigation'
import { BiSearch, BiLogOutCircle, BiMessageRoundedDots } from 'react-icons/bi'
import { FiSettings } from 'react-icons/fi'
import { IoClose } from 'react-icons/io5';
import Image from 'next/image';
import { useGlobalSearch } from '../../../contexts/useGlobalSearchContext'
import Tltip from '../../../components/tlTip'

export const MainNav = () => {
  const { SignOut, user } = UserAuth()
  const { compData } = useContext(SettingsContext)
  const ln = compData?.lng || 'English'
  const router = useRouter()
  const { query, setQuery, items } = useGlobalSearch()

  const [openSearch, setOpenSearch] = useState(false)
  const searchRef = useRef(null)

  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  const [now, setNow] = useState(null)
  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const LogOut = async () => {
    await SignOut()
    router.push('/')
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setOpenSearch(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const normalizedQuery = (query || '').trim().toLowerCase()

  const searchResults =
    normalizedQuery.length < 2
      ? []
      : items
          .filter((x) => (x.searchText || '').toLowerCase().includes(normalizedQuery))
          .slice(0, 10)

  const onPickResult = (item) => {
    setOpenSearch(false)
    setQuery('')
    router.push(`${item.route}?focus=${encodeURIComponent(item.rowId)}`)
  }

  return (
    <div
      className='fixed top-0 left-0 right-0 px-1 md:px-2 xl:px-3 py-3 hidden md:flex items-center bg-[#e3f3ff] z-[10000] rounded-lg'
      style={{
        height: 'clamp(56px, 7vh, 80px)',
        borderRadius: '12px',
        border: '1.5px solid #b8ddf8',
        padding: '0 clamp(8px, 1vw, 16px)', // reduced horizontal padding
      }}
    >
      {/* Logo Section (left) */}
      <div
        className='flex items-center gap-4'
        style={{
          marginRight: 'clamp(6px, 1vw, 10px)',
        }}
      >
        <img
          src='/logo/ims_main.svg'
          alt='IMS Logo'
          style={{
            width: 'clamp(120px, 18vw, 200px)',
            height: 'auto',
          }}
        />
      </div>


      {/* Right Side: All icons and controls in a row, all functional */}
      <div className='flex items-center gap-2 ml-auto'>
        {/* Global Search */}
        <div className='relative flex items-center' ref={searchRef}>
          {!openSearch ? (
            <Tltip tltpText={getTtl('Search', ln) || 'Search'} direction='bottom'>
            <button
              className='flex items-center justify-center w-10 h-10'
              onClick={() => setOpenSearch(true)}
              aria-label='Search'
            >
              <img src='/logo/search.svg' alt='Search' className='w-5 h-5' />
            </button>
            </Tltip>
          ) : (
            <div className="relative flex items-center responsiveText">
              <input
                type='text'
                placeholder={getTtl('Search anything...', ln) || 'Search anything...'}
                value={query || ''}
                autoFocus
                onBlur={() => setOpenSearch(false)}
                onChange={(e) => setQuery(e.target.value)}
                className='ml-2 w-60 pl-3 pr-8 py-2 rounded-full bg-gray-50 border border-gray-200 shadow-sm focus:border-[var(--rock-blue)] focus:bg-white focus:outline-none placeholder:text-[var(--regent-gray)] placeholder:opacity-100 transition-all'
                style={{ fontSize: 'inherit', color: query ? 'var(--port-gore)' : 'var(--port-gore)' }}
              />
              <button
                type="button"
                onClick={() => { setOpenSearch(false); setQuery(''); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--regent-gray)] hover:text-red-500 transition-colors"
                tabIndex={-1}
                aria-label="Close search"
              >
                <IoClose size={20} />
              </button>
            </div>
          )}
          {/* Results dropdown, only if openSearch and query */}
          {openSearch && query && (
            <div className='absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-[var(--selago)] z-[9999] max-h-96 overflow-y-auto p-3'>
              {searchResults.length > 0 ? (
                searchResults.map((r) => (
                  <button
                    key={r.key}
                    type='button'
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onPickResult(r)}
                    className='w-full text-left px-4 py-3 hover:bg-[var(--selago)] transition-all rounded-lg'
                  >
                    <div className='responsiveText font-medium text-[var(--port-gore)]'>{r.title}</div>
                    <div className='responsiveText text-[var(--regent-gray)] truncate'>{r.subtitle}</div>
                  </button>
                ))
              ) : (
                <div className='responsiveText text-[var(--regent-gray)] px-4 py-2'>No results</div>
              )}
            </div>
          )}
        </div>

        <Tltip tltpText={getTtl('Ask question', ln) || 'Ask question'} direction='bottom'>
        <button
          className='flex items-center justify-center w-10 h-10'
          onClick={() => {
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ims:openChat'))
          }}
          aria-label='Ask question'
        >
          <img src='/logo/Ai bot.svg' alt='Chatbot' className='w-5 h-5' />
        </button>
        </Tltip>
        {/* Notification Icon (placeholder, can be made functional) */}
        <Tltip tltpText={getTtl('Notifications', ln) || 'Notifications'} direction='bottom'>
        <button
          className='flex items-center justify-center w-10 h-10'
          aria-label='Notifications'
        >
          <img src='/logo/notofication.svg' alt='Notifications' className='w-5 h-5' />
        </button>
        </Tltip>
        {/* Logout Icon */}
        <Tltip tltpText={getTtl('Logout', ln) || 'Logout'} direction='bottom'>
        <button
          className='flex items-center justify-center w-10 h-10'
          onClick={LogOut}
          aria-label='Logout'
        >
          <img src='/logo/logout.svg' alt='Logout' className='w-5 h-5' />
        </button>
        </Tltip>
        {/* User Role Button and Profile Icon: no gap between */}
        <div className="flex items-center ml-2">
          <span
            className="inline-flex items-center px-3 py-2 rounded-md bg-[var(--endeavour)] text-white responsiveText font-medium shadow-md"
            style={{
              minWidth: 60,
              justifyContent: 'center',
              marginRight: 0,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0
            }}
          >
            {user?.displayName || user?.email?.split('@')[0] || 'User'}
          </span>
          <div className='relative' ref={dropdownRef} style={{marginLeft: 0}}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className='flex items-center bg-white gap-2 p-1 rounded-md hover:bg-[var(--selago)] transition-all'
              aria-label='User menu'
            >
              <div className='w-6  flex items-center justify-center text-white overflow-hidden'>
                <img src="/logo/person.svg" alt="Profile" className="w-6 h-6 inline-block align-middle" />
              </div>
            </button>
            {showDropdown && (
              <div className='absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-[var(--selago)] py-2 z-[9999] overflow-visible'>
                <div className='px-4 py-3 border-b border-[var(--selago)]'>
                  <p className='responsiveText font-medium text-[var(--port-gore)]'>
                    {user?.displayName || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className='responsiveText text-[var(--regent-gray)] truncate'>{user?.email || ''}</p>
                </div>
                <div className='py-1'>
                  <button
                    onClick={() => {
                      router.push('/settings')
                      setShowDropdown(false)
                    }}
                    className='w-full flex items-center gap-3 px-4 py-2.5 responsiveText text-[var(--port-gore)] hover:bg-[var(--selago)] hover:text-[var(--endeavour)] transition-all'
                  >
                    <img src='/logo/Settings.svg' alt='Settings' className='w-4 h-4 mr-2' />
                    {getTtl('Settings', ln) || 'Settings'}
                  </button>
                  <button
                    onClick={LogOut}
                    className='w-full flex items-center gap-3 px-4 py-2.5 responsiveText text-red-500 hover:bg-red-50 transition-all'
                  >
                    <img src='/logo/logout.svg' alt='Logout' className='w-4 h-4 mr-2' />
                    {getTtl('Logout', ln) || 'Logout'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Date / Time Widget — far right */}
        {now && (
          <div className='flex flex-col items-end leading-tight select-none pointer-events-none pl-4 ml-4 border-l border-[#b8ddf8]'>
            <span style={{ fontSize: '0.62rem', color: 'var(--chathams-blue)', fontWeight: 400, opacity: 0.7 }}>
              {now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--chathams-blue)', fontWeight: 600, letterSpacing: '0.05em' }}>
              {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}