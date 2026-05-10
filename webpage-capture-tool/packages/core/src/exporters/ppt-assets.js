/**
 * PPT 채널 내보내기.
 * 생성물: slides.pptx, images/ 폴더, slides.csv, manifest.json
 */
const fs = require("fs");
const path = require("path");
const PptxGenJS = require("pptxgenjs");
const { BUILTIN_PROFILES } = require("../export-profile");
const {
  buildManifest,
  escapeCsv,
  fitWithinRect,
  materializeExportItems
} = require("./shared");

const PPT_FILE_NAME = "slides.pptx";
const PPT_FONT = "Malgun Gothic";
const PPT_BRAND = {
  navy: "17324D",
  blue: "2563EB",
  sky: "DCEBFF",
  pale: "F4F8FE",
  line: "D6E2F0",
  slate: "5D7187",
  white: "FFFFFF",
  gold: "F59E0B",
  mint: "DFF7EB"
};
const PPT_IMAGE_BOX = {
  x: 0.95,
  y: 1.62,
  w: 11.45,
  h: 4.75
};

function addTopRibbon(slide, pptx) {
  const shape = pptx.ShapeType;
  slide.addShape(shape.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.5,
    fill: { color: PPT_BRAND.navy },
    line: { color: PPT_BRAND.navy, transparency: 100 }
  });
  slide.addText("TOOL HUB", {
    x: 0.55,
    y: 0.14,
    w: 1.5,
    h: 0.16,
    fontFace: PPT_FONT,
    fontSize: 10,
    bold: true,
    color: PPT_BRAND.white,
    margin: 0
  });
  slide.addText("MANUAL CAPTURE WORKBENCH", {
    x: 9.1,
    y: 0.14,
    w: 3.6,
    h: 0.16,
    fontFace: PPT_FONT,
    fontSize: 9,
    color: "DDEBFF",
    align: "right",
    margin: 0
  });
}

function addFooter(slide, label) {
  slide.addText(label, {
    x: 0.65,
    y: 7.05,
    w: 6.2,
    h: 0.18,
    fontFace: PPT_FONT,
    fontSize: 9,
    color: PPT_BRAND.slate,
    margin: 0
  });
}

function addSectionSlide(pptx, number, title, description) {
  const shape = pptx.ShapeType;
  const slide = pptx.addSlide();
  slide.background = { color: PPT_BRAND.navy };
  slide.addShape(shape.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 7.5,
    fill: { color: PPT_BRAND.navy },
    line: { color: PPT_BRAND.navy, transparency: 100 }
  });
  slide.addShape(shape.rect, {
    x: 8.9,
    y: -0.6,
    w: 5.3,
    h: 4.4,
    fill: { color: PPT_BRAND.blue, transparency: 48 },
    line: { color: PPT_BRAND.blue, transparency: 100 },
    rotate: 12
  });
  slide.addShape(shape.rect, {
    x: 9.8,
    y: 4.8,
    w: 4.2,
    h: 3.2,
    fill: { color: PPT_BRAND.gold, transparency: 72 },
    line: { color: PPT_BRAND.gold, transparency: 100 },
    rotate: -10
  });
  slide.addText(`SECTION ${String(number).padStart(2, "0")}`, {
    x: 0.9,
    y: 1.25,
    w: 2.6,
    h: 0.35,
    fontFace: PPT_FONT,
    fontSize: 15,
    bold: true,
    color: PPT_BRAND.sky,
    margin: 0
  });
  slide.addText(title, {
    x: 0.9,
    y: 2.05,
    w: 6.6,
    h: 0.7,
    fontFace: PPT_FONT,
    fontSize: 28,
    bold: true,
    color: PPT_BRAND.white,
    margin: 0
  });
  slide.addText(description, {
    x: 0.92,
    y: 3.1,
    w: 5.8,
    h: 1.1,
    fontFace: PPT_FONT,
    fontSize: 14,
    color: "DDEBFF",
    breakLine: false,
    valign: "mid",
    margin: 0
  });
  return slide;
}

