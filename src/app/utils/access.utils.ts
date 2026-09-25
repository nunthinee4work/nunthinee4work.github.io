/**
 * Cloudflare Access helpers. The deployed site sits behind Cloudflare Access (login limited to
 * @tdshop.io), which serves /cdn-cgi/access/* on the same origin. Locally (ng serve) those paths
 * don't exist, so everything here degrades to "no identity".
 */
export interface AccessIdentity {
  email: string;
  name?: string;
}

export class AccessUtils {
  static readonly IDENTITY_URL = '/cdn-cgi/access/get-identity';
  static readonly LOGOUT_URL = '/cdn-cgi/access/logout';

  /** sessionStorage key: last time a failed chunk load triggered a reload (guards against reload loops) */
  private static readonly RELOAD_KEY = 'app.chunkReloadAt';
  private static readonly RELOAD_COOLDOWN_MS = 30_000;

  /** The signed-in user's email / name, or null when not behind Access (e.g. localhost). */
  static async fetchIdentity(): Promise<AccessIdentity | null> {
    try {
      const response = await fetch(AccessUtils.IDENTITY_URL, { credentials: 'same-origin' });
      if (!response.ok || !response.headers.get('content-type')?.includes('json')) return null;
      const body = await response.json();
      return typeof body?.email === 'string' ? { email: body.email, name: body.name || undefined } : null;
    } catch {
      return null;
    }
  }

  /**
   * A lazy tool chunk failed to load. Behind Access this usually means the session expired:
   * the chunk request is redirected to the login page, so the module import fails.
   * Angular reports `@defer` failures as NG0750 (message stripped in production builds).
   */
  static isChunkLoadError(error: unknown): boolean {
    const err = error as { code?: number; message?: string } | null;
    if (err?.code === -750) return true;
    const message = String(err?.message ?? error ?? '');
    return /NG0?750|Loading dependencies for `@defer` block failed|dynamically imported module|Importing a module script failed|ChunkLoadError/i
      .test(message);
  }

  /** Reloads the page (which goes through Access login again) at most once per cooldown window. */
  static reloadAfterChunkError(now = Date.now()): boolean {
    try {
      const last = Number(sessionStorage.getItem(AccessUtils.RELOAD_KEY) ?? 0);
      if (now - last < AccessUtils.RELOAD_COOLDOWN_MS) return false;
      sessionStorage.setItem(AccessUtils.RELOAD_KEY, String(now));
    } catch {
      return false; // no sessionStorage -> can't guard against a loop, so don't reload
    }
    location.reload();
    return true;
  }
}
