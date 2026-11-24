"use strict";
const $ = (id) => document.getElementById(id),
  show = (id, on = true) => ($(id).hidden = !on),
  status = (s) => ($("status").textContent = s),
  notice = (s) => ($("notice").textContent = s);
const params = new URLSearchParams(location.hash.slice(1)),
  guest = window.ESTUDIO_MODE
    ? window.ESTUDIO_MODE === "guest"
    : params.has("room"),
  roomParam = params.get("room"),
  tokenParam = params.get("key");
let playbackSource;
let retryTimer,
  guestWaiting = false,
  rejected = false;
let connecting = false,
  admitted = false,
  preparing = false,
  joining = false;
let initRecording = null,
  finishTask = null,
  queuedBytes = 0;
const MAX_QUEUED_BYTES = 32 * 1024 * 1024;
const validRoom = (s) => /^entrevista-[a-f0-9]{48}$/.test(s || "");
const validToken = (s) => /^[a-f0-9]{48}$/.test(s || "");
let stream,
  peer,
  conn,
  call,
  remoteStream,
  room,
  token,
  rec,
  writer,
  root,
  handle,
  chain = Promise.resolve(),
  written = 0,
  startTime,
  timer,
  animation,
  audio,
  canvas,
  combined,
  wake,
  ending = false,
  active = false,
  pending = false,
  filename,
  lastFile,
  recordError = null,
  sessionId = 0;
const random = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)), (x) =>
    x.toString(16).padStart(2, "0"),
  ).join("");
const safeName = (s) =>
  (s || "Entrevista").replace(/[^\p{L}\p{N} _-]/gu, "_").slice(0, 80) ||
  "Entrevista";
const mimeTypes = [
  "video/mp4;codecs=avc1.42001f,mp4a.40.2",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];
function mime() {
  return mimeTypes.find((x) => MediaRecorder.isTypeSupported(x));
}
let localOrientation =
  typeof innerWidth === "number" && innerHeight > innerWidth
    ? "portrait"
    : "landscape";
let remoteOrientation = "landscape",
  focusedCamera = null;
