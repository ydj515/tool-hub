/**
 * IPC 핸들러에서 사용하는 순수 유틸리티 — Electron 없이 단위 테스트 가능.
 */
const fs = require("fs");

/**
 * 파일 경로별 undo/redo 버퍼 스택을 관리한다.
 * main.js의 ipcMain.handle 블록을 이 클래스로 위임해 테스트 가능하게 분리.
 */
class ImageFileHistory {
  constructor() {
    /** @type {Map<string, Buffer[]>} */
    this._undo = new Map();
    /** @type {Map<string, Buffer[]>} */
    this._redo = new Map();
  }

  /** 현재 파일 내용을 undo 스택에 쌓고 redo 스택을 비운다. */
  snapshot(filePath) {
    if (!fs.existsSync(filePath)) return { error: "파일 없음" };
    try {
      const buf = fs.readFileSync(filePath);
      if (!this._undo.has(filePath)) this._undo.set(filePath, []);
      this._undo.get(filePath).push(buf);
      this._redo.set(filePath, []);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  }

  /** undo: 이전 버퍼를 파일에 쓰고, 현재 내용은 redo 스택으로 이동. */
  undo(filePath) {
    try {
      const undoStack = this._undo.get(filePath) || [];
      if (undoStack.length === 0) return { ok: false };
      const prevBuf = undoStack.pop();
      if (!this._redo.has(filePath)) this._redo.set(filePath, []);
      if (fs.existsSync(filePath)) {
        this._redo.get(filePath).push(fs.readFileSync(filePath));
      }
      fs.writeFileSync(filePath, prevBuf);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  }

  /** redo: 다음 버퍼를 파일에 쓰고, 현재 내용은 undo 스택으로 이동. */
  redo(filePath) {
    try {
      const redoStack = this._redo.get(filePath) || [];
      if (redoStack.length === 0) return { ok: false };
      const nextBuf = redoStack.pop();
      if (!this._undo.has(filePath)) this._undo.set(filePath, []);
      if (fs.existsSync(filePath)) {
        this._undo.get(filePath).push(fs.readFileSync(filePath));
      }
      fs.writeFileSync(filePath, nextBuf);
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  }

  /** 해당 파일의 undo/redo 스택을 모두 제거한다. */
  clear(filePath) {
    this._undo.delete(filePath);
    this._redo.delete(filePath);
    return { ok: true };
  }

  undoDepth(filePath) {
    return (this._undo.get(filePath) || []).length;
  }

  redoDepth(filePath) {
    return (this._redo.get(filePath) || []).length;
  }
}

module.exports = { ImageFileHistory };
