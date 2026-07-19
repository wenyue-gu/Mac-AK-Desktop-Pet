const { app, BrowserWindow, ipcMain, screen, Tray, Menu } = require("electron");

let win;
let mouseWatcher;
let mouseOverPet = false;
let petBounds = null;

function createWindow() {

    win = new BrowserWindow({
        width:400,
        height:400,

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
    // win.setIgnoreMouseEvents(true, {
    //    forward: true
    // });
    win.setIgnoreMouseEvents(false);
    win.loadFile("index.html");
    // win.webContents.openDevTools();
}

function startMouseWatcher() {

    mouseWatcher = setInterval(() => {

        if (!win) return;

        const cursor = screen.getCursorScreenPoint();
        const pos = win.getPosition();

        const localX = cursor.x - pos[0];
        const localY = cursor.y - pos[1];

        if (petBounds) {

            const inside =
                localX >= petBounds.left &&
                localX <= petBounds.left + petBounds.width &&
                localY >= petBounds.top &&
                localY <= petBounds.top + petBounds.height;

            if (inside !== mouseOverPet) {

                mouseOverPet = inside;
                win.setIgnoreMouseEvents(
                    !mouseOverPet,
                    {
                        forward: true
                    }
                );
            }
        }

    }, 200);

}

ipcMain.on("move-window", (event, x, y) => {

    if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        Number.isNaN(x) ||
        Number.isNaN(y)
    ) {
        console.log("INVALID POSITION BLOCKED");
        return;
    }

    win.setPosition(
        Math.round(x),
        Math.round(y)
    );
});

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

// ipcMain.on("set-ignore-mouse", (event, ignore) => {
//     if (win) {
//         win.setIgnoreMouseEvents(ignore, {
//             forward: true
//         });
//     }
// });

ipcMain.on("log", (event, msg) => {
    console.log(msg);
});

ipcMain.on(
    "update-pet-bounds",
    (event, bounds) => {
        petBounds = bounds;
    }
);

app.whenReady().then(() => {
    createWindow();
    startMouseWatcher();
});

app.on(
    "window-all-closed",
    () => {

        if (process.platform !== "darwin") {
            app.quit();
        }

    }
);

const path = require("path");

let tray;

app.whenReady().then(() => {

    tray = new Tray(
        path.join(__dirname, "tray_icon3.png")
    );

    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Quit",
            click() {
                app.quit();
            }
        }
    ]);

    tray.setToolTip(">:)");

    tray.setContextMenu(contextMenu);

});