function addCoverSlide(pptx, exportItems, generatedAt) {
  const shape = pptx.ShapeType;
  const slide = pptx.addSlide();
  slide.background = { color: PPT_BRAND.navy };
  slide.addShape(shape.rect, {
    x: 0.65,
    y: 0.82,
    w: 2.9,
    h: 0.38,
    fill: { color: PPT_BRAND.blue },
    line: { color: PPT_BRAND.blue, transparency: 100 }
  });
  slide.addShape(shape.ellipse, {
    x: 9.75,
    y: -0.35,
    w: 3.6,
    h: 3.6,
    fill: { color: PPT_BRAND.blue, transparency: 62 },
    line: { color: PPT_BRAND.blue, transparency: 100 }
  });
  slide.addShape(shape.ellipse, {
    x: 10.25,
    y: 4.65,
    w: 2.7,
    h: 2.7,
    fill: { color: PPT_BRAND.gold, transparency: 76 },
    line: { color: PPT_BRAND.gold, transparency: 100 }
  });
  slide.addText("TOOL HUB CORPORATE TEMPLATE", {
    x: 0.75,
    y: 0.9,
    w: 3.2,
    h: 0.2,
    fontFace: PPT_FONT,
    fontSize: 12,
    bold: true,
    color: PPT_BRAND.white,
    margin: 0
  });
  slide.addText("Manual Capture Workbench", {
    x: 0.75,
    y: 1.85,
    w: 6.8,
    h: 0.65,
    fontFace: PPT_FONT,
    fontSize: 28,
    bold: true,
    color: PPT_BRAND.white,
    margin: 0
  });
  slide.addText("PPT Export Deck", {
    x: 0.75,
    y: 2.6,
    w: 4.2,
    h: 0.3,
    fontFace: PPT_FONT,
    fontSize: 18,
    color: PPT_BRAND.sky,
    margin: 0
  });
  slide.addText("캡처 결과를 발표용 문서 초안으로 정리한 기업형 슬라이드 세트입니다.", {
    x: 0.78,
    y: 3.2,
    w: 5.5,
    h: 0.6,
    fontFace: PPT_FONT,
    fontSize: 14,
    color: "DDEBFF",
    margin: 0
  });
  slide.addShape(shape.rect, {
    x: 0.78,
    y: 5.1,
    w: 3.05,
    h: 1.32,
    fill: { color: "FFFFFF", transparency: 4 },
    line: { color: "FFFFFF", transparency: 84 }
  });
  slide.addText(`${exportItems.length} Screens`, {
    x: 1.02,
    y: 5.42,
    w: 2.6,
    h: 0.36,
    fontFace: PPT_FONT,
    fontSize: 20,
    bold: true,
    color: PPT_BRAND.white,
    margin: 0,
    align: "center"
  });
  slide.addText(generatedAt, {
    x: 0.85,
    y: 6.95,
    w: 4.2,
    h: 0.2,
    fontFace: PPT_FONT,
    fontSize: 9,
    color: PPT_BRAND.sky,
    margin: 0
  });
}

