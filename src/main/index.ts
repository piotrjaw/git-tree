import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc-handlers'
import { getWindowBounds, setWindowBounds } from './store'
import { stopAll } from './file-watcher'

function createWindow(): void {
  const bounds = getWindowBounds()

  const mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    title: 'Git Tree',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', () => {
    const b = mainWindow.getBounds()
    setWindowBounds({ x: b.x, y: b.y, width: b.width, height: b.height })
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  registerIpcHandlers(mainWindow)

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.setName('Git Tree')

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  stopAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
