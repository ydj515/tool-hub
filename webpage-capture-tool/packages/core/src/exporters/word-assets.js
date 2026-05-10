/**
 * Word 채널 내보내기.
 * 생성물: manual.docx, images/ 폴더, captions.csv, manifest.json
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  PageNumber,
  TableOfContents,
  TextRun
} = require("docx");
const { BUILTIN_PROFILES } = require("../export-profile");
const {
  buildManifest,
  escapeCsv,
  fitWithinBox,
  materializeExportItems
} = require("./shared");

const WORD_DOC_FILENAME = "manual.docx";
const WORD_IMAGE_MAX_WIDTH = 520;
const WORD_IMAGE_MAX_HEIGHT = 700;
const WORD_FONT = "Malgun Gothic";
const WORD_COLORS = {
  navy: "17324D",
  blue: "2563EB",
  sky: "EAF2FF",
  slate: "5D7187",
  line: "D6E2F0",
  danger: "C0392B"
};

async function createCoverBannerBuffer() {
  const width = 1400;
  const height = 300;
  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#17324D" />
          <stop offset="100%" stop-color="#2563EB" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" rx="36" fill="url(#hero)" />
      <circle cx="${width - 180}" cy="70" r="140" fill="rgba(255,255,255,0.12)" />
      <circle cx="${width - 60}" cy="${height - 10}" r="170" fill="rgba(255,255,255,0.08)" />
      <text x="72" y="92" fill="#BFD7FF" font-size="30" font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif" font-weight="700">TOOL HUB CORPORATE TEMPLATE</text>
      <text x="72" y="170" fill="#FFFFFF" font-size="64" font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif" font-weight="800">Manual Capture Workbench</text>
      <text x="72" y="224" fill="#EAF2FF" font-size="28" font-family="Malgun Gothic, Apple SD Gothic Neo, sans-serif">웹페이지 캡처 결과를 문서 초안으로 정리한 Word Export</text>
    </svg>
  `;

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: "#FFFFFF"
    }
  }).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
}

function createWordStyles() {
  return {
    default: {
      document: {
        paragraph: {
          spacing: { line: 300, after: 120 }
        },
        run: {
          font: WORD_FONT,
          size: 20,
          color: "2B3440"
        }
      },
      title: {
        run: {
          font: WORD_FONT,
          size: 40,
          bold: true,
          color: WORD_COLORS.navy
        }
      },
      heading1: {
        run: {
          font: WORD_FONT,
          size: 28,
          bold: true,
          color: WORD_COLORS.blue
        },
        paragraph: {
          spacing: { before: 120, after: 180 }
        }
      },
      heading2: {
        run: {
          font: WORD_FONT,
          size: 22,
          bold: true,
          color: WORD_COLORS.navy
        }
      }
    }
  };
}

function createHeader() {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: {
          bottom: {
            color: WORD_COLORS.line,
            size: 6,
            space: 1
          }
        },
        spacing: { after: 80 },
        children: [
          new TextRun({
            text: "TOOL HUB · MANUAL CAPTURE WORKBENCH",
            font: WORD_FONT,
            size: 16,
            color: WORD_COLORS.slate,
            bold: true
          })
        ]
      })
    ]
  });
}

function createFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top: {
            color: WORD_COLORS.line,
            size: 6,
            space: 1
          }
        },
        spacing: { before: 80 },
        children: [
          new TextRun({
            children: ["TOOL HUB DOCUMENT TEMPLATE  |  페이지 ", PageNumber.CURRENT],
            font: WORD_FONT,
            size: 16,
            color: WORD_COLORS.slate
          })
        ]
      })
    ]
  });
}

function createCoverChildren(exportItems, profile, generatedAt, coverBanner) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [
        new ImageRun({
          data: coverBanner,
          transformation: {
            width: 520,
            height: 111
          }
        })
      ]
    }),
    new Paragraph({
      text: "사용 설명서 캡처 문서",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 }
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      children: [
        new TextRun({
          text: "웹페이지 캡처 결과를 정리하고 배포용 초안으로 바로 활용할 수 있도록 구성한 corporate-style Word 문서입니다.",
          font: WORD_FONT,
          size: 22,
          color: WORD_COLORS.slate
        })
      ]
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: "문서 개요",
          font: WORD_FONT
        })
      ]
    }),
    new Paragraph({
      shading: { fill: WORD_COLORS.sky },
      border: {
        top: { color: WORD_COLORS.line, size: 8 },
        bottom: { color: WORD_COLORS.line, size: 8 },
        left: { color: WORD_COLORS.line, size: 8 },
        right: { color: WORD_COLORS.line, size: 8 }
      },
      spacing: { after: 240 },
      children: [
        new TextRun({ text: `총 화면 수: ${exportItems.length}개`, bold: true, color: WORD_COLORS.navy, font: WORD_FONT }),
        new TextRun({ text: "", break: 1 }),
        new TextRun({ text: `생성 시각: ${generatedAt}`, color: WORD_COLORS.slate, font: WORD_FONT }),
        new TextRun({ text: "", break: 1 }),
        new TextRun({ text: `출력 규격: ${profile.imageWidth}px 기준 이미지 최적화`, color: WORD_COLORS.slate, font: WORD_FONT }),
        new TextRun({ text: "", break: 1 }),
        new TextRun({ text: "브랜드 템플릿: TOOL HUB Corporate Blue", color: WORD_COLORS.slate, font: WORD_FONT })
      ]
    }),
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({
          text: "문서 구성",
          font: WORD_FONT
        })
      ]
    }),
    new Paragraph({ text: "• 표지: 문서 목적, 생성 정보, 기본 템플릿 정보", spacing: { after: 80 } }),
    new Paragraph({ text: "• 목차: 캡처 화면 목록을 빠르게 찾아갈 수 있는 링크형 목차", spacing: { after: 80 } }),
    new Paragraph({ text: "• 본문: 화면별 제목, 캡처 이미지, 설명 캡션", spacing: { after: 240 } })
  ];
}

/**
 * @param {Array<{slug: string, title?: string, caption?: string, altText?: string, imagePath: string}>} items
 * @param {string} outputDir
 * @param {object} [profileOverride]
 */
