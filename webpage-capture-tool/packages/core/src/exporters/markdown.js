/**
 * Markdown 채널 내보내기.
 * 생성물: manual.md, images/ 폴더, manifest.json
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { BUILTIN_PROFILES, resolveFilename, resolveUniqueFilename } = require("../export-profile");

/**
 * @param {Array<{slug: string, title?: string, caption?: string, altText?: string, imagePath: string}>} items
 * @param {string} outputDir
 * @param {object} [profileOverride]
 */
async function exportMarkdown(items, outputDir, profileOverride) {
  const profile = Object.assign({}, BUILTIN_PROFILES.markdown, profileOverride || {});
  const imagesDir = path.join(outputDir, "images");

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

  const manifestItems = [];
  const usedNames = new Set();
  let mdContent = "# 매뉴얼\n\n";

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const baseName = resolveUniqueFilename(
      resolveFilename(profile.namingPattern, { index: i + 1, title: item.title || item.slug }),
      usedNames
    );
    const imgFilename = `${baseName}.png`;
    const destPath = path.join(imagesDir, imgFilename);

    // 이미지 리사이즈 후 복사
    if (item.imagePath && fs.existsSync(item.imagePath)) {
      await sharp(item.imagePath)
        .resize(profile.imageWidth, null, { fit: "inside", withoutEnlargement: true })
        .png()
        .toFile(destPath);
    }

    const altText = item.altText || item.title || baseName;
    const caption = item.caption || "";
    const section = `## ${i + 1}. ${item.title || baseName}\n\n![${altText}](./images/${imgFilename})\n\n${caption}\n\n`;
    mdContent += section;

    manifestItems.push({
      index: i + 1,
      slug: item.slug || baseName,
      title: item.title || "",
      imagePath: `./images/${imgFilename}`,
      caption,
      altText
    });
  }

  fs.writeFileSync(path.join(outputDir, "manual.md"), mdContent, "utf8");

  const manifest = {
    channel: "markdown",
    preset: profile.preset,
    exportedAt: new Date().toISOString(),
    items: manifestItems
  };
  fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  return { outputDir, count: items.length, manifest };
}

module.exports = { exportMarkdown };