const validOrientation = (v) => v === "portrait" || v === "landscape";
const cameraRatio = (o) => (o === "portrait" ? 9 / 16 : 16 / 9);
function recordingSize(lo, ro, quality) {
  const h = quality === 480 ? 480 : 720;
  return lo === "portrait" && ro === "portrait"
    ? { w: h, h }
    : { w: h === 720 ? 1280 : 854, h };
}
function sceneLayout(w, h, lo, ro, focus = null) {
  const m = Math.min(w, h) * 0.045,
    orientation = { local: lo, remote: ro };
  let boxes = {};
  if (focus === "local" || focus === "remote") {
    const secondary = focus === "local" ? "remote" : "local",
      ratio = cameraRatio(orientation[focus]),
      ratio2 = cameraRatio(orientation[secondary]);
    const ph = Math.min(h * 0.78, (w * 0.84) / ratio),
      pw = ph * ratio;
    const sh = Math.min(h * 0.34, (w * 0.3) / ratio2),
      sw = sh * ratio2;
    boxes[focus] = { x: m, y: (h - ph) / 2 + h * 0.02, w: pw, h: ph };
    boxes[secondary] = { x: w - m - sw, y: h - m - sh, w: sw, h: sh };
    return { boxes, order: [focus, secondary] };
  }
  if (lo === "portrait" && ro === "portrait") {
    const bh = Math.min(h * 0.78, (w - 3 * m) / 2 / (9 / 16)),
      bw = (bh * 9) / 16,
      x = (w - 2 * bw - m) / 2,
      y = (h - bh) / 2 + h * 0.03;
    boxes = {
      local: { x, y, w: bw, h: bh },
      remote: { x: x + bw + m, y, w: bw, h: bh },
    };
  } else if (lo === "landscape" && ro === "landscape") {
    const aw = Math.min(w * 0.5, (h * 0.52 * 16) / 9),
      ah = (aw * 9) / 16,
      bw = Math.min(w * 0.57, (h * 0.58 * 16) / 9),
      bh = (bw * 9) / 16;
    boxes = {
      local: { x: m, y: h * 0.12, w: aw, h: ah },
      remote: { x: w - m - bw, y: h - m - bh, w: bw, h: bh },
    };
  } else {
    const ph = h * 0.78,
      pw = (ph * 9) / 16,
      lw = w - pw - 3 * m,
      lh = (lw * 9) / 16;
    const p = { x: m, y: h * 0.15, w: pw, h: ph },
      l = { x: pw + 2 * m, y: (h - lh) / 2 + h * 0.04, w: lw, h: lh };
    if (lo === "portrait") boxes = { local: p, remote: l };
    else boxes = { local: { ...l, x: m }, remote: { ...p, x: w - m - pw } };
  }
  return { boxes, order: ["local", "remote"] };
}
function updateStage() {
  const stage = $("stage");
  if (!stage?.style || !stage.clientWidth) return;
  stage.style.aspectRatio =
    active && canvas
      ? canvas.width + " / " + canvas.height
      : localOrientation === "portrait" && remoteOrientation === "portrait"
        ? "1 / 1"
        : "16 / 9";
  const w = stage.clientWidth,
    h = stage.clientHeight || (w * 9) / 16,
    layout = sceneLayout(
      w,
      h,
      localOrientation,
      remoteOrientation,
      focusedCamera,
    );
  for (const [id, box] of Object.entries(layout.boxes)) {
    const tile = $(id === "local" ? "localBox" : "remoteBox");
    Object.assign(tile.style, {
      left: box.x + "px",
      top: box.y + "px",
      width: box.w + "px",
      height: box.h + "px",
      zIndex: String(layout.order.indexOf(id) + 1),
    });
    $(id === "local" ? "focusLocal" : "focusRemote")?.setAttribute?.(
      "aria-pressed",
      String(focusedCamera === id),
    );
  }
  $("orientation").textContent = localOrientation === "portrait" ? "▯" : "▭";
  $("orientation").title =
    localOrientation === "portrait"
      ? "Cambiar tu cámara a horizontal"
      : "Cambiar tu cámara a vertical";
  $("orientation").setAttribute?.("aria-label", $("orientation").title);
}
function focusCamera(which) {
  focusedCamera = which;
  updateStage();
  audio?.resume().catch(fail);
  $(which)
    .play()
    .catch(() => {});
}
async function toggleOrientation() {
  localOrientation = localOrientation === "portrait" ? "landscape" : "portrait";
  updateStage();
  send({ type: "orientation", value: localOrientation });
  const track = stream?.getVideoTracks()[0];
  if (track?.applyConstraints) {
    try {
      await track.applyConstraints({
        aspectRatio: { ideal: cameraRatio(localOrientation) },
        width: { ideal: localOrientation === "portrait" ? 720 : 1280 },
        height: { ideal: localOrientation === "portrait" ? 1280 : 720 },
      });
    } catch {
      /* Canvas still applies the selected frame without rotating the image. */
    }
  }
}
let compositionLogo = null;
if (typeof Image !== "undefined") {
  compositionLogo = new Image();
  compositionLogo.src = new URL("assets/lumi-icon.webp", document.baseURI).href;
}
function roundedPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function paintComposition(ctx, w, h) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#23201b");
  bg.addColorStop(0.55, "#121211");
  bg.addColorStop(1, "#33251b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const layout = sceneLayout(
      w,
      h,
      localOrientation,
      remoteOrientation,
      focusedCamera,
    ),
    scale = w / 1280;
  for (const id of layout.order) {
    const b = layout.boxes[id];
    ctx.save();
    ctx.shadowColor = "#0009";
    ctx.shadowBlur = 22 * scale;
    ctx.shadowOffsetY = 10 * scale;
    roundedPath(ctx, b.x, b.y, b.w, b.h, 15 * scale);
    ctx.fillStyle = "#211e1b";
    ctx.fill();
    ctx.restore();
    ctx.save();
    roundedPath(ctx, b.x, b.y, b.w, b.h, 15 * scale);
    ctx.clip();
    drawVideo(ctx, $(id), b.x, b.y, b.w, b.h, true);
    ctx.restore();
    ctx.save();
    roundedPath(ctx, b.x, b.y, b.w, b.h, 15 * scale);
    ctx.strokeStyle = "#efaa65";
    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.stroke();
    let name =
      $(id === "local" ? "localName" : "remoteName").textContent ||
      (id === "local" ? "Anfitrión" : "Invitado");
    const font = Math.max(11, 16 * scale);
    ctx.font = "600 " + font + "px system-ui";
    const max = b.w - 30 * scale;
    while (ctx.measureText(name).width > max && name.length > 2)
      name = name.slice(0, -2) + "…";
    const nw = Math.min(
        max + 12 * scale,
        ctx.measureText(name).width + 24 * scale,
      ),
      nh = 30 * scale;
    roundedPath(
      ctx,
      b.x + 12 * scale,
      b.y + b.h - nh - 12 * scale,
      nw,
      nh,
      8 * scale,
    );
    ctx.fillStyle = "#141311df";
    ctx.fill();
    ctx.fillStyle = "#fff6e9";
    ctx.fillText(name, b.x + 24 * scale, b.y + b.h - 22 * scale);
    ctx.restore();
  }
  const fs = Math.max(12, 21 * scale),
    icon = 40 * scale,
    bx = w - 235 * scale,
    by = 23 * scale;
  if (compositionLogo?.complete && compositionLogo.naturalWidth) {
    ctx.save();
    roundedPath(ctx, bx, by, icon, icon, 11 * scale);
    ctx.clip();
    ctx.drawImage(compositionLogo, bx, by, icon, icon);
    ctx.restore();
  }
  ctx.font = "600 " + fs + "px system-ui";
  ctx.fillStyle = "#fff2de";
  ctx.fillText("Lumen Interview", bx + icon + 10 * scale, by + 27 * scale);
  ctx.save();
  ctx.globalAlpha = Date.now() % 1400 < 700 ? 1 : 0.35;
  ctx.fillStyle = "#ed5261";
  ctx.beginPath();
  ctx.arc(35 * scale, 42 * scale, 5 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.font = "600 " + Math.max(10, 14 * scale) + "px system-ui";
  ctx.fillStyle = "#fff2de";
  ctx.fillText("EN VIVO", 49 * scale, 47 * scale);
}
function spentInvitation() {
  try {
    return (
      validRoom(roomParam) &&
      validToken(tokenParam) &&
      localStorage.getItem("lumen-ended:" + roomParam) === tokenParam
    );
  } catch {
    return false;
  }
}
function closeGuestInvitation() {
  if (!guest) return;
  try {
    localStorage.setItem("lumen-ended:" + roomParam, tokenParam);
  } catch {}
  show("guestEnd");
  show("intro", false);
  show("again", false);
  notice("");
  status("Entrevista finalizada");
}

