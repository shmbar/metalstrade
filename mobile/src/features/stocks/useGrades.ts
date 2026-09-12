import { useQuery } from '@tanstack/react-query';
import { buildGradeIndex, GradeIndex } from '@shared/grades';
import { loadGrades } from '@/data/firestore';

const EMPTY = buildGradeIndex([]);

/**
 * The declared grade registry, as an index keyed by spelling and by PO line.
 *
 * Web keeps a live Firestore subscription (hooks/useGrades.js) because the Stocks
 * table mounts a consumer per row and an edit on IMS must show on GIS without a
 * reload. Mobile is read-only on grades — they are declared and merged on the web
 * app — so one cached query per session is enough, refreshed with everything else
 * on pull-to-refresh.
 *
 * A failure (signed out, no access) resolves to an EMPTY index rather than an error:
 * material without a declared grade is a valid state everywhere, and the summary
 * simply falls back to folding by spelling.
 */
export function useGrades(): { index: GradeIndex; ready: boolean } {
  const { data, isSuccess } = useQuery({
    queryKey: ['grades'],
    queryFn: loadGrades,
    staleTime: 5 * 60_000,
    retry: 1,
    // The registry is small (a few dozen documents) and shared by every workspace.
    gcTime: 60 * 60_000,
  });
  return { index: data ? buildGradeIndex(data) : EMPTY, ready: isSuccess };
}
