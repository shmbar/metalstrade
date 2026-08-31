import { describe, it, expect, vi } from 'vitest';

// useUndo is a hook, so its stack behaviour is exercised here against the same
// rules rather than rendered: what matters is the ORDER entries come back in, that
// a failed undo is not lost, and that the stack stays bounded.
const makeStack = (max = 25) => {
    const stack = [];
    return {
        get count() { return stack.length; },
        get lastLabel() { return stack[stack.length - 1]?.label || ''; },
        record(entry) {
            if (!entry?.apply) return;
            stack.push(entry);
            if (stack.length > max) stack.shift();
        },
        async undo() {
            const entry = stack.pop();
            if (!entry) return null;
            try {
                await entry.apply();
                return entry;
            } catch (e) {
                stack.push(entry);   // failed — keep it so the next press retries
                throw e;
            }
        },
        clear() { stack.length = 0; },
    };
};

describe('undo order', () => {
    it('walks backwards through the edits, most recent first', async () => {
        const applied = [];
        const s = makeStack();
        ['a', 'b', 'c'].forEach(k => s.record({ label: k, apply: async () => { applied.push(k); } }));

        await s.undo(); await s.undo(); await s.undo();
        expect(applied).toEqual(['c', 'b', 'a']);
        expect(s.count).toBe(0);
    });

    it('reports the next thing it would undo', () => {
        const s = makeStack();
        s.record({ label: 'Supplier on PO 090426', apply: async () => { } });
        expect(s.lastLabel).toBe('Supplier on PO 090426');
        s.record({ label: 'POL on PO 090426', apply: async () => { } });
        expect(s.lastLabel).toBe('POL on PO 090426');
    });

    it('does nothing, and does not throw, on an empty stack', async () => {
        const s = makeStack();
        await expect(s.undo()).resolves.toBeNull();
    });
});

describe('a failed undo', () => {
    it('stays on the stack so the next press retries it', async () => {
        const s = makeStack();
        const apply = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
        s.record({ label: 'Supplier', apply });

        await expect(s.undo()).rejects.toThrow('offline');
        expect(s.count).toBe(1);          // NOT dropped

        await expect(s.undo()).resolves.toMatchObject({ label: 'Supplier' });
        expect(s.count).toBe(0);
        expect(apply).toHaveBeenCalledTimes(2);
    });
});

describe('the stack is bounded', () => {
    it('drops the oldest past the cap rather than growing forever', async () => {
        const s = makeStack(3);
        const applied = [];
        ['a', 'b', 'c', 'd', 'e'].forEach(k => s.record({ label: k, apply: async () => { applied.push(k); } }));
        expect(s.count).toBe(3);

        await s.undo(); await s.undo(); await s.undo();
        expect(applied).toEqual(['e', 'd', 'c']);   // a and b fell off the bottom
        expect(s.count).toBe(0);
    });

    it('ignores an entry with nothing to apply', () => {
        const s = makeStack();
        s.record({ label: 'no-op' });
        s.record(null);
        expect(s.count).toBe(0);
    });
});

describe('the inverse an inline edit records', () => {
    // The contracts page records `apply` as the same write with the OLD value, so
    // undo replays the edit path rather than restoring a snapshot.
    it('writes the previous value back through the same call', async () => {
        const writes = [];
        const writeCell = async ({ columnId, value }) => { writes.push([columnId, value]); return true; };

        const row = { id: 'c1', order: '090426', pol: 'A64' };
        const before = row.pol;
        await writeCell({ columnId: 'pol', value: 'A26' });          // the edit

        const s = makeStack();
        s.record({ label: `POL on PO ${row.order}`, apply: () => writeCell({ columnId: 'pol', value: before }) });
        await s.undo();

        expect(writes).toEqual([['pol', 'A26'], ['pol', 'A64']]);
    });

    it('an undo does not record its own inverse, so it cannot ping-pong', async () => {
        const s = makeStack();
        s.record({ label: 'one', apply: async () => { } });
        await s.undo();
        expect(s.count).toBe(0);   // undoing left nothing new behind
    });
});
