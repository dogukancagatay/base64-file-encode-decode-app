const { app, dialog, ipcMain, BrowserWindow } = require('electron');
const winston = require('winston');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports: [
    new winston.transports.Console({}),
  ],
});

function base64EncodeFile(filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      logger.error(err);
      return;
    }

    const encrypted = data.toString('base64');

    fs.writeFile(`${filePath}.b64`, encrypted, (err2) => {
      if (err2) {
        logger.error(err2);
        return;
      }

      logger.info(`The file was saved to ${filePath}.b64`);
    });
  });
}

function base64DecodeFile(filePath) {
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) {
      logger.error(err);
      return;
    }

    const fileWritePath = filePath.replace(/\.b64$/, '');
    const decrypted = new Buffer(data, 'base64');

    if (!fs.existsSync(fileWritePath)) {
      fs.writeFile(fileWritePath, decrypted, (err2) => {
        if (err2) {
          logger.error(err2);
          return;
        }

        logger.info(`The file was saved to ${fileWritePath}`);
      });
    }
  });
}

function openFileSelectionDialog(mode, event) {
  logger.info(`Open file select window in ${mode} mode`);

  dialog.showOpenDialog({ properties: ['openFile'] }, (filePaths) => {
    if (filePaths === undefined) {
      logger.info('No file selected');
      event.sender.send('asynchronous-reply', 'No file selected');
      return;
    }

    logger.info(filePaths);

    filePaths.forEach((filePath) => {
      logger.info(`Processing ${filePath}`);

      if (mode === 'encode') {
        base64EncodeFile(filePath);
        event.sender.send('asynchronous-reply', `The file was saved to ${filePath}.b64`);
      } else if (mode === 'decode') {
        base64DecodeFile(filePath);
        event.sender.send('asynchronous-reply', `The file was saved to ${filePath.replace(/\.b64$/, '')}`);
      }
    });
  });
}

let mainWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
  });

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  ipcMain.on('asynchronous-message', (event, arg) => {
    openFileSelectionDialog(arg, event);
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
