"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const { webcrypto } = require("node:crypto");
const source = fs.readFileSync(
  require("node:path").join(__dirname, "../app.js"),
  "utf8",
);
class Events {
  constructor() {
    this.events = {};
    this.open = true;
    this.peer = "guest";
    this.sent = [];
  }
  on(k, f) {
    (this.events[k] ??= []).push(f);
    return this;
  }
  emit(k, ...args) {
    for (const f of this.events[k] || []) f(...args);
  }
  send(d) {
    this.sent.push(d);
  }
  close() {
    this.open = false;
    this.emit("close");
  }
}
function setup(hash = "") {
  const elements = new Map(),
    timeouts = new Map();
  let clockId = 0,
    mediaCalls = 0,
    workerMode = "ok",
    mediaResolve;
  const nodes = () => ({
    hidden: true,
    disabled: false,
    checked: true,
    value: "Prueba",
    textContent: "",
    childNodes: [],
    getTracks() {
      return [];
    },
    replaceChildren() {
      this.childNodes = [];
    },
    append(...a) {
      this.childNodes.push(...a);
    },
    remove() {},
    click() {},
    play() {
      return Promise.resolve();
    },
  });
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, nodes());
    return elements.get(id);
  };
  get("quality").value = "720";
  get("create").disabled = false;
  const media = {
    getTracks: () => [
      {
        stop() {
          media.stopped = true;
        },
      },
    ],
    getAudioTracks: () => [],
    getVideoTracks: () => [],
  };
  const dir = {
    async *entries() {},
    async removeEntry() {},
    async getFileHandle() {
      return {
        async getFile() {
          return { name: "test.webm", size: 100 };
        },
      };
    },
  };
  class Worker {
    postMessage(m) {
      if (workerMode === "hang") return;
      queueMicrotask(() =>
        this.onmessage?.({
          data: {
            id: m.id,
            ...(workerMode === "error" ? { error: "quota excedida" } : {}),
          },
        }),
      );
    }
    terminate() {
      this.terminated = true;
    }
  }
  class Peer extends Events {
    constructor(id) {
      super();
      this.id = id;
      queueMicrotask(() => this.emit("open", id));
    }
    call() {
      this.callCount = (this.callCount || 0) + 1;
      return new Events();
    }
    destroy() {
      this.destroyed = true;
    }
    connect() {
      return new Events();
    }
  }
  const ctx = {
    console,
    Blob,
    URL,
    URLSearchParams,
    Uint8Array,
    Map,
    Promise,
    Date,
    Error,
    JSON,
    Math,
    Number,
    String,
    crypto: webcrypto,
    location: {
      hash,
      href: "https://example.test/estudio/" + hash,
      reload() {},
    },
    isSecureContext: true,
    Peer,
    Worker,
    HTMLCanvasElement: class {},
    MediaRecorder: class {
      static isTypeSupported() {
        return true;
      }
    },
    AudioContext: class {
      async resume() {}
      async close() {}
    },
    navigator: {
      storage: {
        async getDirectory() {
          return {
            async getDirectoryHandle() {
              return dir;
            },
          };
        },
        async estimate() {
          return { quota: 1e9, usage: 0 };
        },
      },
      mediaDevices: {
        getUserMedia() {
          mediaCalls++;
          return new Promise((r) => {
            mediaResolve = () => r(media);
          });
        },
      },
    },
    document: {
      baseURI: "https://example.test/estudio/",
      getElementById: get,
      createElement: nodes,
      addEventListener() {},
      visibilityState: "visible",
    },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
    },
    setTimeout(f, ms) {
      const id = ++clockId;
      timeouts.set(id, { f, ms });
      return id;
    },
    clearTimeout(id) {
      timeouts.delete(id);
    },
    setInterval() {
      return ++clockId;
    },
    clearInterval() {},
    cancelAnimationFrame() {},
    confirm() {
      return false;
    },
  };
  ctx.HTMLCanvasElement.prototype.captureStream = () => {};
  ctx.window = { addEventListener() {} };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  return {
    ctx,
    get,
    dir,
    media,
    timeouts,
    run: (s) => vm.runInContext(s, ctx),
    setWorker: (m) => (workerMode = m),
    get mediaCalls() {
      return mediaCalls;
    },
    resolveMedia() {
      mediaResolve();
    },
  };
}
const flush = () => new Promise((r) => setImmediate(r));
test("invitación recuperable con JSON corrupto", async () => {
  const t = setup();
  t.ctx.localStorage.getItem = () => "{broken";
  t.run("stream={}");
  await t.run("create()");
  assert.match(
    t.get("link").value,
    /#room=entrevista-[a-f0-9]{48}&key=[a-f0-9]{48}$/,
  );
});
test("invitación recuperable si localStorage está bloqueado", async () => {
  const t = setup();
  t.ctx.localStorage.getItem = () => {
    throw Error("blocked");
  };
  t.ctx.localStorage.setItem = () => {
    throw Error("blocked");
  };
  t.run("stream={}");
  await t.run("create()");
  assert.equal(t.get("invitation").hidden, false);
});
test("doble pulsación de cámara solo solicita un flujo", async () => {
  const t = setup();
  const a = t.run("prepare()"),
    b = t.run("prepare()");
  await flush();
  assert.equal(t.mediaCalls, 1);
  t.resolveMedia();
  await Promise.all([a, b]);
  assert.equal(t.get("controls").hidden, false);
});
test("fallo OPFS se detecta antes de pedir cámara", async () => {
  const t = setup();
  t.setWorker("error");
  await t.run("prepare()");
  assert.equal(t.mediaCalls, 0);
  assert.equal(t.get("prepare").disabled, false);
  assert.match(t.get("notice").textContent, /quota/);
});
test("worker bloqueado rechaza por plazo en vez de esperar para siempre", async () => {
  const t = setup();
  t.setWorker("hang");
  const p = t.run("openWriter('test')");
  const rejected = assert.rejects(p, /no responde/);
  [...t.timeouts.values()].find((x) => x.ms === 10000).f();
  await rejected;
});
test("token incorrecto y segundo participante no son admitidos", () => {
  const t = setup();
  t.run("token='correcto'");
  const a = (t.ctx.a = new Events());
  t.run("bindConn(a)");
  a.emit("data", { type: "request", token: "incorrecto", consent: true });
  assert.equal(a.sent[0].type, "reject");
  const b = (t.ctx.b = new Events());
  t.run("bindConn(b)");
  b.emit("data", { type: "request", token: "correcto", consent: true });
  assert.equal(t.run("connecting"), true);
  const c = (t.ctx.c = new Events());
  t.run("bindConn(c)");
  c.emit("data", { type: "request", token: "correcto", consent: true });
  assert.equal(c.sent[0].type, "reject");
});
test("la llamada espera confirmación ready del invitado", async () => {
  const t = setup();
  t.run("stream={};token='correcto'");
  await t.run('openPeer("host")');
  const c = (t.ctx.c = new Events());
  t.run("bindConn(c)");
  c.emit("data", { type: "request", token: "correcto", consent: true });
  await t.run("accept()");
  assert.equal(t.run("peer.callCount||0"), 0);
  c.emit("data", { type: "ready" });
  assert.equal(t.run("peer.callCount"), 1);
  c.emit("data", { type: "ready" });
  assert.equal(t.run("peer.callCount"), 1);
});
test("el invitado confirma consentimiento al solicitar entrada", async () => {
  const t = setup(
    "#room=entrevista-" + "a".repeat(48) + "&key=" + "b".repeat(48),
  );
  t.run("stream={}");
  t.get("consent").checked = false;
  await t.run("join()");
  assert.equal(t.run("peer"), undefined);
  assert.match(t.get("notice").textContent, /acepta/);
});
test("finalizar espera la inicialización y admite llamadas repetidas", async () => {
  const t = setup();
  t.ctx.resolveInit = null;
  t.run("initRecording=new Promise(r=>resolveInit=r)");
  const a = t.run("finish()"),
    b = t.run("finish()");
  assert.equal(a, b);
  t.ctx.resolveInit();
  await a;
  assert.equal(t.get("again").hidden, false);
});
test("fin durante el arranque notifica y conserva archivo parcial", async () => {
  const t = setup();
  t.run(
    "handle={getFile:async()=>({name:'parcial.webm',size:10})};recordError=Error('interrumpido')",
  );
  await t.run("finish()");
  assert.equal(t.get("result").hidden, false);
  assert.match(t.get("resultInfo").textContent, /interrumpida/);
});
test("colgar la llamada del invitado cierra sin ofrecer reinicio", () => {
  const t = setup("#room=x");
  t.run("stream={getTracks:()=>[{stop:()=>window.stopped=true}]}");
  const c = (t.ctx.c = new Events());
  t.run("bindCall(c)");
  c.emit("close");
  assert.equal(t.ctx.window.stopped, true);
  assert.equal(t.get("again").hidden, true);
  assert.equal(t.get("guestEnd").hidden, false);
});
const workerSource = fs.readFileSync(
  require("node:path").join(__dirname, "../storage-worker.js"),
  "utf8",
);
function workerSetup(write) {
  const messages = [],
    data = [];
  let closed = false;
  const access = {
    truncate() {},
    write(bytes, { at }) {
      const n = write ? write(bytes, at) : Math.min(2, bytes.length);
      for (let i = 0; i < n; i++) data[at + i] = bytes[i];
      return n;
    },
    flush() {},
    close() {
      closed = true;
    },
  };
  const ctx = {
    Uint8Array,
    Error,
    self: { postMessage: (m) => messages.push(m) },
    navigator: {
      storage: {
        async getDirectory() {
          return {
            async getDirectoryHandle() {
              return {
                async getFileHandle() {
                  return {
                    async createSyncAccessHandle() {
                      return access;
                    },
                  };
                },
              };
            },
          };
        },
      },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(workerSource, ctx);
  return {
    messages,
    data,
    get closed() {
      return closed;
    },
    send: (m) => ctx.self.onmessage({ data: m }),
  };
}
test("worker escribe también cuando write devuelve bloques parciales", async () => {
  const t = workerSetup();
  await t.send({ id: 1, type: "open", name: "test" });
  await t.send({
    id: 2,
    type: "write",
    buffer: new Uint8Array([1, 2, 3, 4, 5]).buffer,
  });
  await t.send({ id: 3, type: "close" });
  assert.deepEqual(t.data, [1, 2, 3, 4, 5]);
  assert.equal(t.closed, true);
  assert.equal(t.messages.length, 3);
});
test("worker comunica escritura nula y falta de espacio", async () => {
  for (const write of [
    () => 0,
    () => {
      throw Error("quota");
    },
  ]) {
    const t = workerSetup(write);
    await t.send({ id: 1, type: "open", name: "test" });
    await t.send({ id: 2, type: "write", buffer: new Uint8Array([1]).buffer });
    assert.ok(t.messages[1].error);
  }
});
test("fallo al cerrar el writer intenta rescatar el archivo escrito", async () => {
  const t = setup();
  t.run(
    "writer={close:async()=>{throw Error('flush fallido')},abort:async()=>{}};handle={getFile:async()=>({name:'parcial.webm',size:10})}",
  );
  await t.run("finish()");
  assert.equal(t.get("result").hidden, false);
  assert.match(t.get("resultInfo").textContent, /interrumpida/);
});
test("datos de invitación guardados inválidos no se reutilizan", async () => {
  const t = setup();
  t.ctx.localStorage.getItem = () =>
    JSON.stringify({ room: "bad", token: "bad" });
  t.run("stream={}");
  await t.run("create()");
  assert.match(
    t.get("link").value,
    /#room=entrevista-[a-f0-9]{48}&key=[a-f0-9]{48}$/,
  );
});
test("un mensaje recording previo a la admisión no inicia el indicador", () => {
  const t = setup("#room=x");
  const c = (t.ctx.c = new Events());
  t.run("conn=c;bindConn(c)");
  c.emit("data", { type: "recording" });
  assert.equal(t.get("recording").hidden, true);
});
test("fallo de escritura en preflight aborta su worker", async () => {
  const t = setup();
  t.setWorker("error");
  await t.run("prepare()");
  assert.equal(t.get("prepare").disabled, false);
  assert.equal(t.run("preparing"), false);
});

test("retirada del invitado antes de grabar finaliza la invitación", async () => {
  const t = setup();
  t.run("stream={getTracks:()=>[]};token='correcto'");
  await t.run('openPeer("host")');
  const c = (t.ctx.c = new Events());
  t.run("bindConn(c)");
  c.emit("data", { type: "request", token: "correcto", consent: true });
  await flush();
  c.close();
  await flush();
  assert.equal(t.run("ending"), true);
  assert.equal(t.get("again").hidden, false);
});
test("se prefiere WebM por bloques a un MP4 con códec no especificado", () => {
  const t = setup();
  t.ctx.MediaRecorder.isTypeSupported = (type) =>
    type === "video/mp4" || type === "video/webm;codecs=vp8,opus";
  assert.equal(t.run("mime()"), "video/webm;codecs=vp8,opus");
});

test("crear enlace no solicita cámara ni abre una conexión", async () => {
  const t = setup();
  await t.run("create()");
  assert.equal(t.mediaCalls, 0);
  assert.equal(t.run("peer"), undefined);
  assert.equal(t.get("invitation").hidden, false);
  const link = t.get("link").value;
  await t.run("create()");
  assert.equal(t.get("link").value, link);
});
test("el anfitrión acepta automáticamente una invitación válida", async () => {
  const t = setup();
  t.run("stream={};token='correcto'");
  await t.run('openPeer("host")');
  const c = (t.ctx.c = new Events());
  t.run("bindConn(c)");
  c.emit("data", { type: "request", token: "correcto", consent: true });
  await flush();
  assert.ok(c.sent.some((x) => x.type === "accept"));
  assert.equal(t.run("connecting"), true);
});
test("espera automática hasta que se conecta el anfitrión", () => {
  const t = setup("#room=x");
  t.run("waitForHost()");
  assert.equal(
    t.get("waitingTitle").textContent,
    "En espera de que el anfitrión se conecte.",
  );
  assert.ok([...t.timeouts.values()].some((x) => x.ms === 5000));
  t.run("cleanup()");
  assert.equal(t.run("guestWaiting"), false);
});

test("el invitado debe indicar su nombre antes de pedir cámara", async () => {
  const t = setup(
    "#room=entrevista-" + "a".repeat(48) + "&key=" + "b".repeat(48),
  );
  t.get("name").value = "";
  t.get("prepare").onclick();
  await flush();
  assert.equal(t.mediaCalls, 0);
  assert.match(t.get("notice").textContent, /nombre/);
});
test("la invitación finalizada queda marcada y no ofrece volver", () => {
  const t = setup(
    "#room=entrevista-" + "a".repeat(48) + "&key=" + "b".repeat(48),
  );
  const saved = new Map();
  t.ctx.localStorage.getItem = (k) => saved.get(k) || null;
  t.ctx.localStorage.setItem = (k, v) => saved.set(k, v);
  t.run("cleanup()");
  assert.equal(t.run("spentInvitation()"), true);
  assert.equal(t.get("again").hidden, true);
  assert.equal(t.get("guestEnd").hidden, false);
});
test("composiciones horizontales, verticales y mixtas dentro del vídeo", () => {
  const t = setup();
  for (const lo of ["portrait", "landscape"])
    for (const ro of ["portrait", "landscape"])
      for (const focus of [null, "local", "remote"]) {
        const { w, h } = t.run(`recordingSize('${lo}','${ro}',720)`);
        const result = t.run(
          `sceneLayout(${w},${h},'${lo}','${ro}',${JSON.stringify(focus)})`,
        );
        for (const b of Object.values(result.boxes)) {
          assert.ok(b.w > 0 && b.h > 0);
          assert.ok(b.x >= 0 && b.y >= 0);
          assert.ok(b.x + b.w <= w + 0.1 && b.y + b.h <= h + 0.1);
        }
      }
  const p = t.run("sceneLayout(720,720,'portrait','portrait')");
  assert.equal(p.boxes.local.y, p.boxes.remote.y);
  assert.ok(p.boxes.local.x + p.boxes.local.w < p.boxes.remote.x);
});
test("cada participante cambia el foco de su propia vista", () => {
  const t = setup();
  t.run("focusCamera('local')");
  assert.equal(t.run("focusedCamera"), "local");
  t.run("focusCamera('remote')");
  assert.equal(t.run("focusedCamera"), "remote");
});
test("la pantalla solicita mantenerse activa y libera el bloqueo al acabar", async () => {
  const t = setup();
  let calls = 0;
  const sentinel = {
    released: false,
    async release() {
      this.released = true;
    },
  };
  t.ctx.navigator.wakeLock = {
    async request(type) {
      assert.equal(type, "screen");
      calls++;
      return sentinel;
    },
  };
  await t.run("keepAwake()");
  await t.run("keepAwake()");
  assert.equal(calls, 1);
  t.run("cleanup()");
  assert.equal(sentinel.released, true);
});

test("la orientación se puede elegir antes de activar la cámara",async()=>{const t=setup();await t.run('toggleOrientation()');assert.equal(t.run('localOrientation'),'portrait');assert.equal(t.mediaCalls,0);assert.match(t.get('orientationSetup').title,/vertical/);});
