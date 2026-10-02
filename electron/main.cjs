const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, shell, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
let mainWindow, widgetWindow, tray, quitting = false;
let preferences = { widget: true, alwaysOnTop: true };
const loginOptions = { path: process.execPath, args: ['--hidden'] };
const devURL = !app.isPackaged && process.env.VITE_DEV_SERVER_URL;
const preferencesFile = () => path.join(app.getPath('userData'), 'desktop.json');
function savePreferences() { try { fs.writeFileSync(preferencesFile(), JSON.stringify(preferences)); } catch (error) { console.error('Desktop preferences:', error.message); } }
function load(window, hash = '/today') {
  return devURL ? window.loadURL(`${devURL}/#${hash}`) : window.loadFile(path.join(__dirname, '../dist/index.html'), { hash });
}
function secure(window) {
  window.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  window.webContents.on('will-navigate', (event, url) => { const current = window.webContents.getURL().split('#')[0]; if (url.split('#')[0] !== current) event.preventDefault(); });
}
function openMain(route) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    const titleBar = process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 18, y: 14 } } : { titleBarStyle: 'hidden', titleBarOverlay: { color: '#0d0e0d', symbolColor: '#9ca197', height: 40 } };
    mainWindow = new BrowserWindow({ width: 1280, height: 900, minWidth: 900, minHeight: 640, title: 'Trener', icon: path.join(__dirname, 'assets/icon.png'), ...titleBar, backgroundColor: '#0d0e0d', show: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
    secure(mainWindow); mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.on('close', event => { if (!quitting && tray) { event.preventDefault(); mainWindow.hide(); } });
    load(mainWindow, route || '/today');
  } else { if (route) mainWindow.webContents.send('trener:navigate', route); mainWindow.show(); }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}
function showWidget() {
  if (widgetWindow && !widgetWindow.isDestroyed()) { widgetWindow.showInactive(); return; }
  const area = screen.getPrimaryDisplay().workArea;
  const saved = preferences.bounds;
  const visible = saved && screen.getAllDisplays().some(display => saved.x >= display.workArea.x && saved.y >= display.workArea.y && saved.x + 340 <= display.workArea.x + display.workArea.width && saved.y + 300 <= display.workArea.y + display.workArea.height);
  widgetWindow = new BrowserWindow({ width: 340, height: 300, x: visible ? saved.x : area.x + area.width - 360, y: visible ? saved.y : area.y + 24, frame: false, transparent: true, resizable: false, maximizable: false, fullscreenable: false, skipTaskbar: true, alwaysOnTop: preferences.alwaysOnTop, show: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  secure(widgetWindow);
  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  widgetWindow.once('ready-to-show', () => widgetWindow.showInactive());
  widgetWindow.on('moved', () => { preferences.bounds = widgetWindow.getBounds(); savePreferences(); });
  widgetWindow.on('closed', () => { widgetWindow = null; });
  load(widgetWindow, '/widget');
}
function hideWidget() { widgetWindow?.hide(); preferences.widget = false; savePreferences(); updateMenu(); }
function updateMenu() {
  tray?.setContextMenu(Menu.buildFromTemplate([
    { label: 'Открыть Trener', click: () => openMain() },
    { label: 'Виджет', type: 'checkbox', checked: preferences.widget, click: item => { preferences.widget = item.checked; if (item.checked) showWidget(); else widgetWindow?.hide(); savePreferences(); updateMenu(); } },
    { label: 'Виджет поверх окон', type: 'checkbox', checked: preferences.alwaysOnTop, click: item => { preferences.alwaysOnTop = item.checked; widgetWindow?.setAlwaysOnTop(item.checked); savePreferences(); updateMenu(); } },
    { label: 'Запускать при входе', type: 'checkbox', enabled: app.isPackaged, checked: app.getLoginItemSettings(loginOptions).openAtLogin, click: item => { app.setLoginItemSettings({ ...loginOptions, openAtLogin: item.checked }); updateMenu(); } },
    { type: 'separator' }, { label: 'Выйти', click: () => { quitting = true; app.quit(); } },
  ]));
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => openMain());
  app.on('before-quit', () => { quitting = true; });
  app.on('window-all-closed', () => { if (!tray) app.quit(); });
  app.on('activate', () => openMain());
  app.whenReady().then(() => {
    try { preferences = { ...preferences, ...JSON.parse(fs.readFileSync(preferencesFile(), 'utf8')) }; } catch { /* first launch */ }
    // A tiny monochrome RGBA tray mark; no external assets or platform codecs.
    const pixels = Buffer.alloc(16 * 16 * 4);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const i = (y * 16 + x) * 4; const on = (y >= 3 && y <= 5 && x >= 2 && x <= 13) || (x >= 6 && x <= 9 && y >= 5 && y <= 13); pixels[i] = pixels[i + 1] = pixels[i + 2] = 236; pixels[i + 3] = on ? 255 : 0; }
    const icon = nativeImage.createFromBitmap(pixels, { width: 16, height: 16 }); if (process.platform === 'darwin') icon.setTemplateImage(true);
    tray = new Tray(icon); tray.setToolTip('Trener – движение каждый день'); tray.on('double-click', () => openMain()); updateMenu();
    ipcMain.handle('trener:open-main', (event, route) => { if (![mainWindow?.webContents, widgetWindow?.webContents].includes(event.sender)) return; openMain(typeof route === 'string' && /^\/(today|calories|progress|exercises)(\?.*)?$/.test(route) ? route : '/today'); });
    ipcMain.handle('trener:hide-widget', event => { if (event.sender === widgetWindow?.webContents) hideWidget(); });
    if (!process.argv.includes('--hidden') && !app.getLoginItemSettings(loginOptions).wasOpenedAtLogin) openMain();
    if (preferences.widget) showWidget();
  });
}
