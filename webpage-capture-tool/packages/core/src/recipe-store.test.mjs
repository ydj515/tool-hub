import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { describe, expect, it, beforeAll, afterAll } from "vitest";

const require = createRequire(import.meta.url);
const {
  createEmptyProject,
  saveProject,
  loadProject,
  saveRecipe,
  loadRecipe,
  mergeRecipeIntoProject,
  CURRENT_VERSION,
} = require("./recipe-store");

let tmpDir;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "recipe-store-test-"));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("createEmptyProject", () => {
  it("기본 필드 구조가 올바르다", () => {
    const project = createEmptyProject();
    expect(project).toHaveProperty("projectVersion");
    expect(project).toHaveProperty("id");
    expect(project).toHaveProperty("sources");
    expect(project).toHaveProperty("domRules");
    expect(project).toHaveProperty("editRules");
    expect(project).toHaveProperty("exportProfiles");
    expect(project).toHaveProperty("capturePreset");
    expect(Array.isArray(project.sources)).toBe(true);
    expect(Array.isArray(project.domRules)).toBe(true);
    expect(Array.isArray(project.editRules)).toBe(true);
    expect(Array.isArray(project.exportProfiles)).toBe(true);
  });

  it("name 파라미터 전달 시 name에 반영된다", () => {
    const project = createEmptyProject("테스트 프로젝트");
    expect(project.name).toBe("테스트 프로젝트");
  });

  it("capturePreset.viewportPreset 기본값은 'word'", () => {
    const project = createEmptyProject();
    expect(project.capturePreset.viewportPreset).toBe("word");
  });
});

describe("saveProject / loadProject", () => {
  it("저장 후 불러오면 name, domRules, editRules가 동일하다", () => {
    const filePath = path.join(tmpDir, "project-save-load.mcw.json");
    const project = createEmptyProject("저장 테스트");
    project.domRules = [{ id: "d1", type: "hide", selector: ".ad", enabled: true }];
    project.editRules = [{ id: "e1", type: "blur", x: 0, y: 0, width: 100, height: 100 }];

    saveProject(filePath, project);
    const loaded = loadProject(filePath);

    expect(loaded.name).toBe("저장 테스트");
    expect(loaded.domRules).toHaveLength(1);
    expect(loaded.domRules[0].id).toBe("d1");
    expect(loaded.editRules).toHaveLength(1);
    expect(loaded.editRules[0].id).toBe("e1");
  });

  it("존재하지 않는 파일 load → throws (메시지에 경로 포함)", () => {
    const missing = path.join(tmpDir, "nonexistent.mcw.json");
    expect(() => loadProject(missing)).toThrow(missing);
  });

  it("구버전(projectVersion 없음) 로드 → 마이그레이션으로 최신 버전 반환", () => {
    const filePath = path.join(tmpDir, "project-old-version.mcw.json");
    const oldData = { name: "구버전 프로젝트", sources: [] };
    fs.writeFileSync(filePath, JSON.stringify(oldData), "utf8");

    const loaded = loadProject(filePath);
    expect(loaded.projectVersion).toBe(CURRENT_VERSION);
    expect(loaded.name).toBe("구버전 프로젝트");
  });

  it("누락된 필드(domRules 없음) 마이그레이션 → 빈 배열로 보완된다", () => {
    const filePath = path.join(tmpDir, "project-missing-fields.mcw.json");
    const partialData = { name: "부분 데이터", sources: [], editRules: [] };
    fs.writeFileSync(filePath, JSON.stringify(partialData), "utf8");

    const loaded = loadProject(filePath);
    expect(Array.isArray(loaded.domRules)).toBe(true);
    expect(loaded.domRules).toHaveLength(0);
  });
});

describe("saveRecipe / loadRecipe", () => {
  it("저장 후 불러오면 name, domRules, editRules가 동일하다", () => {
    const filePath = path.join(tmpDir, "recipe-save-load.recipe.json");
    const recipe = {
      name: "테스트 레시피",
      domRules: [{ id: "d1", type: "replaceText", selector: "h1", value: "대체", enabled: true }],
      editRules: [{ id: "e1", type: "box", x: 0, y: 0, width: 50, height: 50 }],
    };

    saveRecipe(filePath, recipe);
    const loaded = loadRecipe(filePath);

    expect(loaded.name).toBe("테스트 레시피");
    expect(loaded.domRules).toHaveLength(1);
    expect(loaded.domRules[0].id).toBe("d1");
    expect(loaded.editRules).toHaveLength(1);
    expect(loaded.editRules[0].id).toBe("e1");
  });

  it("존재하지 않는 파일 load → throws", () => {
    const missing = path.join(tmpDir, "nonexistent.recipe.json");
    expect(() => loadRecipe(missing)).toThrow();
  });
});

describe("mergeRecipeIntoProject", () => {
  it("새 규칙 추가 시 배열 길이가 늘어난다", () => {
    const project = createEmptyProject();
    project.domRules = [{ id: "d1", type: "hide", selector: ".ad", enabled: true }];

    const recipe = {
      domRules: [{ id: "d2", type: "replaceText", selector: "h1", value: "새", enabled: true }],
      editRules: [{ id: "e1", type: "blur", x: 0, y: 0, width: 100, height: 100 }],
    };

    const merged = mergeRecipeIntoProject(project, recipe);
    expect(merged.domRules).toHaveLength(2);
    expect(merged.editRules).toHaveLength(1);
  });

  it("동일 id 규칙은 중복 추가되지 않는다", () => {
    const project = createEmptyProject();
    project.domRules = [{ id: "dup", type: "hide", selector: ".x", enabled: true }];

    const recipe = {
      domRules: [{ id: "dup", type: "hide", selector: ".x", enabled: true }],
      editRules: [],
    };

    const merged = mergeRecipeIntoProject(project, recipe);
    expect(merged.domRules).toHaveLength(1);
  });

  it("원본 project 객체는 변경되지 않는다 (새 객체 반환)", () => {
    const project = createEmptyProject();
    project.domRules = [];

    const recipe = {
      domRules: [{ id: "new1", type: "hide", selector: ".footer", enabled: true }],
      editRules: [],
    };

    const merged = mergeRecipeIntoProject(project, recipe);
    expect(project.domRules).toHaveLength(0);
    expect(merged.domRules).toHaveLength(1);
    expect(merged).not.toBe(project);
  });
});
