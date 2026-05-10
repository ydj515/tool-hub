const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { resolveFilename, resolveUniqueFilename } = require("../export-profile");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function escapeCsv(value) {
  return `"${String(value || "").replace(/"/g, "\"\"")}"`;
}

function fitWithinBox(width, height, maxWidth, maxHeight) {
  const safeWidth = Math.max(1, width || maxWidth || 1);
  const safeHeight = Math.max(1, height || maxHeight || 1);
  const ratio = Math.min(maxWidth / safeWidth, maxHeight / safeHeight, 1);
  return {
    width: Math.max(1, Math.round(safeWidth * ratio)),
    height: Math.max(1, Math.round(safeHeight * ratio))
  };
}

function fitWithinRect(width, height, maxWidth, maxHeight) {
  const safeWidth = Math.max(1, width || maxWidth || 1);
  const safeHeight = Math.max(1, height || maxHeight || 1);
  const ratio = Math.min(maxWidth / safeWidth, maxHeight / safeHeight, 1);
  return {
    width: safeWidth * ratio,
    height: safeHeight * ratio
  };
}

async function materializeExportItems(items, outputDir, profile) {
  const imagesDir = path.join(outputDir, "images");
  ensureDir(outputDir);
  ensureDir(imagesDir);

  const usedNames = new Set();
  const manifestItems = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const title = item.title || item.slug || `item_${i + 1}`;
    const baseName = resolveUniqueFilename(
      resolveFilename(profile.namingPattern, { index: i + 1, title }),
      usedNames
    );
    const imageFilename = `${baseName}.png`;
    const destPath = path.join(imagesDir, imageFilename);

    let imageWidth = 0;
    let imageHeight = 0;
    let hasImage = false;

    if (item.imagePath && fs.existsSync(item.imagePath)) {
      const info = await sharp(item.imagePath)
        .resize(profile.imageWidth, null, { fit: "inside", withoutEnlargement: true })
        .png()
        .toFile(destPath);
      imageWidth = info.width || 0;
      imageHeight = info.height || 0;
      hasImage = true;
    }

    manifestItems.push({
      index: i + 1,
      slug: item.slug || baseName,
      title,
      caption: item.caption || "",
      altText: item.altText || title,
      speakerNote: item.speakerNote || "",
      imageFilename,
      imagePath: `./images/${imageFilename}`,
      absoluteImagePath: destPath,
      sourceImagePath: item.imagePath || "",
      imageWidth,
      imageHeight,
      hasImage
    });
  }

  return manifestItems;
}

function buildManifest(channel, profile, items, extra = {}) {
  return {
    channel,
    preset: profile.preset,
    exportedAt: new Date().toISOString(),
    items: items.map((item) => ({
      index: item.index,
      slug: item.slug,
      title: item.title,
      imagePath: item.imagePath,
      caption: item.caption,
      altText: item.altText,
      speakerNote: item.speakerNote || ""
    })),
    ...extra
  };
}

module.exports = {
  ensureDir,
  escapeCsv,
  fitWithinBox,
  fitWithinRect,
  materializeExportItems,
  buildManifest
};
