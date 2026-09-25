import 'zone.js';
import { ErrorHandler } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { ChunkReloadErrorHandler } from './app/chunk-reload-error-handler';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';

bootstrapApplication(App, {
  providers: [
    provideAnimations(),
    provideToastr({ positionClass: 'toast-top-right' }),
    { provide: ErrorHandler, useClass: ChunkReloadErrorHandler },
  ]
}).catch(err => console.error(err));