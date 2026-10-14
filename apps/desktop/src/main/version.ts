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

/** Última release publicada (rascunhos e pré-releases ficam de fora). */
export const LATEST_RELEASE_URL =
  'https://api.github.com/repos/TrindadeThiago/screen-share/releases/latest';

/** Consulta a release mais recente no GitHub; qualquer falha retorna null (silenciosa). */
export async function checkForUpdate(
  current: string,
  fetchFn: typeof fetch = fetch,
  releaseUrl = LATEST_RELEASE_URL,
): Promise<UpdateInfo | null> {
  try {
    const res = await fetchFn(releaseUrl, {
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': `ScreenShare/${current}`,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { tag_name?: unknown; html_url?: unknown };
    if (typeof data.tag_name !== 'string' || typeof data.html_url !== 'string') return null;
    if (!isAllowedExternalUrl(data.html_url, ['github.com'])) return null;
    const latest = data.tag_name.replace(/^v/, '');
    return compareSemver(latest, current) > 0 ? { latest, downloadUrl: data.html_url } : null;
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
