import fs from "node:fs";
import path from "node:path";

export function emitLessonJs(lesson, outFile) {
  const body = JSON.stringify(lesson, null, 2)
    .replace(/"([^"]+)":/g, "$1:")
    .replace(/"/g, '"');

  const content = `export const ${lesson.id.replace(/-/g, "_")} = ${JSON.stringify(lesson, null, 2)};\n`;
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, content, "utf8");
}

export function ensurePublicDir(lessonId, projectRoot) {
  const dir = path.join(projectRoot, "public", "lessons", lessonId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function audioUrl(lessonId, filename) {
  return `/lessons/${lessonId}/${filename}`;
}
