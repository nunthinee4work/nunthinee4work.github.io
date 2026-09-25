import { ErrorHandler, Injectable } from '@angular/core';
import { AccessUtils } from './utils/access.utils';

/** Reloads the page when a lazy tool chunk fails to load (e.g. Access session expired); logs everything else. */
@Injectable()
export class ChunkReloadErrorHandler extends ErrorHandler {
  override handleError(error: unknown): void {
    if (AccessUtils.isChunkLoadError(error) && AccessUtils.reloadAfterChunkError()) return;
    super.handleError(error);
  }
}
