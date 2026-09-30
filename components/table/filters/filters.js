import Tltip from '../../../components/tlTip';
import { getTtl } from '../../../utils/languages';
import Image from 'next/image';
import { Filter } from "lucide-react";

const Filters = (ln, filterOn, setFilterOn) => {
    const setFilter = () => {
        setFilterOn(!filterOn);
    };

    return (
        <div>
            <Tltip direction='bottom' tltpText={getTtl('Filters', ln)}>
                {/* Same look as its neighbours on the table toolbar (Edit, chat, Columns,
                    Excel): the violet --endeavour glyph, the --selago hover, and — like the
                    Edit toggle — the --selago fill while it is switched on. It was navy
                    (--chathams-blue) with a drop-shadow hover, the one icon in the row that
                    did not match (client, 2026-09-30). */}
                <button
                    onClick={setFilter}
                    aria-pressed={!!filterOn}
                    className={`group text-[var(--endeavour)] justify-center w-8 h-8 inline-flex items-center responsiveTextTitle rounded hover:bg-[var(--selago)] focus:outline-none transition-colors ${filterOn ? 'bg-[var(--selago)]' : ''}`}
                >
                    <Filter className="w-4 h-4" strokeWidth={2} />
                </button>
            </Tltip>
        </div>
    );
};

export default Filters;
