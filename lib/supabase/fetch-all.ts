// PostgREST caps every response at Supabase's max-rows setting (1000 by
// default) and silently drops the rest, so whole-table reads (admin views,
// CSV exports) page through with range(). The query must have a stable
// .order() so pages don't overlap or skip rows.
const PAGE_SIZE = 1000;

type Page<T> = PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
}>;

export async function fetchAllRows<T>(
  page: (from: number, to: number) => Page<T>,
): Promise<
  { data: T[]; error: null } | { data: null; error: { message: string } }
> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null };
  }
}
