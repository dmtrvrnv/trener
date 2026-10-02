import { lazy, StrictMode, Suspense, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { App } from './app/App';
import { DevSheet } from './anim/DevSheet';

const widgetLoader = Object.values(import.meta.glob('./widget/Widget.tsx'))[0];
const Widget = widgetLoader ? lazy(widgetLoader as () => Promise<{ default: ComponentType }>) : null;

const isWidget = window.location.hash.startsWith('#/widget');
if (isWidget) document.documentElement.dataset.surface = 'widget';
// платформа из preload Electron: на macOS рельс уходит ниже кнопок окна
const platform = (window as unknown as { trener?: { platform?: string } }).trener?.platform;
if (platform) document.documentElement.dataset.platform = platform;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {window.location.hash === '#/dev' ? <DevSheet /> : isWidget ? (
      <Suspense fallback={null}>{Widget ? <Widget /> : null}</Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
