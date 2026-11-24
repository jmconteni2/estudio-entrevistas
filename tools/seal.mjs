import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { webcrypto as crypto } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const password = process.env.ESTUDIO_PASSWORD;
if (!password)
  throw Error(
    "ESTUDIO_PASSWORD debe establecerse solo en el entorno de construcción, nunca en el repositorio.",
  );
const enc = new TextEncoder();
const b64 = (b) => Buffer.from(b).toString("base64");
let guestKeyBytes = crypto.getRandomValues(new Uint8Array(32));
if (!process.env.ESTUDIO_TEST_BUILD && !process.env.ESTUDIO_ROTATE_INVITES) {
  try {
    const old = JSON.parse(
      await readFile(path.join(root, "docs", "sealed-host.json"), "utf8"),
    );
    const material = await crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    const oldKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: Buffer.from(old.salt, "base64"),
        iterations: old.iterations,
        hash: "SHA-256",
      },
      material,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
    const oldPayload = JSON.parse(
      new TextDecoder().decode(
        await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: Buffer.from(old.iv, "base64"),
            additionalData: enc.encode("estudio:host:v1"),
          },
          oldKey,
          Buffer.from(old.ciphertext, "base64"),
        ),
      ),
    );
    const match = oldPayload.code.match(
      /window\.ESTUDIO_GUEST_KEY="([A-Za-z0-9_-]+)"/,
    );
    if (!match) throw Error("No se pudo recuperar la clave de invitaciones.");
    guestKeyBytes = new Uint8Array(Buffer.from(match[1], "base64url"));
  } catch (e) {
    if (e.code !== "ENOENT")
      throw Error(
        "No se han regenerado los paquetes para proteger las invitaciones existentes. Revisa la contraseña de construcción.",
      );
  }
}
const guestKey = await crypto.subtle.importKey(
  "raw",
  guestKeyBytes,
  "AES-GCM",
  false,
  ["encrypt"],
);
const salt = crypto.getRandomValues(new Uint8Array(16));
const keyMaterial = await crypto.subtle.importKey(
  "raw",
  enc.encode(password),
  "PBKDF2",
  false,
  ["deriveKey"],
);
const iterations = 310000;
const hostKey = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
  keyMaterial,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt"],
);
const html = await readFile(path.join(root, "index.html"), "utf8");
const js = await readFile(path.join(root, "app.js"), "utf8");
async function seal(role, key) {
  const code =
    `window.ESTUDIO_MODE=${JSON.stringify(role)};` +
    (role === "host"
      ? `window.ESTUDIO_GUEST_KEY=${JSON.stringify(Buffer.from(guestKeyBytes).toString("base64url"))};`
      : "") +
    js;
  const payload = JSON.stringify({ html, code });
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: enc.encode("estudio:" + role + ":v1"),
    },
    key,
    enc.encode(payload),
  );
  const envelope = {
    version: 1,
    role,
    iv: b64(iv),
    ciphertext: b64(encrypted),
    ...(role === "host" ? { salt: b64(salt), iterations } : {}),
  };
  await writeFile(
    path.join(root, "docs", `sealed-${role}.json`),
    JSON.stringify(envelope),
  );
}
await mkdir(path.join(root, "docs", "vendor"), { recursive: true });
await seal("host", hostKey);
await seal("guest", guestKey);
for (const name of [
  "style.css",
  "storage-worker.js",
  ".nojekyll",
  "vendor/peerjs-1.5.5.min.js",
  "vendor/PeerJS-LICENSE.txt",
])
  await copyFile(path.join(root, name), path.join(root, "docs", name));
console.log(
  "Paquetes de anfitrión e invitado cifrados; contraseña excluida de la publicación.",
);
