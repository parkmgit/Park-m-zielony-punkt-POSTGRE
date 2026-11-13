// Shared server-side geocoding cache and rate limiter for both Trees views.
export type ProvinceResult = { status: 'resolved' | 'unresolved' | 'error'; province: string | null };
const cache = new Map<string, ProvinceResult>();
const pending = new Map<string, Promise<ProvinceResult>>();
let queue: Promise<void> = Promise.resolve();
let lastRequest = 0;
const aliases: Record<string, string> = {
  'dolnośląskie':'Dolnośląskie','kujawsko-pomorskie':'Kujawsko-pomorskie','lubelskie':'Lubelskie',
  'lubuskie':'Lubuskie','łódzkie':'Łódzkie','małopolskie':'Małopolskie','mazowieckie':'Mazowieckie',
  'opolskie':'Opolskie','podkarpackie':'Podkarpackie','podlaskie':'Podlaskie','pomorskie':'Pomorskie',
  'śląskie':'Śląskie','świętokrzyskie':'Świętokrzyskie','warmińsko-mazurskie':'Warmińsko-mazurskie',
  'wielkopolskie':'Wielkopolskie','zachodniopomorskie':'Zachodniopomorskie',
};
export function coordinateKey(lat: number, lon: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 || (lat === 0 && lon === 0)) return null;
  return `${lat.toFixed(5)},${lon.toFixed(5)}`;
}
function resolve(key: string): Promise<ProvinceResult> {
  const existing = cache.get(key);
  if (existing) return Promise.resolve(existing);
  const running = pending.get(key);
  if (running) return running;
  const job = queue.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastRequest));
    if (wait) await new Promise(r => setTimeout(r, wait));
    lastRequest = Date.now();
    try {
      const [lat, lon] = key.split(',');
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.search = new URLSearchParams({ format:'jsonv2', lat, lon, zoom:'5', addressdetails:'1', 'accept-language':'pl' }).toString();
      const response = await fetch(url, { headers: { 'User-Agent': 'Park-M-Trees/1.0 (province lookup)' }, signal: AbortSignal.timeout(12000) });
      if (!response.ok) return { status:'error', province:null } as ProvinceResult;
      const data = await response.json();
      const raw = String(data?.address?.state || '').toLowerCase().replace(/^wojew[oó]dztwo\s+/, '').trim();
      const province = aliases[raw] || null;
      const result: ProvinceResult = { status: province ? 'resolved' : 'unresolved', province };
      cache.set(key, result);
      return result;
    } catch {
      // Do not cache failures/rate limits as genuine unknown provinces.
      return { status:'error', province:null } as ProvinceResult;
    }
  });
  // Keep the queue alive after any unexpected rejection.
  queue = job.then(() => undefined, () => undefined);
  pending.set(key, job);
  void job.finally(() => pending.delete(key));
  return job;
}
export async function lookupProvinces(keys: string[]): Promise<Record<string, ProvinceResult>> {
  const unique = [...new Set(keys)].slice(0, 1000);
  const results = await Promise.all(unique.map(async key => [key, await resolve(key)] as const));
  return Object.fromEntries(results);
}