function addOverviewSlide(pptx, exportItems, profile, generatedAt) {
  const shape = pptx.ShapeType;
  const slide = pptx.addSlide();
  slide.background = { color: PPT_BRAND.pale };
  addTopRibbon(slide, pptx);
  slide.addText("문서 개요", {
    x: 0.75,
    y: 0.88,
    w: 3.0,
    h: 0.35,
    fontFace: PPT_FONT,
    fontSize: 22,
    bold: true,
    color: PPT_BRAND.navy,
    margin: 0
  });
  slide.addText("내보내기 결과의 구조와 사용 목적을 빠르게 파악할 수 있도록 정리한 요약 슬라이드입니다.", {
    x: 0.76,
    y: 1.22,
    w: 6.4,
    h: 0.4,
    fontFace: PPT_FONT,
    fontSize: 11,
    color: PPT_BRAND.slate,
    margin: 0
  });

  const cards = [
    { x: 0.78, title: "총 화면 수", value: `${exportItems.length}개`, color: PPT_BRAND.blue },
    { x: 4.48, title: "이미지 규격", value: `${profile.imageWidth}px`, color: PPT_BRAND.navy },
    { x: 8.18, title: "생성 시각", value: generatedAt.split(" ").slice(0, 2).join(" "), color: PPT_BRAND.gold }
  ];
  cards.forEach((card) => {
    slide.addShape(shape.rect, {
      x: card.x,
      y: 1.85,
      w: 3.05,
      h: 1.16,
      fill: { color: "FFFFFF" },
      line: { color: PPT_BRAND.line, pt: 1 }
    });
    slide.addText(card.title, {
      x: card.x + 0.2,
      y: 2.02,
      w: 1.6,
      h: 0.2,
      fontFace: PPT_FONT,
      fontSize: 10,
      color: PPT_BRAND.slate,
      margin: 0
    });
    slide.addText(card.value, {
      x: card.x + 0.2,
      y: 2.28,
      w: 2.4,
      h: 0.35,
      fontFace: PPT_FONT,
      fontSize: 19,
      bold: true,
      color: card.color,
      margin: 0
    });
  });

  slide.addShape(shape.rect, {
    x: 0.78,
    y: 3.45,
    w: 5.95,
    h: 2.45,
    fill: { color: "FFFFFF" },
    line: { color: PPT_BRAND.line, pt: 1 }
  });
  slide.addText("출력 구성", {
    x: 1.0,
    y: 3.68,
    w: 1.8,
    h: 0.22,
    fontFace: PPT_FONT,
    fontSize: 13,
    bold: true,
    color: PPT_BRAND.navy,
    margin: 0
  });
  [
    "표지 슬라이드와 섹션 슬라이드로 발표 흐름을 먼저 구성합니다.",
    "각 화면은 제목, 이미지, 캡션, 발표 메모가 포함된 본문 슬라이드로 생성됩니다.",
    "이미지는 16:9 발표 화면에 맞게 비율을 유지한 채 배치됩니다."
  ].forEach((line, idx) => {
    slide.addText(`• ${line}`, {
      x: 1.05,
      y: 4.08 + idx * 0.43,
      w: 5.25,
      h: 0.28,
      fontFace: PPT_FONT,
      fontSize: 11,
      color: "334155",
      margin: 0
    });
  });

  slide.addShape(shape.rect, {
    x: 7.05,
    y: 3.45,
    w: 5.5,
    h: 2.45,
    fill: { color: PPT_BRAND.mint },
    line: { color: "B7E1CB", pt: 1 }
  });
  slide.addText("권장 사용 방식", {
    x: 7.28,
    y: 3.68,
    w: 2.0,
    h: 0.22,
    fontFace: PPT_FONT,
    fontSize: 13,
    bold: true,
    color: PPT_BRAND.navy,
    margin: 0
  });
  [
    "표지와 섹션 슬라이드는 발표 흐름용 기준 페이지로 활용합니다.",
    "본문 슬라이드는 데모, 릴리즈 리뷰, 사용자 가이드 발표 자료에 그대로 옮겨 쓰기 좋습니다.",
    "발표 메모는 설명 포인트를 바로 붙일 수 있도록 notes 영역에 저장됩니다."
  ].forEach((line, idx) => {
    slide.addText(`• ${line}`, {
      x: 7.32,
      y: 4.08 + idx * 0.43,
      w: 4.9,
      h: 0.3,
      fontFace: PPT_FONT,
      fontSize: 11,
      color: "24543A",
      margin: 0
    });
  });
  addFooter(slide, "Section 01 · Document Overview");
}

