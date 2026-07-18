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

        }

    }
);
