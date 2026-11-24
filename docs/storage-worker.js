"use strict";
let access,
  offset = 0;
self.onmessage = async ({ data: m }) => {
  try {
    if (m.type === "open") {
      const root = await navigator.storage.getDirectory();
      const dir = await root.getDirectoryHandle("entrevistas", {
        create: true,
      });
      const file = await dir.getFileHandle(m.name, { create: true });
      if (typeof file.createSyncAccessHandle !== "function")
        throw Error(
          "Este navegador no admite escritura local continua. Usa un navegador actualizado.",
        );
      access = await file.createSyncAccessHandle();
      access.truncate(0);
      offset = 0;
    } else if (m.type === "write") {
      if (!access) throw Error("Archivo cerrado");
      const bytes = new Uint8Array(m.buffer);
      let pos = 0;
      while (pos < bytes.length) {
        const n = access.write(bytes.subarray(pos), { at: offset });
        if (!n) throw Error("Escritura incompleta");
        offset += n;
        pos += n;
      }
      access.flush();
    } else if (m.type === "close") {
      if (access) {
        access.flush();
        access.close();
        access = null;
      }
    } else throw Error("Operación desconocida");
    self.postMessage({ id: m.id });
  } catch (e) {
    self.postMessage({ id: m.id, error: e.message || String(e) });
  }
};
