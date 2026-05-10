/**
 * Markdown 채널 내보내기.
 * 생성물: manual.md, images/ 폴더, manifest.json
 */
const fs = require("fs");
const path = require("path");
const { BUILTIN_PROFILES } = require("../export-profile");
const { materializeExportItems, buildManifest } = require("./shared");

/**
 * @param {Array<{slug: string, title?: string, caption?: string, altText?: string, imagePath: string}>} items
 * @param {string} outputDir
 * @param {object} [profileOverride]
 */
async function exportMarkdown(items, outputDir, profileOverride) {
  const profile = Object.assign({}, BUILTIN_PROFILES.markdown, profileOverride || {});
  const exportItems = await materializeExportItems(items, outputDir, profile);
  let mdContent = "# 매뉴얼\n\n";

  for (const item of exportItems) {
    const imageLine = item.hasImage
      ? `![${item.altText}](${item.imagePath})`
      : `> 이미지를 찾지 못했습니다: ${item.sourceImagePath}`;
    const section = `## ${item.index}. ${item.title}\n\n${imageLine}\n\n${item.caption}\n\n`;
    mdContent += section;
  }

  fs.writeFileSync(path.join(outputDir, "manual.md"), mdContent, "utf8");
  const documentPath = path.join(outputDir, "manual.md");

  const manifest = buildManifest("markdown", profile, exportItems, {
    documentPath: "./manual.md"
  });
  fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  return {
    outputDir,
    count: items.length,
    documentPath,
    documentFile: "manual.md",
    manifest
  };
}

module.exports = { exportMarkdown };
