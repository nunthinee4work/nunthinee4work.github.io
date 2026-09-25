import { AccessUtils } from './access.utils';

describe('AccessUtils', () => {
  describe('fetchIdentity', () => {
    it('returns email and name from the Access identity endpoint', async () => {
      spyOn(window, 'fetch').and.resolveTo(new Response(
        JSON.stringify({ email: 'someone@tdshop.io', name: 'Some One', idp: { type: 'onetimepin' } }),
        { headers: { 'content-type': 'application/json' } }));
      expect(await AccessUtils.fetchIdentity()).toEqual({ email: 'someone@tdshop.io', name: 'Some One' });
      expect(window.fetch).toHaveBeenCalledWith('/cdn-cgi/access/get-identity', jasmine.anything());
    });

    it('returns null when not behind Access (dev server answers with index.html)', async () => {
      spyOn(window, 'fetch').and.resolveTo(new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } }));
      expect(await AccessUtils.fetchIdentity()).toBeNull();
    });

    it('returns null on 404 or network error', async () => {
      const fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response('', { status: 404 }));
      expect(await AccessUtils.fetchIdentity()).toBeNull();
      fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));
      expect(await AccessUtils.fetchIdentity()).toBeNull();
    });
  });

  describe('isChunkLoadError', () => {
    it('recognises @defer loading failures and failed module imports', () => {
      expect(AccessUtils.isChunkLoadError({ code: -750, message: 'NG0750' })).toBeTrue();
      expect(AccessUtils.isChunkLoadError(new Error('NG0750: Loading dependencies for `@defer` block failed'))).toBeTrue();
      expect(AccessUtils.isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: /chunk-ABC.js'))).toBeTrue();
      expect(AccessUtils.isChunkLoadError(new TypeError('Importing a module script failed.'))).toBeTrue();
    });

    it('ignores ordinary errors', () => {
      expect(AccessUtils.isChunkLoadError(new Error('Cannot read properties of undefined'))).toBeFalse();
      expect(AccessUtils.isChunkLoadError(null)).toBeFalse();
    });
  });

  describe('reloadAfterChunkError', () => {
    afterEach(() => sessionStorage.removeItem('app.chunkReloadAt'));

    it('does not reload again within the cooldown (no reload loop)', () => {
      sessionStorage.setItem('app.chunkReloadAt', String(1_000_000));
      expect(AccessUtils.reloadAfterChunkError(1_000_000 + 5_000)).toBeFalse();
    });
  });
});
