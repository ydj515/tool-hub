/**
 * PPT Assets 채널 내보내기.
 * 생성물: ppt-assets/images/ 폴더, slides.csv, manifest.json
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { BUILTIN_PROFILES, resolveFilename, resolveUniqueFilename } = require("../export-profile");

/**
 * @param {Array<{slug: string, title?: string, caption?: string, speakerNote?: string, imagePath: string}>} items
 * @param {string} outputDir
 * @param {object} [profileOverride]
 */
async function exportPptAssets(items, outputDir, profileOverride) {
  const profile = Object.assign({}, BUILTIN_PROFILES.ppt, profileOverride || {});
  const assetsDir = path.join(outputDir, "images");

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const manifestItems = [];
  const usedNames = new Set();
  const csvRows = ["index,filename,title,caption,speakerNote"];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const baseName = resolveUniqueFilename(
      resolveFilename(profile.namingPattern, { index: i + 1, title: item.title || item.slug }),
      usedNames
    );
    const imgFilename = `${baseName}.png`;
    const destPath = path.join(assetsDir, imgFilename);

    if (item.imagePath && fs.existsSync(item.imagePath)) {
      await sharp(item.imagePath)
        .resize(profile.imageWidth, null, { fit: "inside", withoutEnlargement: true })
        .png()
        .toFile(destPath);
    }

    const caption = item.caption || "";
    const title = item.title || baseName;
    const speakerNote = item.speakerNote || "";
    csvRows.push(`${i + 1},"${imgFilename}","${title}","${caption}","${speakerNote}"`);

    manifestItems.push({
      index: i + 1,
      slug: item.slug || baseName,
      title,
      imagePath: `./images/${imgFilename}`,
      caption,
      speakerNote,
      altText: item.altText || title
    });
  }

  fs.writeFileSync(path.join(outputDir, "slides.csv"), csvRows.join("\n"), "utf8");

  const manifest = {
    channel: "ppt",
    preset: profile.preset,
    exportedAt: new Date().toISOString(),
    items: manifestItems
  };
  fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  return { outputDir, count: items.length, manifest };
}

module.exports = { exportPptAssets };
