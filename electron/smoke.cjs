// Isolated integration check for the built renderer and preload, without user data.
const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const assert = require('node:assert/strict');
app.setPath('userData', path.join(__dirname, '../release/smoke-profile'));
process.argv.push('--hidden');
require('./main.cjs');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  try {
    for (let i = 0; i < 100 && !BrowserWindow.getAllWindows().length; i++) await delay(100);
    const widget = BrowserWindow.getAllWindows()[0];
    assert.ok(widget, 'Widget window created');
    for (let i = 0; i < 100; i++) { if (await widget.webContents.executeJavaScript('Boolean(document.querySelector(".desktop-widget"))').catch(() => false)) break; await delay(100); }
    assert.ok(await widget.webContents.executeJavaScript('Boolean(document.querySelector(".desktop-widget"))'), 'Widget rendered');
    await widget.webContents.executeJavaScript('window.trener.openMain("/calories")');
    await delay(1500);
    const main = BrowserWindow.getAllWindows().find(window => window !== widget);
    assert.ok(main, 'IPC opens main window');
    assert.ok(await main.webContents.executeJavaScript('Boolean(document.querySelector(".calories-screen"))'), 'Calories rendered');
    await main.webContents.executeJavaScript('localStorage.setItem("trener.smoke", "sync")');
    assert.equal(await widget.webContents.executeJavaScript('localStorage.getItem("trener.smoke")'), 'sync', 'Windows share origin storage');
    await widget.webContents.executeJavaScript('window.trener.openMain("/today?start=1")');
    await delay(250);
    assert.ok(main.webContents.getURL().includes('#/play'), 'Widget start opens workout player');
    console.log('Electron smoke: widget, calories, preload IPC, shared storage, navigation passed');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
