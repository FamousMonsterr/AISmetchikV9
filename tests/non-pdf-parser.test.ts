import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { isPdfLikeFile, parseNonPdfBufferForModel } from '@/server-functions/analysis/nonPdfParser';

const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2pQ6sAAAAASUVORK5CYII=';
const TINY_PNG_BUFFER = Buffer.from(TINY_PNG_BASE64, 'base64');

async function buildDocxBuffer(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('word/document.xml', `
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        <w:p><w:r><w:t>Спецификация СКУД</w:t></w:r></w:p>
        <w:p><w:r><w:t>Контроллер доступа</w:t></w:r></w:p>
      </w:body>
    </w:document>
  `);
  zip.file('word/media/image1.png', TINY_PNG_BUFFER);
  return zip.generateAsync({ type: 'nodebuffer' });
}

async function buildXlsxBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Спецификация');
  sheet.addRow(['Позиция', 'Количество']);
  sheet.addRow(['IP-камера', 8]);
  const workbookBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const zip = await JSZip.loadAsync(workbookBuffer);
  zip.file('xl/media/image1.png', TINY_PNG_BUFFER);
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('nonPdfParser', () => {
  it('detects pdf by mime or extension', () => {
    expect(isPdfLikeFile('application/pdf', 'input.bin')).toBe(true);
    expect(isPdfLikeFile('application/octet-stream', 'drawing.PDF')).toBe(true);
    expect(isPdfLikeFile('image/png', 'drawing.png')).toBe(false);
  });

  it('parses DOCX text and embedded images into model payload', async () => {
    const fileBuffer = await buildDocxBuffer();
    const parsed = await parseNonPdfBufferForModel({
      fileBuffer,
      fileName: 'project.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    expect(parsed.parsingMode).toBe('docx_zip');
    expect(parsed.markdown).toContain('Спецификация СКУД');
    expect(parsed.markdown).toContain('Контроллер доступа');
    expect(parsed.images.length).toBe(1);
    expect(parsed.images[0].dataUri.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('parses XLSX sheet text and embedded images into model payload', async () => {
    const fileBuffer = await buildXlsxBuffer();
    const parsed = await parseNonPdfBufferForModel({
      fileBuffer,
      fileName: 'project.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    expect(parsed.parsingMode).toBe('xlsx_zip');
    expect(parsed.markdown).toContain('Лист: Спецификация');
    expect(parsed.markdown).toContain('IP-камера');
    expect(parsed.images.length).toBe(1);
    expect(parsed.images[0].dataUri.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('wraps non-pdf images as base64 data URI', async () => {
    const parsed = await parseNonPdfBufferForModel({
      fileBuffer: TINY_PNG_BUFFER,
      fileName: 'scan.png',
      mimeType: 'image/png',
    });

    expect(parsed.parsingMode).toBe('image_base64');
    expect(parsed.images.length).toBe(1);
    expect(parsed.markdown).toContain('imageCount: 1');
    expect(parsed.images[0].dataUri.startsWith('data:image/png;base64,')).toBe(true);
  });
});
