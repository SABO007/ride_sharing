import 'zone.js/node';
import { APP_BASE_HREF } from '@angular/common';
import { renderApplication } from '@angular/platform-server';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { provideClientHydration } from '@angular/platform-browser';
import { ApplicationConfig } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';

const app = express();
const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.html');

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch()),
    { provide: APP_BASE_HREF, useValue: '/' }
  ]
};

// Serve static files from /browser
app.use(express.static(browserDistFolder, {
  maxAge: '1y'
}));

// Create a request handler for SSR
export const reqHandler = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  // Add timeout configuration
  const timeout = 30000; // 30 seconds
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('SSR Timeout')), timeout);
  });

  Promise.race([
    renderApplication(
      () => bootstrapApplication(AppComponent, appConfig),
      {
        document: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        platformProviders: [
          { provide: APP_BASE_HREF, useValue: baseUrl },
        ]
      }
    ),
    timeoutPromise
  ])
    .then((html: unknown) => res.send(html as string))
    .catch((err: Error) => {
      console.error('SSR Error:', err);
      // Fallback to client-side rendering if SSR fails
      res.sendFile(join(browserDistFolder, 'index.html'));
    });
};

// Use the request handler for all routes
app.get('*', reqHandler);

export default app; 