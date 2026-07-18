const { app, BrowserWindow, ipcMain, screen } = require("electron");

let win;

function createWindow() {

    win = new BrowserWindow({
        width:300,
        height:300,

        transparent:true,
        frame:false,

        alwaysOnTop:true,
        skipTaskbar: true,
        type: "panel",

        webPreferences:{
            nodeIntegration:false,
            contextIsolation:true,
            preload:__dirname+"/preload.js"
        }
    });
    win.setAlwaysOnTop(true, "screen-saver");
    win.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
    });
    win.setVisibleOnAllWorkspaces(
        true,
        {
            visibleOnFullScreen:true
        }
    );
    win.loadFile("index.html");
    // win.webContents.openDevTools();
}

ipcMain.on(
    "move-window",
    (event, x, y) => {
        if (win) {
            win.setPosition(
                Math.round(x),
                Math.round(y)
            );
        }
    }
);

ipcMain.handle(
    "get-window-position",
    () => {
        if (win) {
            return win.getPosition();
        }
        return [0, 0];
    }
);

ipcMain.handle(
    "get-screen-size",
    () => {

        const display =
            screen.getPrimaryDisplay();
        return {
            width: display.workAreaSize.width,
            height: display.workAreaSize.height
        };

    }
);

ipcMain.on(
    "resize-window",
    (event, width, height) => {
        if (win) {
            win.setSize(
                width,
                height
            );
        }
    }
);

app.whenReady().then(
    createWindow
);

app.on(
    "window-all-closed",
    () => {

        if (process.platform !== "darwin") {
            app.quit();
        }

    }
);
