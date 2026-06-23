// src/lib/pdf-to-images.ts
// Конвертация PDF в изображения через poppler (pdftoppm)

import { execFile } from 'child_process';
import { readFile, unlink, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { PDFParse } from 'pdf-parse';

export interface PdfPageImage {
  page: number;
  dataUri: string;
  width: number;
  height: number;
}

/**
 * Конвертирует PDF buffer в массив JPEG изображений через pdftoppm.
 */
export async function pdfToImages(
  pdfBuffer: Buffer,
  options?: {
    scale?: number;      // DPI (по умолчанию 150)
    maxPages?: number;   // максимум страниц
    quality?: number;    // качество JPEG 0-100 (по умолчанию 80)
  }
): Promise<PdfPageImage[]> {
  const dpi = options?.scale || 150;
  const maxPages = options?.maxPages || 30;
  const quality = options?.quality || 80;

  // Сохраняем PDF во временный файл
  const tmpId = randomBytes(8).toString('hex');
  const tmpPdf = join(tmpdir(), `pdf-${tmpId}.pdf`);
  const tmpPrefix = join(tmpdir(), `pdf-${tmpId}`);

  const { writeFile } = await import('fs/promises');
  await writeFile(tmpPdf, pdfBuffer);

  try {
    // Конвертируем PDF → JPEG через pdftoppm
    // pdftoppm -jpeg -r DPI -l MAX_PAGES input.pdf output_prefix
    await new Promise<void>((resolve, reject) => {
      execFile('pdftoppm', [
        '-jpeg',
        '-r', String(dpi),
        '-l', String(maxPages),
        '-jpegopt', `quality=${quality}`,
        tmpPdf,
        tmpPrefix,
      ], { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(`pdftoppm: ${err.message}\n${stderr}`));
        else resolve();
      });
    });

    // Читаем сгенерированные изображения
    const files = await readdir(tmpdir());
    const pageFiles = files
      .filter(f => f.startsWith(`pdf-${tmpId}`) && f.endsWith('.jpg'))
      .sort();

    const images: PdfPageImage[] = [];

    for (const file of pageFiles) {
      const filePath = join(tmpdir(), file);
      const imgBuffer = await readFile(filePath);

      // Извлекаем номер страницы из имени файла (pdf-XXX-01.jpg)
      const pageMatch = file.match(/-(\d+)\.jpg$/);
      const pageNum = pageMatch ? parseInt(pageMatch[1], 10) : images.length + 1;

      images.push({
        page: pageNum,
        dataUri: `data:image/jpeg;base64,${imgBuffer.toString('base64')}`,
        width: 0, // pdftoppm не возвращает размеры, но это не критично
        height: 0,
      });

      console.log(`[pdf-to-images] Страница ${pageNum}: ${Math.round(imgBuffer.length / 1024)}KB JPEG`);

      // Удаляем временный файл
      await unlink(filePath).catch(() => {});
    }

    return images;
  } finally {
    // Удаляем временный PDF
    await unlink(tmpPdf).catch(() => {});
  }
}

/**
 * Проверяет PDF: есть ли текст или это сканы.
 */
export async function analyzePdfContent(pdfBuffer: Buffer): Promise<{
  pages: number;
  textLength: number;
  avgCharsPerPage: number;
  hasText: boolean;
  isScanned: boolean;
  textPreview: string;
}> {
  const parser = new PDFParse({ data: pdfBuffer });
  const info = await parser.getInfo();
  const textResult = await parser.getText();
  const textLength = textResult.text?.trim().length || 0;
  const pages = info.total || 0;
  const avgCharsPerPage = pages > 0 ? textLength / pages : 0;

  return {
    pages,
    textLength,
    avgCharsPerPage: Math.round(avgCharsPerPage),
    hasText: textLength > 100,
    isScanned: avgCharsPerPage < 50,
    textPreview: textResult.text?.substring(0, 500) || '',
  };
}