function addContentSlide(pptx, item, slideNo, totalSlides) {
  const shape = pptx.ShapeType;
  const slide = pptx.addSlide();
  slide.background = { color: PPT_BRAND.pale };
  addTopRibbon(slide, pptx);
  slide.addText(`${item.index}. ${item.title}`, {
    x: 0.78,
    y: 0.86,
    w: 7.2,
    h: 0.36,
    fontFace: PPT_FONT,
    fontSize: 21,
    bold: true,
    color: PPT_BRAND.navy,
    margin: 0
  });
  slide.addText(item.imageFilename, {
    x: 0.8,
    y: 1.18,
    w: 5.3,
    h: 0.2,
    fontFace: PPT_FONT,
    fontSize: 10,
    color: PPT_BRAND.slate,
    margin: 0
  });
  slide.addText(`Slide ${slideNo} / ${totalSlides}`, {
    x: 10.55,
    y: 0.9,
    w: 1.7,
    h: 0.2,
    fontFace: PPT_FONT,
    fontSize: 10,
    color: PPT_BRAND.slate,
    align: "right",
    margin: 0
  });
  slide.addShape(shape.rect, {
    x: 0.78,
    y: 1.48,
    w: 11.8,
    h: 5.28,
    fill: { color: "FFFFFF" },
    line: { color: PPT_BRAND.line, pt: 1.1 }
  });

  if (item.hasImage) {
    const fitted = fitWithinRect(
      item.imageWidth,
      item.imageHeight,
      PPT_IMAGE_BOX.w,
      PPT_IMAGE_BOX.h
    );
    slide.addImage({
      path: item.absoluteImagePath,
      x: PPT_IMAGE_BOX.x + (PPT_IMAGE_BOX.w - fitted.width) / 2,
      y: PPT_IMAGE_BOX.y + (PPT_IMAGE_BOX.h - fitted.height) / 2,
      w: fitted.width,
      h: fitted.height,
      altText: item.altText
    });
  } else {
    slide.addText(`이미지를 찾지 못했습니다.\n${item.sourceImagePath}`, {
      x: PPT_IMAGE_BOX.x,
      y: PPT_IMAGE_BOX.y + 1.75,
      w: PPT_IMAGE_BOX.w,
      h: 0.8,
      fontFace: PPT_FONT,
      fontSize: 16,
      color: "C0392B",
      align: "center",
      valign: "mid",
      margin: 0
    });
  }

  if (item.caption) {
    slide.addText(item.caption, {
      x: 0.98,
      y: 6.9,
      w: 11.35,
      h: 0.24,
      fontFace: PPT_FONT,
      fontSize: 10.5,
      italic: true,
      color: PPT_BRAND.slate,
      align: "center",
      margin: 0
    });
  }

  const notes = [
    item.caption ? `캡션: ${item.caption}` : "",
    item.speakerNote ? `발표 메모: ${item.speakerNote}` : ""
  ].filter(Boolean).join("\n\n");
  if (notes) {
    slide.addNotes(notes);
  }

  addFooter(slide, "Section 02 · Capture Screens");
}

/**
 * @param {Array<{slug: string, title?: string, caption?: string, speakerNote?: string, imagePath: string}>} items
 * @param {string} outputDir
 * @param {object} [profileOverride]
 */
async function exportPptAssets(items, outputDir, profileOverride) {
  const profile = Object.assign({}, BUILTIN_PROFILES.ppt, profileOverride || {});
  const exportItems = await materializeExportItems(items, outputDir, profile);
  const generatedAt = new Date().toLocaleString("ko-KR");
  const csvRows = ["index,filename,title,caption,speakerNote"];
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "webpage-capture-tool";
  pptx.company = "webpage-capture-tool";
  pptx.subject = "Manual Capture Workbench Export";
  pptx.title = "Manual Capture Workbench Export";
  pptx.lang = "ko-KR";
  pptx.theme = {
    headFontFace: PPT_FONT,
    bodyFontFace: PPT_FONT
  };

  addCoverSlide(pptx, exportItems, generatedAt);
  addSectionSlide(pptx, 1, "문서 개요", "이 PPT가 어떤 구조로 생성됐는지, 발표 자료에서 어떻게 활용하면 좋은지를 먼저 요약합니다.");
  addOverviewSlide(pptx, exportItems, profile, generatedAt);
  addSectionSlide(pptx, 2, "캡처 화면", "이 섹션부터는 실제 캡처 결과가 슬라이드별로 정리됩니다. 각 슬라이드는 제목, 이미지, 캡션, 발표 메모를 함께 가집니다.");
  const totalSlides = exportItems.length + 4;

  for (const item of exportItems) {
    csvRows.push([
      item.index,
      escapeCsv(item.imageFilename),
      escapeCsv(item.title),
      escapeCsv(item.caption),
      escapeCsv(item.speakerNote)
    ].join(","));
    addContentSlide(pptx, item, item.index + 4, totalSlides);
  }

  fs.writeFileSync(path.join(outputDir, "slides.csv"), csvRows.join("\n"), "utf8");

  const presentationPath = path.join(outputDir, PPT_FILE_NAME);
  await pptx.writeFile({ fileName: presentationPath });

  const manifest = buildManifest("ppt", profile, exportItems, {
    presentationPath: `./${PPT_FILE_NAME}`,
    slideCount: totalSlides,
    template: "tool-hub-corporate-blue-v2"
  });
  fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  return {
    outputDir,
    count: items.length,
    presentationPath,
    presentationFile: PPT_FILE_NAME,
    manifest
  };
}

module.exports = { exportPptAssets };