async function exportWordAssets(items, outputDir, profileOverride) {
  const profile = Object.assign({}, BUILTIN_PROFILES.word, profileOverride || {});
  const exportItems = await materializeExportItems(items, outputDir, profile);
  const generatedAt = new Date().toLocaleString("ko-KR");
  const coverBanner = await createCoverBannerBuffer();
  const csvRows = ["index,filename,title,caption"];
  const children = createCoverChildren(exportItems, profile, generatedAt, coverBanner);

  children.push(new Paragraph({
    text: "목차",
    heading: HeadingLevel.HEADING_2,
    pageBreakBefore: true,
    spacing: { after: 120 }
  }));
  children.push(new Paragraph({
    children: [
      new TextRun({
        text: "아래 목차는 Word에서 문서를 열면 자동으로 갱신됩니다.",
        font: WORD_FONT,
        color: WORD_COLORS.slate
      })
    ],
    spacing: { after: 120 }
  }));
  children.push(new TableOfContents("캡처 화면 목차", {
    hyperlink: true,
    headingStyleRange: "1-1",
    pageNumbersEntryLevelsRange: "1-1",
    useAppliedParagraphOutlineLevel: true
  }));

  for (const item of exportItems) {
    csvRows.push([
      item.index,
      escapeCsv(item.imageFilename),
      escapeCsv(item.title),
      escapeCsv(item.caption)
    ].join(","));

    children.push(new Paragraph({
      text: `${item.index}. ${item.title}`,
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: { before: 120, after: 180 }
    }));
    children.push(new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: `파일명: ${item.imageFilename}`,
          font: WORD_FONT,
          size: 18,
          color: WORD_COLORS.slate
        })
      ]
    }));

    if (item.hasImage) {
      const imageData = fs.readFileSync(item.absoluteImagePath);
      const fitted = fitWithinBox(
        item.imageWidth,
        item.imageHeight,
        WORD_IMAGE_MAX_WIDTH,
        WORD_IMAGE_MAX_HEIGHT
      );
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new ImageRun({
            data: imageData,
            transformation: {
              width: fitted.width,
              height: fitted.height
            }
          })
        ]
      }));
    } else {
      children.push(new Paragraph({
        children: [
          new TextRun({
            text: `이미지를 찾지 못했습니다: ${item.sourceImagePath}`,
            color: WORD_COLORS.danger,
            font: WORD_FONT
          })
        ]
      }));
    }

    if (item.caption) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: item.caption,
            italics: true,
            color: WORD_COLORS.slate,
            font: WORD_FONT
          })
        ]
      }));
    }
  }

  fs.writeFileSync(path.join(outputDir, "captions.csv"), csvRows.join("\n"), "utf8");

  const document = new Document({
    creator: "webpage-capture-tool",
    title: "Manual Capture Workbench Export",
    subject: "Word Export",
    description: "Manual Capture Workbench에서 생성한 Word 문서",
    features: {
      updateFields: true
    },
    styles: createWordStyles(),
    sections: [{
      headers: { default: createHeader() },
      footers: { default: createFooter() },
      properties: {
        page: {
          margin: {
            top: 1080,
            right: 900,
            bottom: 1080,
            left: 900,
            header: 540,
            footer: 540
          }
        }
      },
      children
    }]
  });

  const documentPath = path.join(outputDir, WORD_DOC_FILENAME);
  const buffer = await Packer.toBuffer(document);
  fs.writeFileSync(documentPath, buffer);

  const manifest = buildManifest("word", profile, exportItems, {
    documentPath: `./${WORD_DOC_FILENAME}`
  });
  fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  return {
    outputDir,
    count: items.length,
    documentPath,
    documentFile: WORD_DOC_FILENAME,
    manifest
  };
}

module.exports = { exportWordAssets };
