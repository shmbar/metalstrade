import { Fragment, useContext, useState, useRef, useEffect } from 'react'
import { useGlobalSearch } from '../../../contexts/useGlobalSearchContext'
import imsLogo from '../../../public/logo/logoNew.svg';
import Image from 'next/image'
import { LogOut as LogOutIcon, Search, Settings as SettingsIcon, Menu as MenuIcon } from 'lucide-react';
import { UserAuth } from "../../../contexts/useAuthContext";
import { useRouter } from "next/navigation";
import { Menu, MenuButton, Transition, MenuItems } from '@headlessui/react'
import { sideBar } from '../../../components/const'
import Link from 'next/link'
import { usePathname } from 'next/navigation';
import CompanySelect from './companySelect';
import NotificationBell from '@components/NotificationBell';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import { getTtl } from "../../../utils/languages";

const SideBarMini = () => {
  const pathName = usePathname();
  const router = useRouter();
  const { SignOut, user, userTitle, gisAccount, can } = UserAuth();
  const { setDates, compData } = useContext(SettingsContext);
  const ln = compData?.lng || 'English';
  const placeholderText = getTtl('Search anything...', ln) || 'Search...';
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);
  const { query, setQuery, items } = useGlobalSearch();
  const [showDropdown, setShowDropdown] = useState(false);

  const LogOut = async () => {
    router.push("/");
    await SignOut();
  }


  // Close dropdown/search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedQuery = (query || '').trim().toLowerCase();
  const searchResults =
    normalizedQuery.length < 2
      ? []
      : items
          .filter((x) => (x.searchText || '').toLowerCase().includes(normalizedQuery))
          .slice(0, 10);

  const onPickResult = (item) => {
    setSearchOpen(false);
    setShowDropdown(false);
    setQuery('');
    router.push(`${item.route}?focus=${encodeURIComponent(item.rowId)}`);
  };

  // Observe MenuItems presence and dispatch open/close events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let prev = !!document.querySelector('[data-ims-sidebar]');

    const dispatchState = (isOpen) => {
      window.dispatchEvent(new CustomEvent('ims:menuToggle', { detail: { isOpen } }));
    };

    // dispatch initial state
    dispatchState(prev);

    const observer = new MutationObserver(() => {
      const current = !!document.querySelector('[data-ims-sidebar]');
      if (current !== prev) {
        prev = current;
        dispatchState(current);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return (
    <nav className="w-full h-14 flex items-center bg-[var(--bg-card)] border-b border-[var(--line)]" style={{ boxShadow: 'var(--shadow-xs)' }}>
      <div className='flex w-full justify-between items-center'>
        {/* Logo and Search Icon */}
        <div className='flex items-center'>
          <div className='p-2'>
            <Image
              src={imsLogo}
              className='overflow-hidden transition-all w-12'
              alt="IMS Logo"
              priority
            />
          </div>
          <div className='relative' ref={searchRef}>
            <Search
              size={20} strokeWidth={1.75}
              className="text-[var(--ink-secondary)] cursor-pointer ml-4"
              onClick={() => {
                setSearchOpen((v) => !v);
                setShowDropdown(true);
              }}
            />
            {searchOpen && (
              <div className="absolute top-12 left-0 w-72 z-appbar responsiveText">
                <input
                  type="text"
                  placeholder={placeholderText}
                  aria-label={placeholderText}
                  value={query}
                  onFocus={() => setShowDropdown(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  className="w-full pl-4 pr-10 py-2.5 rounded-control bg-[var(--bg-subtle)] border border-[var(--line)] focus:border-[var(--brand)] focus:bg-[var(--bg-card)] focus:outline-none focus:ring-[3px] focus:ring-[var(--brand-soft)] placeholder:text-[var(--ink-muted)] transition-all"
                  style={{ fontSize: 'inherit', color: 'var(--ink)' }}
                />
                {/* Search Dropdown */}
                {showDropdown && searchResults.length > 0 && (
                  <div className='absolute left-0 right-0 mt-2 bg-[var(--bg-card)] rounded-2xl border border-[var(--line)] z-dropdown overflow-auto max-h-80 w-full min-w-[16rem]' style={{ boxShadow: 'var(--shadow-md)' }}>
                    {searchResults.map((r) => (
                      <button
                        key={r.key}
                        type='button'
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onPickResult(r)}
                        className='w-full text-left px-4 py-3 hover:bg-[var(--bg-subtle)] transition-all flex flex-col items-start'
                      >
                        <div className='responsiveText font-medium text-[var(--ink)] break-words'>{r.title}</div>
                        <div className='responsiveText text-[var(--ink-muted)] truncate w-full'>{r.subtitle}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>


           <div className='flex items-center gap-1'>
           <NotificationBell />
           <Menu as="div" className="relative inline-block text-left">
            {({ close }) => (
              <>
                <div className='flex h-full'>
                  <MenuButton className="flex items-center justify-center px-4 text-[var(--ink-secondary)] focus:outline-none">
                    <MenuIcon size={20} strokeWidth={1.75} />
                  </MenuButton>
                </div>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                <MenuItems
  data-ims-sidebar="1"
  className="fixed right-2 top-14 w-76 origin-top-left divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] focus:outline-none h-[450px] overflow-auto z-dropdown"
  style={{ boxShadow: 'var(--shadow-md)' }}
>
  <div className='px-4 py-3 border-b border-[var(--line)]'>
    <p className='responsiveText font-medium text-[var(--ink)]'>
      {user?.displayName || user?.email?.split('@')[0] || 'User'}
    </p>
    <p className='responsiveText text-[var(--ink-muted)] truncate'>{user?.email || ''}</p>
  </div>
  <ul className="flex-1 divide-[var(--line)] divide-y">
    {sideBar(userTitle, gisAccount, can).map((x, i) => (
      <div key={i} className="py-2">
        {x.ttl && (
          <div className='font-semibold uppercase text-[var(--ink-muted)] px-4 pb-2 pt-3' style={{letterSpacing: '0.06em', fontSize: 'var(--fs-table)'}}>
            {getTtl(x.ttl, ln)}
          </div>
        )}
        <div>
          {x.items.map((y, k) => {
            const isActive = pathName.slice(1) === y.page;
            if (y.hasDropdown && y.subItems && y.subItems.length > 0) {
              return (
                <div key={k}>
                  <div className="">
                    {y.subItems.map((sub, subIdx) => {
                      const isSubActive = pathName.slice(1) === sub.page;
                      return (
                        <Link href={`/${sub.page}`} key={subIdx} onClick={e => { close(); }}>
                          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150 responsiveText mt-1
                            ${isSubActive
                              ? 'bg-[var(--brand-soft)] text-[var(--brand)] font-medium'
                              : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]'}`}
                          >
                            <span>{sub.img}</span>
                            <span className="responsiveText whitespace-nowrap font-normal">{getTtl(sub.item, ln)}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }
            // Otherwise, render as normal link
            return (
              <Link href={`/${y.page}`} key={k} onClick={e => { close(); }}>
                <div className="flex px-2 py-1 responsiveText items-center">
                  <div className={`gap-3 w-full flex items-center px-3 py-2 rounded-2xl transition-all duration-150
                    ${isActive
                      ? 'bg-[var(--brand-soft)] text-[var(--brand)] font-medium'
                      : 'text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]'}`}>
                    <span className="transition-colors">{y.img}</span>
                    <span className="responsiveText whitespace-nowrap font-normal">{getTtl(y.item, ln)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    ))}

  </ul>
  <div className='py-2'>
    <Link href='/settings' onClick={e => close()}>
      <div className="flex px-2 py-1 responsiveText items-center">
        <div className="gap-3 w-full flex items-center px-3 py-2 rounded-2xl transition-all duration-150 text-[var(--ink-secondary)] hover:bg-[var(--bg-subtle)]">
          <SettingsIcon size={16} strokeWidth={1.75} />
          <span className='responsiveText font-normal'>{getTtl('Settings', ln)}</span>
        </div>
      </div>
    </Link>
  </div>
  <div className='py-2'>
    <div className="flex px-2 py-1 responsiveText items-center cursor-pointer" onClick={() => { LogOut(); close(); }}>
      <div className="gap-3 w-full flex items-center px-3 py-2 rounded-2xl transition-all duration-150 text-[var(--bad-text)] hover:bg-[var(--bad-bg)]">
        <LogOutIcon size={16} strokeWidth={1.75} />
        <span className='responsiveText font-normal'>{getTtl('Logout', ln)}</span>
      </div>
    </div>
  </div>
</MenuItems>
            </Transition>
          </>
            )}
          </Menu>
          </div>
      </div>
    </nav>
  )
}

export default SideBarMini

