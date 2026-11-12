// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => import_electron.ipcRenderer.invoke("app:get-version"),
  isPackaged: () => import_electron.ipcRenderer.invoke("app:is-packaged"),
  minimize: () => import_electron.ipcRenderer.invoke("window:minimize"),
  maximize: () => import_electron.ipcRenderer.invoke("window:maximize"),
  close: () => import_electron.ipcRenderer.invoke("window:close"),
  print: () => window.print()
});
//# sourceMappingURL=preload.js.map
