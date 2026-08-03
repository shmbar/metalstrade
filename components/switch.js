import { Switch } from '@headlessui/react'

const Switcher = ({ enabled, setEnabled }) => {

    return (
            <Switch
                checked={enabled}
                onChange={setEnabled}
                className={`${enabled ? 'bg-[var(--endeavour)]' : 'bg-[var(--border-divider)]'}
          relative inline-flex h-7 w-[64px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
            >
                <span className="sr-only">Use setting</span>
                <span
                    aria-hidden="true"
                    className={`${enabled ? 'translate-x-9' : 'translate-x-0'}
            pointer-events-none inline-block h-6 w-[24px] transform rounded-full bg-[var(--surface-card)] shadow-lg ring-0 transition duration-200 ease-in-out`}
                />
            </Switch>

    )
}

export default Switcher
