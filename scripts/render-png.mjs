import sharp from "sharp";

const [source, destination, requestedWidth] = process.argv.slice(2);
if (!source || !destination) {
  throw new Error("Usage: node scripts/render-png.mjs <source.svg> <destination.png> [width]");
}
const width = Number(requestedWidth || 2400);
if (!Number.isFinite(width) || width <= 0) {
  throw new Error(`Invalid PNG width: ${requestedWidth}`);
}

await sharp(source, { density: 192 })
  .resize({ width, withoutEnlargement: false })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(destination);
