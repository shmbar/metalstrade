import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cachedLoad, cacheKey, bustLoadCache } from '../loadCache.js';

beforeEach(() => bustLoadCache());

describe('cacheKey', () => {
    it('joins parts and tolerates null/undefined', () => {
        expect(cacheKey('a', 'b', 1)).toBe('a§b§1');
        expect(cacheKey('a', null, undefined)).toBe('a§§');
    });
});

describe('cachedLoad', () => {
    it('fetches once within TTL for the same key', async () => {
        const fetcher = vi.fn(async () => [1, 2, 3]);
        const a = await cachedLoad('k1', fetcher);
        const b = await cachedLoad('k1', fetcher);
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(a).toEqual([1, 2, 3]);
        expect(b).toEqual([1, 2, 3]);
    });

    it('returns a fresh array copy per consumer (no shared reference)', async () => {
        const a = await cachedLoad('k2', async () => [{ x: 1 }]);
        const b = await cachedLoad('k2', async () => [{ x: 1 }]);
        expect(a).not.toBe(b);
        a.push({ x: 99 }); // consumer mutating its copy must not leak into the cache
        const c = await cachedLoad('k2', async () => []);
        expect(c).toHaveLength(1);
    });

    it('different keys fetch independently', async () => {
        const f1 = vi.fn(async () => ['a']);
        const f2 = vi.fn(async () => ['b']);
        await cachedLoad('k3', f1);
        await cachedLoad('k4', f2);
        expect(f1).toHaveBeenCalledTimes(1);
        expect(f2).toHaveBeenCalledTimes(1);
    });

    it('shares one in-flight request between concurrent callers', async () => {
        let resolve;
        const fetcher = vi.fn(() => new Promise(r => { resolve = r; }));
        const p1 = cachedLoad('k5', fetcher);
        const p2 = cachedLoad('k5', fetcher);
        await Promise.resolve(); // fetcher runs on a microtask — let it start
        resolve([7]);
        expect(await p1).toEqual([7]);
        expect(await p2).toEqual([7]);
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('bustLoadCache forces a refetch (the write-invalidation path)', async () => {
        const fetcher = vi.fn(async () => ['v1']);
        await cachedLoad('k6', fetcher);
        bustLoadCache();
        const fetcher2 = vi.fn(async () => ['v2']);
        expect(await cachedLoad('k6', fetcher2)).toEqual(['v2']);
        expect(fetcher2).toHaveBeenCalledTimes(1);
    });

    it('never caches a failure', async () => {
        const bad = vi.fn(async () => { throw new Error('net'); });
        await expect(cachedLoad('k7', bad)).rejects.toThrow('net');
        const good = vi.fn(async () => ['ok']);
        expect(await cachedLoad('k7', good)).toEqual(['ok']); // refetches, no poisoned entry
    });

    it('expires after the TTL', async () => {
        vi.useFakeTimers();
        const f1 = vi.fn(async () => ['old']);
        await cachedLoad('k8', f1);
        vi.setSystemTime(Date.now() + 46_000);
        const f2 = vi.fn(async () => ['new']);
        expect(await cachedLoad('k8', f2)).toEqual(['new']);
        vi.useRealTimers();
    });
});
