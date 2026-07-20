const {
    contextBridge,
    ipcRenderer
} = require("electron");


contextBridge.exposeInMainWorld(
    "electronAPI",
    {

        moveWindow: (x, y) => {

            ipcRenderer.send(
                "move-window",
                x,
                y
            );

        },

        setIgnoreMouse: (ignore) =>
            ipcRenderer.send(
                "set-ignore-mouse",
                ignore
            ),


        getWindowPosition: () => {

            return ipcRenderer.invoke(
                "get-window-position"
            );

        },


        getScreenSize: () => {

            return ipcRenderer.invoke(
                "get-screen-size"
            );

        },


        resizeWindow: (width, height) => {

            ipcRenderer.send(
                "resize-window",
                width,
                height
            );

        },
        updatePetBounds: (bounds) =>
            ipcRenderer.send(
                "update-pet-bounds",
                bounds
        ),
        log: (...args) => {
            ipcRenderer.send(
                "log",
                args
            );
        },

        onQuitRequest: (callback) => {
            ipcRenderer.on(
                "quit-request",
                () => {
                    callback();
                }
            );
        },

        confirmQuit: () => {
            ipcRenderer.send(
                "confirm-quit"
            );
        }

    }
);
