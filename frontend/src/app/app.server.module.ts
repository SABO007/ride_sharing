import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { bootstrapApplication } from '@angular/platform-browser';

@NgModule({
  imports: [
    ServerModule,
    AppComponent
  ],
  providers: [
    provideRouter(routes)
  ]
})
export class AppServerModule {
  static bootstrap = () => bootstrapApplication(AppComponent, {
    providers: [
      provideRouter(routes)
    ]
  });
} 