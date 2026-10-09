import type { UpdateInfo } from '../shared';

function parse(v: string) {
  const [core = '', pre] = v.trim().replace(/^v/, '').split('-', 2);
  const nums = core.split('.').map((n) => parseInt(n, 10) || 0);
  while (nums.length < 3) nums.push(0);
  return { nums, pre };
}

/** Retorna >0 se a > b, <0 se a < b, 0 se iguais. Pré-release é menor que a versão final. */
export function compareSemver(a: string, b: string): number {
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const d = pa.nums[i]! - pb.nums[i]!;
    if (d !== 0) return d;
  }
  if (pa.pre && !pb.pre) return -1;
  if (!pa.pre && pb.pre) return 1;
  return 0;
}

/** Consulta a versão mais recente; qualquer falha retorna null (silenciosa). */
export async function checkForUpdate(
  current: string,
  versionUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<UpdateInfo | null> {
  try {
    const res = await fetchFn(versionUrl);
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<UpdateInfo>;
    if (typeof data.latest !== 'string' || typeof data.downloadUrl !== 'string') return null;
    return compareSemver(data.latest, current) > 0
      ? { latest: data.latest, downloadUrl: data.downloadUrl }
      : null;
  } catch {
    return null;
  }
}

/** Só https e hosts permitidos podem ser abertos externamente. */
export function isAllowedExternalUrl(url: string, allowedHosts: string[]): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && allowedHosts.includes(u.hostname);
  } catch {
    return false;
  }
}