function fail(e) {
  notice(e?.message || String(e));
  status("Revisar conexión");
}
function send(obj) {
  if (conn?.open) conn.send(obj);
}
function stopTracks(s) {
  s?.getTracks().forEach((t) => t.stop());
}
function setRemote(s) {
  const video = $("remote"),
    changed = video.srcObject !== s;
  remoteStream = s;
  video.muted = true;
  if (changed) video.srcObject = s;
  if (audio && s.getAudioTracks().length && (changed || !playbackSource)) {
    playbackSource?.disconnect();
    playbackSource = audio.createMediaStreamSource(s);
    playbackSource.connect(audio.destination);
  }
  if (changed || video.paused)
    video.play().catch((e) => {
      if (e.name === "AbortError" || ending || video.srcObject !== s) return;
      notice("Pulsa sobre el vídeo si no se muestra la imagen.");
    });
}
$("remote").onclick = () => {
  audio?.resume().catch(fail);
  $("remote").play().catch(fail);
};
function setState(value) {
  if (document.body?.dataset) document.body.dataset.state = value;
}
function waitingMessage(title, text = "") {
  $("waitingTitle").textContent = title;
  $("waitingText").textContent = text;
  show("stageMessage");
}
async function keepAwake() {
  if (wake && !wake.released) return;
  try {
    wake = await navigator.wakeLock?.request("screen");
  } catch {}
}
function waitForHost() {
  if (ending || admitted || rejected) return;
  guestWaiting = true;
  status("En espera del anfitrión");
  notice("");
  waitingMessage("En espera de que el anfitrión se conecte.");
  show("leave");
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    if (!ending && !admitted && !rejected) join();
  }, 5000);
}
function savedInvitation() {
  try {
    const saved = JSON.parse(localStorage.getItem("estudio-room") || "null");
    return validRoom(saved?.room) && validToken(saved?.token) ? saved : null;
  } catch {
    return null;
  }
}
function displayInvitation() {
  const u = new URL(window.ESTUDIO_ENTRY_URL || location.href);
  u.hash = new URLSearchParams({
    room,
    key: token,
    ...(window.ESTUDIO_GUEST_KEY ? { access: window.ESTUDIO_GUEST_KEY } : {}),
  }).toString();
  $("link").value = u.href;
  show("invitation");
  show("create", false);
  show("prepare");
}
function persistInvitation() {
  try {
    localStorage.setItem(
      "estudio-room",
      JSON.stringify({
        room,
        token,
        name: $("name").value.trim(),
        title: $("title").value,
        quality: $("quality").value,
      }),
    );
    return true;
  } catch {
    notice(
      "No se puede conservar el enlace al cerrar este navegador. Mantén esta página abierta.",
    );
    return false;
  }
}
async function openHostRoom() {
  const p = await openPeer(room);
  p.on("connection", bindConn);
  p.on("call", (c) => c.close());
}
async function storage() {
  if (!root) {
    if (!navigator.storage?.getDirectory)
      throw Error(
        "Este navegador no admite almacenamiento local de vídeo. Prueba Chrome o Safari actualizado.",
      );
    root = await (
      await navigator.storage.getDirectory()
    ).getDirectoryHandle("entrevistas", { create: true });
  }
  return root;
}
async function prepare() {
  if (preparing || stream || ending) return;
  preparing = true;
  $("prepare").disabled = true;
  try {
    notice("");
    if (!isSecureContext || !navigator.mediaDevices?.getUserMedia)
      throw Error("Abre la página mediante HTTPS.");
    if (typeof Peer === "undefined")
      throw Error(
        "No se ha podido cargar PeerJS. Comprueba internet y recarga.",
      );
    if (guest && (!$("consent").checked || !$("name").value.trim()))
      throw Error("Introduce tu nombre y acepta la grabación.");
    audio = new AudioContext();
    await audio.resume();
    if (!guest) {
      if (!room) await create();
      if (!room) throw Error("Genera primero el enlace de invitación.");
      if (
        typeof MediaRecorder === "undefined" ||
        !mime() ||
        !HTMLCanvasElement.prototype.captureStream
      )
        throw Error("El navegador no admite la grabación necesaria.");
      await storage();
      const probe = ".probe-" + random();
      const probeWriter = await openWriter(probe);
      try {
        await probeWriter.write(new Blob(["storage-check"]));
        await probeWriter.close();
      } finally {
        await probeWriter.abort().catch(() => {});
        await root.removeEntry(probe).catch(() => {});
      }
      await navigator.storage.persist?.().catch(() => false);
      const estimate = await navigator.storage.estimate?.();
      if (estimate?.quota - estimate?.usage < 100 * 1024 * 1024)
        throw Error("No hay suficiente almacenamiento disponible.");
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: localOrientation === "portrait" ? 720 : 1280 },
        height: { ideal: localOrientation === "portrait" ? 1280 : 720 },
        aspectRatio: { ideal: cameraRatio(localOrientation) },
        frameRate: { ideal: 25, max: 30 },
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    keepAwake();
    $("local").srcObject = stream;
    $("localName").textContent = $("name").value.trim() || "Anfitrión";
    show("controls");
    $("prepare").disabled = true;
    status("Cámara preparada");
    show("stage");
    updateStage();
    show("intro", false);
    setState("studio");
    if (guest) {
      guestWaiting = true;
      show("leave");
      waitingMessage("Conectando…");
      await join();
    } else {
      persistInvitation();
      show("copyLive");
      show("exitHost");
      await openHostRoom();
      status("Estudio abierto");
      waitingMessage(
        "Todo listo por aquí.",
        "Esperando a que entre tu invitado.",
      );
    }
  } catch (e) {
    stopTracks(stream);
    stream = null;
    $("prepare").disabled = false;
    audio?.close().catch(() => {});
    audio = null;
    show("intro");
    show("stage", false);
    show("controls", false);
    setState("home");
    fail(e);
  } finally {
    preparing = false;
  }
}
function openPeer(id) {
  return new Promise((resolve, reject) => {
    const p = new Peer(id, {
      debug: 0,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });
    peer = p;
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        p.destroy();
        reject(Error("No se pudo conectar al servicio de señalización."));
      }
    }, 15000);
    p.on("open", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(p);
      }
    });
    p.on("error", (e) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        p.destroy();
        reject(e);
      } else {
        if (guest && !admitted && !ending && !rejected) {
          waitForHost();
        } else fail(e);
      }
    });
    p.on("disconnected", () => {
      if (!ending && !p.destroyed) {
        status("Reconectando señalización");
        setTimeout(() => {
          if (p.disconnected && !p.destroyed)
            try {
              p.reconnect();
            } catch (e) {
              fail(e);
            }
        }, 1500);
      }
    });
  });
}
function bindCall(c) {
  call = c;
  c.on("stream", (s) => {
    if (c !== call || ending) return;
    setRemote(s);
    show("stageMessage", false);
    status("Conectado");
    if (!guest && !active && !pending) {
      connecting = false;
      pending = true;
      initRecording = beginRecording();
      initRecording.then(
        () => {
          pending = false;
        },
        (e) => {
          pending = false;
          recordError = e;
          fail(e);
          finish(true).catch(fail);
        },
      );
    }
  });
  c.on("error", (e) => {
    fail(e);
    if (!guest && (active || pending)) finish(true).catch(fail);
  });
  c.on("close", () => {
    if (c !== call || ending) return;
    status("Conexión audiovisual interrumpida");
    notice("La conexión se ha interrumpido.");
    if (!guest && (active || pending)) {
      finish(true).catch(fail);
    } else if (guest) {
      cleanup();
      show("recording", false);
      show("again", !guest);
    } else if (!guest && !pending) {
      show("waiting", false);
      show("create", false);
    }
  });
}
function bindConn(c) {
  c.on("data", (d) => {
    if (!d || typeof d !== "object") return;
    if (!guest && d.type === "request") {
      if (
        d.token !== token ||
        d.consent !== true ||
        active ||
        pending ||
        connecting ||
        ending ||
        (conn && conn !== c && conn.open)
      ) {
        c.send({ type: "reject" });
        setTimeout(() => c.close(), 200);
        return;
      }
      conn = c;
      if (validOrientation(d.orientation)) remoteOrientation = d.orientation;
      updateStage();
      $("remoteName").textContent = String(d.name || "Invitado").slice(0, 60);
      $("request").textContent =
        $("remoteName").textContent + " solicita entrar y acepta la grabación.";
      status("Conectando al invitado");
      accept().catch(fail);
    }
    if (c !== conn) return;
    if (d.type === "orientation" && validOrientation(d.value)) {
      remoteOrientation = d.value;
      updateStage();
    }
    if (guest && !admitted && d.type === "accept") {
      if (!$("consent").checked) {
        send({ type: "end" });
        cleanup();
        show("again", !guest);
        return;
      }
      admitted = true;
      if (validOrientation(d.orientation)) remoteOrientation = d.orientation;
      updateStage();
      $("remoteName").textContent = String(d.name || "Anfitrión").slice(0, 60);
      send({ type: "ready" });
      status("Estableciendo videollamada");
      show("leave");
    }
    if (!guest && d.type === "ready" && connecting && !call) {
      try {
        bindCall(peer.call(c.peer, stream, { metadata: { token } }));
      } catch (e) {
        recordError = e;
        finish(true).catch(fail);
      }
    }
    if (guest && d.type === "reject") {
      rejected = true;
      guestWaiting = false;
      clearTimeout(retryTimer);
      status("Invitación no disponible");
      notice("La entrevista ha terminado o ya hay otra persona conectada.");
      c.close();
      cleanup();
      show("again", !guest);
    }
    if (guest && admitted && d.type === "recording") {
      show("recording");
      show("finish", false);
      $("bytes").textContent = "Grabación en el dispositivo del entrevistador";
      startTime = Date.now();
      clearInterval(timer);
      timer = setInterval(tick, 1000);
      status("En vivo");
    }
    if (d.type === "end") {
      if (guest) {
        cleanup();
        status("Entrevista finalizada");
        notice("La entrevista ha terminado.");
        show("recording", false);
        show("leave", false);
        show("again", !guest);
      } else finish(false).catch(fail);
    }
  });
  c.on("close", () => {
    if (c !== conn || ending) return;
    if (!guest && !active && !pending) {
      connecting = false;
      const oldCall = call;
      call = null;
      oldCall?.close();
      stopTracks(remoteStream);
      remoteStream = null;
      $("remote").srcObject = null;
      audio?.close().catch(() => {});
      audio = null;
      conn = null;
      show("waiting", false);
      finish(false).catch(fail);
    } else if (guest && !admitted) {
      waitForHost();
    } else {
      notice(
        "Se ha perdido la señalización. La grabación local puede continuar mientras haya vídeo.",
      );
    }
  });
  c.on("error", (e) => {
    if (guest && !admitted && !ending) waitForHost();
    else fail(e);
  });
}
async function create() {
  if (guest || ending) return;
  notice("");
  const saved = savedInvitation();
  room = room || saved?.room || "entrevista-" + random();
  token = token || saved?.token || random();
  persistInvitation();
  displayInvitation();
  status("Invitación preparada");
}
async function join() {
  if (joining || ending || !stream) return;
  if (!$("consent").checked) {
    fail(Error("Para entrar, acepta la grabación."));
    return;
  }
  if (!validRoom(roomParam) || !validToken(tokenParam)) {
    fail(Error("Invitación no válida."));
    return;
  }
  if (!$("name").value.trim()) {
    fail(Error("Escribe tu nombre para entrar."));
    return;
  }
  joining = true;
  try {
    if (!$("consent").checked || !$("name").value.trim())
      throw Error("Introduce tu nombre y acepta la grabación.");
    if (!validRoom(roomParam) || !validToken(tokenParam))
      throw Error("Invitación no válida.");
    clearTimeout(retryTimer);
    rejected = false;
    admitted = false;
    notice("");
    if (peer?.disconnected && !peer.destroyed) peer.destroy();
    const p =
      peer && !peer.destroyed && !peer.disconnected
        ? peer
        : await openPeer("invitado-" + random());
    if (!p._studioCallsBound) {
      p._studioCallsBound = true;
      p.on("call", (c) => {
        if (
          c.peer !== roomParam ||
          !conn?.open ||
          !admitted ||
          c.metadata?.token !== tokenParam
        ) {
          c.close();
          return;
        }
        bindCall(c);
        c.answer(stream);
      });
    }
    const previous = conn;
    conn = null;
    previous?.close();
    conn = p.connect(roomParam, { reliable: true });
    bindConn(conn);
    const c = conn;
    const timeout = setTimeout(() => {
      if (c === conn && !c.open && !ending && !admitted) {
        c.close();
        waitForHost();
      }
    }, 12000);
    c.on("open", () => {
      if (c !== conn || ending || rejected) {
        c.close();
        return;
      }
      clearTimeout(timeout);
      clearTimeout(retryTimer);
      guestWaiting = false;
      send({
        type: "request",
        token: tokenParam,
        name: $("name").value.trim(),
        consent: true,
        orientation: localOrientation,
      });
      status("Conectando");
      waitingMessage("Conectando tu entrevista…");
      show("leave");
    });
  } catch (e) {
    if (!ending) waitForHost();
  } finally {
    joining = false;
  }
}
async function accept() {
  if (!conn?.open || pending || active || connecting || ending) return;
  connecting = true;
  try {
    show("waiting", false);
    audio = audio || new AudioContext();
    await audio.resume();
    send({
      type: "accept",
      name: $("name").value.trim() || "Anfitrión",
      orientation: localOrientation,
    });
    status("Conectando cámaras");
    const id = ++sessionId;
    setTimeout(() => {
      if (id === sessionId && !active && !pending && !ending && connecting) {
        notice(
          "No se recibió vídeo remoto. Cambia de red e inténtalo de nuevo.",
        );
        connecting = false;
        call?.close();
        call = null;
        conn?.close();
        conn = null;
        audio?.close().catch(() => {});
        audio = null;
        status("Esperando al invitado");
      }
    }, 20000);
  } catch (e) {
    connecting = false;
    fail(e);
    notice("No se pudo iniciar la conexión. Vuelve a entrar al estudio.");
  }
}
function drawVideo(ctx, v, x, y, w, h, cover = false) {
  if (v.readyState < 2 || !v.videoWidth) {
    ctx.fillStyle = "#18243a";
    ctx.fillRect(x, y, w, h);
    return;
  }
  const scale = (cover ? Math.max : Math.min)(
      w / v.videoWidth,
      h / v.videoHeight,
    ),
    dw = v.videoWidth * scale,
    dh = v.videoHeight * scale;
  ctx.drawImage(v, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}
function tick() {
  const t = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
  $("clock").textContent = [
    Math.floor(t / 3600),
    Math.floor(t / 60) % 60,
    t % 60,
  ]
    .map((x) => String(x).padStart(2, "0"))
    .join(":");
  if (!guest)
    $("bytes").textContent = (written / 1e6).toFixed(1) + " MB guardados";
}
async function beginRecording() {
  if (ending || active) return;
  const fmt = mime();
  if (!fmt) throw Error("No hay formato de vídeo compatible.");
  const dir = await storage();
  if (ending) return;
  const { w, h } = recordingSize(
    localOrientation,
    remoteOrientation,
    Number($("quality").value),
  );
  filename =
    safeName($("title").value) +
    "_" +
    new Date().toISOString().replace(/[:.]/g, "-") +
    "_" +
    random().slice(0, 8) +
    (fmt.includes("mp4") ? ".mp4" : ".webm");
  handle = await dir.getFileHandle(filename, { create: true });
  writer = await openWriter(filename);
  if (ending) return;
  written = 0;
  queuedBytes = 0;
  recordError = null;
  chain = Promise.resolve();
  canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false });
  let last = 0;
  function draw(t) {
    if (t - last >= 39) {
      last = t;
      paintComposition(ctx, w, h);
    }
    animation = requestAnimationFrame(draw);
  }
  draw(100);
  audio = audio || new AudioContext();
  await audio.resume();
  const dest = audio.createMediaStreamDestination();
  for (const s of [stream, remoteStream])
    if (s?.getAudioTracks().length) {
      const source = audio.createMediaStreamSource(s),
        gain = audio.createGain();
      gain.gain.value = 0.75;
      source.connect(gain).connect(dest);
    }
  combined = new MediaStream([
    ...canvas.captureStream(25).getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);
  rec = new MediaRecorder(combined, {
    mimeType: fmt,
    videoBitsPerSecond: h === 720 ? 1500000 : 850000,
    audioBitsPerSecond: 128000,
  });
  rec.ondataavailable = (e) => {
    if (!e.data.size || recordError) return;
    if (queuedBytes + e.data.size > MAX_QUEUED_BYTES) {
      recordError = Error(
        "El dispositivo no puede guardar al ritmo de la grabación. Se conserva la parte ya escrita.",
      );
      finish(true).catch(fail);
      return;
    }
    queuedBytes += e.data.size;
    chain = chain
      .then(async () => {
        if (recordError) return;
        try {
          await writer.write(e.data);
          written += e.data.size;
        } finally {
          queuedBytes -= e.data.size;
        }
      })
      .catch((err) => {
        recordError = err;
        notice("Error al guardar: " + err.message);
        finish(true).catch(fail);
      });
  };
  rec.onerror = (e) => {
    recordError = e.error || Error("Error de grabación");
    finish(true).catch(fail);
  };
  rec.start(2000);
  active = true;
  updateStage();
  startTime = Date.now();
  show("recording");
  show("copyLive", false);
  show("exitHost", false);
  setState("recording");
  show("finish");
  show("invitation", false);
  show("waiting", false);
  $("quality").disabled = true;
  timer = setInterval(tick, 1000);
  tick();
  send({ type: "recording" });
  status("En vivo");
  await keepAwake();
}
function cleanup() {
  ending = true;
  guestWaiting = false;
  clearTimeout(retryTimer);
  connecting = false;
  sessionId++;
  clearInterval(timer);
  cancelAnimationFrame(animation);
  wake?.release().catch(() => {});
  playbackSource?.disconnect();
  playbackSource = null;
  audio?.close().catch(() => {});
  stopTracks(combined);
  stopTracks(stream);
  stopTracks(remoteStream);
  call?.close();
  conn?.close();
  peer?.destroy();
  show("controls", false);
  show("stage", false);
  setState("result");
  show("again", !guest);
  if (guest) closeGuestInvitation();
}
function finish(notify = true) {
  if (finishTask) return finishTask;
  finishTask = finishSession(notify);
  return finishTask;
}
async function finishSession(notify = true) {
  if (ending) return;
  ending = true;
  status("Guardando vídeo");
  $("finish").disabled = true;
  if (notify) send({ type: "end" });
  try {
    if (initRecording)
      await initRecording.catch((e) => {
        recordError = e;
      });
    if (rec && rec.state !== "inactive") {
      await new Promise((resolve) => {
        rec.addEventListener("stop", resolve, { once: true });
        rec.stop();
      });
    }
    await chain;
    if (writer) {
      try {
        await writer.close();
      } catch (e) {
        recordError = recordError || e;
        await writer.abort().catch(() => {});
      }
      writer = null;
    }
    if (handle) {
      lastFile = await handle.getFile();
      if (!lastFile.size)
        throw Error(
          recordError?.message || "No se generó un archivo de vídeo.",
        );
      $("resultInfo").textContent =
        (recordError ? "Grabación interrumpida; comprueba el archivo. " : "") +
        lastFile.name +
        " · " +
        (lastFile.size / 1e6).toFixed(1) +
        " MB";
      show("result");
      status("Vídeo disponible");
    } else {
      status("Entrevista finalizada");
      notice(recordError?.message || "No se generó un archivo de vídeo.");
    }
  } catch (e) {
    fail(e);
    try {
      await writer?.abort();
    } catch {}
  } finally {
    active = false;
    cleanup();
    try {
      localStorage.removeItem("estudio-room");
    } catch {}
    refreshFiles().catch(() => {});
  }
}
async function openWriter(name) {
  const worker = new Worker(new URL("storage-worker.js", document.baseURI));
  let seq = 0,
    closed = false;
  const requests = new Map();
  function rejectAll(error) {
    for (const p of requests.values()) {
      clearTimeout(p.timeout);
      p.reject(error);
    }
    requests.clear();
  }
  function terminate() {
    closed = true;
    worker.terminate();
    rejectAll(Error("Almacenamiento cerrado"));
  }
  worker.onmessage = ({ data: m }) => {
    const p = requests.get(m.id);
    if (!p) return;
    requests.delete(m.id);
    clearTimeout(p.timeout);
    m.error ? p.reject(Error(m.error)) : p.resolve();
  };
  worker.onerror = (e) => {
    rejectAll(Error(e.message || "Error de almacenamiento"));
    terminate();
  };
  worker.onmessageerror = () => {
    rejectAll(Error("Respuesta de almacenamiento no válida"));
    terminate();
  };
  function request(type, data = {}) {
    if (closed) return Promise.reject(Error("Almacenamiento cerrado"));
    return new Promise((resolve, reject) => {
      const id = ++seq;
      const timeout = setTimeout(() => {
        requests.delete(id);
        reject(Error("El almacenamiento no responde"));
        terminate();
      }, 10000);
      requests.set(id, { resolve, reject, timeout });
      try {
        worker.postMessage(
          { id, type, ...data },
          data.buffer ? [data.buffer] : [],
        );
      } catch (e) {
        requests.delete(id);
        clearTimeout(timeout);
        reject(e);
      }
    });
  }
  try {
    await request("open", { name });
  } catch (e) {
    terminate();
    throw e;
  }
  return {
    write: async (blob) =>
      request("write", { buffer: await blob.arrayBuffer() }),
    close: async () => {
      try {
        await request("close");
      } finally {
        terminate();
      }
    },
    abort: async () => terminate(),
  };
}
function downloadFile(file) {
  const url = URL.createObjectURL(file),
    a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function refreshFiles() {
  if (guest) return;
  const list = $("files");
  list.replaceChildren();
  try {
    const dir = await storage();
    for await (const [name, h] of dir.entries()) {
      if (h.kind !== "file" || name.startsWith(".probe-")) continue;
      const f = await h.getFile();
      if (!f.size) continue;
      const div = document.createElement("div");
      div.className = "file";
      const title = document.createElement("div");
      title.textContent = name + " · " + (f.size / 1e6).toFixed(1) + " MB";
      const buttons = document.createElement("div");
      buttons.className = "buttons";
      const save = document.createElement("button");
      save.textContent = "Guardar vídeo";
      save.className = "secondary";
      save.onclick = async () => {
        try {
          downloadFile(await h.getFile());
        } catch (e) {
          fail(e);
        }
      };
      const del = document.createElement("button");
      del.textContent = "Eliminar";
      del.className = "secondary";
      del.onclick = async () => {
        if (confirm("¿Eliminar esta grabación local?")) {
          try {
            await dir.removeEntry(name);
            await refreshFiles();
          } catch (e) {
            fail(e);
          }
        }
      };
      buttons.append(save, del);
      div.append(title, buttons);
      list.append(div);
    }
    if (!list.childNodes.length)
      list.textContent = "No hay grabaciones guardadas.";
  } catch (e) {
    list.textContent = "Almacenamiento no disponible: " + e.message;
  }
}
$("prepare").onclick = () => {
  if (guest) {
    if (!$("name").value.trim()) {
      fail(Error("Escribe tu nombre para entrar."));
      return;
    }
    $("consent").checked = true;
  }
  prepare();
};
$("create").onclick = create;
$("detailsToggle").onclick = () => show("hostDetails", $("hostDetails").hidden);
$("libraryToggle").onclick = () =>
  show("libraryContent", $("libraryContent").hidden);
$("copyLive").onclick = () => $("copy").onclick();
$("exitHost").onclick = () => {
  const hadGuest = !!conn?.open;
  send({ type: "end" });
  cleanup();
  if (hadGuest)
    try {
      localStorage.removeItem("estudio-room");
    } catch {}
  location.reload();
};
$("copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("link").value);
    status("Enlace copiado");
  } catch {
    $("link").select();
    notice("Selecciona y copia el enlace.");
  }
};
$("share").onclick = async () => {
  try {
    if (navigator.share)
      await navigator.share({
        title: "Invitación a Lumen Interview",
        url: $("link").value,
      });
    else $("copy").click();
  } catch (e) {
    if (e.name !== "AbortError") fail(e);
  }
};
$("mic").onclick = () => {
  const t = stream.getAudioTracks()[0];
  if (t) {
    t.enabled = !t.enabled;
    $("mic").textContent = t.enabled ? "Micrófono" : "Activar micro";
    $("mic").setAttribute("aria-pressed", String(!t.enabled));
  }
};
$("cam").onclick = () => {
  const t = stream.getVideoTracks()[0];
  if (t) {
    t.enabled = !t.enabled;
    $("cam").textContent = t.enabled ? "Cámara" : "Activar cámara";
    $("cam").setAttribute("aria-pressed", String(!t.enabled));
  }
};
$("finish").onclick = () => finish(true).catch(fail);
$("leave").onclick = () => {
  send({ type: "end" });
  setTimeout(cleanup, 250);
  status("Has salido");
  show("recording", false);
  show("leave", false);
  show("again", !guest);
};
$("download").onclick = () => {
  if (lastFile) downloadFile(lastFile);
};
$("again").onclick = () => location.reload();
window.addEventListener("beforeunload", (e) => {
  if (active || pending) {
    e.preventDefault();
    e.returnValue = "";
  }
});
document.addEventListener("visibilitychange", async () => {
  if (stream && !ending && document.visibilityState === "visible")
    await keepAwake();
});
if (guest) {
  $("remoteName").textContent = "Anfitrión";
  $("heading").textContent = "Tu entrevista.";
  $("eyebrow").textContent = "TU INVITACIÓN";
  $("description").textContent =
    "Acepta la grabación y los permisos para entrar.";
  $("prepare").textContent = "Aceptar y entrar";
  show("prepare");
  show("consentLabel");
  show("detailsToggle", false);
  show("create", false);
  show("library", false);
  show("hostDetails");
  show("titleLabel", false);
  show("qualityLabel", false);
  $("name").placeholder = "Tu nombre";
  $("name").required = true;
  if (spentInvitation()) {
    ending = true;
    closeGuestInvitation();
    show("prepare", false);
  }
} else {
  const saved = savedInvitation();
  if (saved) {
    room = saved.room;
    token = saved.token;
    $("name").value = saved.name || "";
    $("title").value = saved.title || "";
    $("quality").value = saved.quality || "720";
    displayInvitation();
  }
  refreshFiles().catch(() => {});
}
setState(ending ? "result" : "home");
$("focusLocal").onclick = () => focusCamera("local");
$("focusRemote").onclick = () => focusCamera("remote");
$("orientation").onclick = (e) => {
  e.stopPropagation();
  toggleOrientation();
};
if (typeof ResizeObserver !== "undefined")
  new ResizeObserver(updateStage).observe($("stage"));
window.addEventListener("resize", updateStage);

document.addEventListener("visibilitychange", () => {
  if (active && document.visibilityState === "hidden")
    notice(
      "La página ha pasado a segundo plano: el teléfono puede pausar el vídeo. Vuelve a mantener la pantalla activa.",
    );
});

window.addEventListener("pagehide", () => {
  if (guest && admitted) {
    try {
      localStorage.setItem("lumen-ended:" + roomParam, tokenParam);
    } catch {}
  }
});
