export type ProvinceLookup = { status: 'resolved' | 'unresolved' | 'error'; province: string | null };
export function provinceKey(lat: number, lon: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 || (lat === 0 && lon === 0)) return null;
  return `${lat.toFixed(5)},${lon.toFixed(5)}`;
}
const cached = new Map<string, ProvinceLookup>();
const inflight = new Map<string, Promise<ProvinceLookup>>();
export async function getProvinces(coordinates: Array<[number, number]>): Promise<Record<string, ProvinceLookup>> {
  const unique = new Map<string, [number, number]>();
  coordinates.forEach(pair => { const key = provinceKey(...pair); if (key) unique.set(key, pair); });
  const missing = [...unique].filter(([key]) => !cached.has(key) && !inflight.has(key));
  // Smaller batches make progress visible without waiting for every location.
  for (let i = 0; i < missing.length; i += 15) {
    const batch = missing.slice(i, i + 15);
    const promise = fetch('/api/provinces', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ coordinates: batch.map(([, pair]) => pair) }) })
      .then(async res => { if (!res.ok) throw new Error('Province lookup failed'); return (await res.json()).results as Record<string, ProvinceLookup>; });
    batch.forEach(([key]) => {
      const item = promise.then(results => results[key] || { status:'error', province:null }).catch(() => ({ status:'error', province:null } as ProvinceLookup));
      inflight.set(key, item);
      void item.then(value => { if (value.status !== 'error') cached.set(key, value); }).finally(() => inflight.delete(key));
    });
  }
  const results = await Promise.all([...unique.keys()].map(async key => [key, cached.get(key) || await inflight.get(key) || { status:'error', province:null }] as const));
  return Object.fromEntries(results);
}
