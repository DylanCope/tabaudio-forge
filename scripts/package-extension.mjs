import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const checkOnly = process.argv.includes("--check");

const packageEntries = [
  "manifest.json",
  "popup.html",
  "popup.js",
  "service-worker.js",
  "offscreen.html",
  "offscreen.js",
  "i18n.js",
  "styles.css",
  "_locales/en/messages.json",
  "_locales/ru/messages.json",
  "icons/icon16.png",
  "icons/icon32.png",
  "icons/icon48.png",
  "icons/icon128.png",
];

const requiredIconSizes = ["16", "32", "48", "128"];

function readUInt32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function readUInt16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { dosDate, dosTime };
}

async function readJson(relativePath) {
  const filePath = path.join(rootDir, relativePath);
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content);
}

async function assertFile(relativePath) {
  const filePath = path.join(rootDir, relativePath);
  const fileStat = await stat(filePath).catch(() => null);

  if (!fileStat?.isFile()) {
    throw new Error(`Missing required file: ${relativePath}`);
  }

  return fileStat;
}

function assertPng(relativePath) {
  if (!relativePath.toLowerCase().endsWith(".png")) {
    throw new Error(`Manifest icon must be a PNG file: ${relativePath}`);
  }
}

async function validateManifest() {
  const manifest = await readJson("manifest.json");
  const packageJson = await readJson("package.json");

  if (manifest.manifest_version !== 3) {
    throw new Error("manifest.json must use manifest_version 3");
  }

  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(manifest.version ?? "")) {
    throw new Error("manifest.json version must be a Chrome-compatible version string");
  }

  if (packageJson.version !== manifest.version) {
    throw new Error("package.json version must match manifest.json version");
  }

  if (manifest.default_locale) {
    await readJson(`_locales/${manifest.default_locale}/messages.json`);
  }

  for (const size of requiredIconSizes) {
    const iconPath = manifest.icons?.[size];
    const actionIconPath = manifest.action?.default_icon?.[size];

    if (!iconPath) {
      throw new Error(`manifest.json is missing icons.${size}`);
    }

    if (actionIconPath !== iconPath) {
      throw new Error(`action.default_icon.${size} must match icons.${size}`);
    }

    assertPng(iconPath);
    await assertFile(iconPath);
  }

  await assertFile(manifest.action?.default_popup ?? "");
  await assertFile(manifest.background?.service_worker ?? "");

  return manifest;
}

async function validatePackageEntries() {
  const seen = new Set();

  for (const relativePath of packageEntries) {
    if (seen.has(relativePath)) {
      throw new Error(`Duplicate package entry: ${relativePath}`);
    }

    if (relativePath.startsWith("docs/") || relativePath.startsWith(".github/")) {
      throw new Error(`Unexpected non-extension entry in package allowlist: ${relativePath}`);
    }

    seen.add(relativePath);
    await assertFile(relativePath);
  }
}

async function buildZip(entries, outputPath) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const relativePath of entries) {
    const normalizedPath = relativePath.replaceAll(path.sep, "/");
    const filePath = path.join(rootDir, relativePath);
    const [content, fileStat] = await Promise.all([readFile(filePath), stat(filePath)]);
    const name = Buffer.from(normalizedPath, "utf8");
    const checksum = crc32(content);
    const { dosDate, dosTime } = getDosDateTime(fileStat.mtime);

    const localHeader = Buffer.concat([
      readUInt32(0x04034b50),
      readUInt16(20),
      readUInt16(0x0800),
      readUInt16(0),
      readUInt16(dosTime),
      readUInt16(dosDate),
      readUInt32(checksum),
      readUInt32(content.length),
      readUInt32(content.length),
      readUInt16(name.length),
      readUInt16(0),
      name,
    ]);

    const centralHeader = Buffer.concat([
      readUInt32(0x02014b50),
      readUInt16(20),
      readUInt16(20),
      readUInt16(0x0800),
      readUInt16(0),
      readUInt16(dosTime),
      readUInt16(dosDate),
      readUInt32(checksum),
      readUInt32(content.length),
      readUInt32(content.length),
      readUInt16(name.length),
      readUInt16(0),
      readUInt16(0),
      readUInt16(0),
      readUInt16(0),
      readUInt32(0),
      readUInt32(offset),
      name,
    ]);

    localParts.push(localHeader, content);
    centralParts.push(centralHeader);
    offset += localHeader.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.concat([
    readUInt32(0x06054b50),
    readUInt16(0),
    readUInt16(0),
    readUInt16(entries.length),
    readUInt16(entries.length),
    readUInt32(centralDirectory.length),
    readUInt32(offset),
    readUInt16(0),
  ]);

  await writeFile(outputPath, Buffer.concat([...localParts, centralDirectory, endOfCentralDirectory]));
}

async function main() {
  const manifest = await validateManifest();
  await validatePackageEntries();

  if (checkOnly) {
    console.log(`Extension package inputs are valid for version ${manifest.version}.`);
    return;
  }

  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  const outputName = `tabaudio-forge-${manifest.version}.zip`;
  const outputPath = path.join(distDir, outputName);
  await buildZip(packageEntries, outputPath);

  console.log(`Created ${path.relative(rootDir, outputPath).replaceAll(path.sep, "/")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
