import JSZip from 'jszip';
import XlsxPopulate from 'xlsx-populate';

export interface ParsedModelImage {
  dataUri: string;
  mimeType: string;
  source: string;
  sizeBytes: number;
}

export interface ParsedNonPdfForModelResult {
  markdown: string;
  images: ParsedModelImage[];
  parsingMode: string;
  rawTextLength: number;
  textWasTruncated: boolean;
}

interface ParseNonPdfBufferInput {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
}

interface ParseNonPdfFileInput {
  fileUri: string;
  fileName: string;
  mimeType: string;
}

const MAX_TEXT_CHARS = 150_000;
const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 1_500_000;
const MAX_TOTAL_IMAGE_BYTES = 6_000_000;

const DOCX_EXTENSIONS = new Set(['docx', 'docm', 'dotx', 'dotm']);
const XLSX_EXTENSIONS = new Set(['xlsx', 'xlsm', 'xltx', 'xltm']);
const IMAGE_EXT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  svg: 'image/svg+xml',
};

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'csv', 'json', 'xml', 'html', 'htm', 'yaml', 'yml', 'ini', 'log',
]);

const DOCX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-word.document.macroenabled.12',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.template',
]);

const XLSX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroenabled.12',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
]);

function normalizeMimeType(mimeType: string | undefined | null): string {
  return (mimeType || '').split(';')[0].trim().toLowerCase();
}

function getExtension(fileName: string): string {
  const normalized = (fileName || '').toLowerCase();
  const idx = normalized.lastIndexOf('.');
  return idx >= 0 ? normalized.slice(idx + 1) : '';
}

function isImageLike(mimeType: string, fileName: string): boolean {
  return mimeType.startsWith('image/') || !!IMAGE_EXT_TO_MIME[getExtension(fileName)];
}

function resolveImageMimeType(fileName: string, fallbackMimeType?: string): string | null {
  const ext = getExtension(fileName);
  return IMAGE_EXT_TO_MIME[ext] || (fallbackMimeType?.startsWith('image/') ? fallbackMimeType : null);
}

function isDocxLike(mimeType: string, fileName: string): boolean {
  return DOCX_MIME_TYPES.has(mimeType) || DOCX_EXTENSIONS.has(getExtension(fileName));
}

function isXlsxLike(mimeType: string, fileName: string): boolean {
  return XLSX_MIME_TYPES.has(mimeType) || XLSX_EXTENSIONS.has(getExtension(fileName));
}

function isTextLike(mimeType: string, fileName: string): boolean {
  return mimeType.startsWith('text/')
    || mimeType === 'application/json'
    || mimeType === 'application/xml'
    || mimeType === 'application/x-yaml'
    || TEXT_EXTENSIONS.has(getExtension(fileName));
}

function isLikelyBinary(buffer: Buffer): boolean {
  const sampleLength = Math.min(buffer.length, 4096);
  if (sampleLength === 0) return false;
  let nonPrintable = 0;
  for (let i = 0; i < sampleLength; i += 1) {
    const byte = buffer[i];
    if (byte === 0) return true;
    const isTabOrNewline = byte === 9 || byte === 10 || byte === 13;
    const isPrintableAscii = byte >= 32 && byte <= 126;
    if (!isTabOrNewline && !isPrintableAscii) nonPrintable += 1;
  }
  return (nonPrintable / sampleLength) > 0.25;
}

function decodeXmlEntities(input: string): string {
  return input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)));
}

function normalizeText(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function limitTextLength(text: string): { text: string; rawLength: number; truncated: boolean } {
  const rawLength = text.length;
  if (rawLength <= MAX_TEXT_CHARS) {
    return { text, rawLength, truncated: false };
  }
  const trimmed = `${text.slice(0, MAX_TEXT_CHARS)}\n\n[Обрезано: исходный текст слишком большой]`;
  return { text: trimmed, rawLength, truncated: true };
}

function extractDocxXmlText(xml: string): string {
  const withLayout = xml
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br\/>/g, '\n')
    .replace(/<w:cr\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<\/w:tc>/g, '\t');
  const withoutTags = withLayout.replace(/<[^>]+>/g, '');
  return normalizeText(decodeXmlEntities(withoutTags));
}

async function extractImagesFromZip(zip: JSZip, pathPrefix: string): Promise<ParsedModelImage[]> {
  const candidates = Object.keys(zip.files)
    .filter((name) => name.startsWith(pathPrefix) && !zip.files[name].dir)
    .sort((a, b) => a.localeCompare(b));

  const images: ParsedModelImage[] = [];
  let totalBytes = 0;

  for (const filePath of candidates) {
    if (images.length >= MAX_IMAGES) break;
    const fileRef = zip.files[filePath];
    if (!fileRef) continue;

    const mimeType = resolveImageMimeType(filePath);
    if (!mimeType) continue;

    const imageBuffer = await fileRef.async('nodebuffer');
    if (!imageBuffer.length) continue;
    if (imageBuffer.length > MAX_IMAGE_BYTES) continue;
    if (totalBytes + imageBuffer.length > MAX_TOTAL_IMAGE_BYTES) break;

    images.push({
      dataUri: `data:${mimeType};base64,${imageBuffer.toString('base64')}`,
      mimeType,
      source: filePath,
      sizeBytes: imageBuffer.length,
    });
    totalBytes += imageBuffer.length;
  }

  return images;
}

async function parseDocxBuffer(fileBuffer: Buffer): Promise<{ text: string; images: ParsedModelImage[] }> {
  const zip = await JSZip.loadAsync(fileBuffer);
  const xmlPaths = Object.keys(zip.files)
    .filter((name) => /^word\/(document|header\d+|footer\d+|footnotes|endnotes|comments)\.xml$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  const textBlocks: string[] = [];
  for (const xmlPath of xmlPaths) {
    const xml = await zip.files[xmlPath]?.async('text');
    if (!xml) continue;
    const parsed = extractDocxXmlText(xml);
    if (!parsed) continue;
    textBlocks.push(`### ${xmlPath}\n${parsed}`);
  }

  const images = await extractImagesFromZip(zip, 'word/media/');
  return { text: normalizeText(textBlocks.join('\n\n')), images };
}

async function parseXlsxBuffer(fileBuffer: Buffer): Promise<{ text: string; images: ParsedModelImage[] }> {
  const workbook = await XlsxPopulate.fromDataAsync(fileBuffer);
  const sheetBlocks: string[] = [];

  const toMatrix = (value: unknown): unknown[][] => {
    if (!Array.isArray(value)) {
      return value === undefined ? [] : [[value]];
    }
    if (value.length === 0) return [];
    if (Array.isArray(value[0])) return value as unknown[][];
    return [value as unknown[]];
  };

  const normalizeCellValue = (value: unknown): string => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'object' && value && typeof (value as any).text === 'function') {
      return String((value as any).text() || '');
    }
    if (typeof value === 'object' && value && 'text' in (value as any)) {
      return String((value as any).text || '');
    }
    return String(value);
  };

  for (const sheet of workbook.sheets()) {
    const usedRange = sheet.usedRange();
    if (!usedRange) continue;

    const matrix = toMatrix(usedRange.value());
    const csvRows: string[] = [];
    for (const row of matrix) {
      const values = (row || []).map((value) => normalizeCellValue(value));
      const line = values.join(',').trim();
      if (line) {
        csvRows.push(line);
      }
    }

    const csv = csvRows.join('\n').trim();
    if (!csv) continue;
    sheetBlocks.push(`### Лист: ${sheet.name()}\n${csv}`);
  }

  const zip = await JSZip.loadAsync(fileBuffer);
  const images = await extractImagesFromZip(zip, 'xl/media/');
  return { text: normalizeText(sheetBlocks.join('\n\n')), images };
}

function parsePlainTextBuffer(fileBuffer: Buffer, mimeType: string): string {
  const utf8Text = fileBuffer.toString('utf8').replace(/^\uFEFF/, '');
  if (!utf8Text.trim()) return '';

  if (mimeType === 'application/json') {
    try {
      return JSON.stringify(JSON.parse(utf8Text), null, 2);
    } catch {
      return normalizeText(utf8Text);
    }
  }

  if (mimeType === 'text/html' || mimeType === 'application/xhtml+xml') {
    const textOnly = utf8Text
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
    return normalizeText(decodeXmlEntities(textOnly));
  }

  return normalizeText(utf8Text);
}

function buildMarkdownContext(params: {
  fileName: string;
  mimeType: string;
  parsingMode: string;
  text: string;
  images: ParsedModelImage[];
  textWasTruncated: boolean;
}): string {
  const lines: string[] = [];
  lines.push('## SOURCE_CONTEXT');
  lines.push(`fileName: ${params.fileName}`);
  lines.push(`mimeType: ${params.mimeType}`);
  lines.push(`parsingMode: ${params.parsingMode}`);
  lines.push(`imageCount: ${params.images.length}`);
  lines.push('');
  lines.push('## EXTRACTED_TEXT');
  lines.push(params.text || '[Текст не извлечен]');
  if (params.textWasTruncated) {
    lines.push('');
    lines.push('[Примечание: текст был обрезан по лимиту длины]');
  }
  if (params.images.length > 0) {
    lines.push('');
    lines.push('## EXTRACTED_IMAGES');
    for (let i = 0; i < params.images.length; i += 1) {
      const image = params.images[i];
      lines.push(`- image_${i + 1}: source=${image.source}, mime=${image.mimeType}, sizeBytes=${image.sizeBytes}, format=base64_data_uri`);
    }
  }
  return lines.join('\n');
}

export function isPdfLikeFile(mimeType: string, fileName: string): boolean {
  const normalizedMime = normalizeMimeType(mimeType);
  return normalizedMime === 'application/pdf' || getExtension(fileName) === 'pdf';
}

export async function parseNonPdfBufferForModel(input: ParseNonPdfBufferInput): Promise<ParsedNonPdfForModelResult> {
  const mimeType = normalizeMimeType(input.mimeType);
  const fileName = input.fileName || 'document';

  let parsingMode = 'fallback';
  let extractedText = '';
  let images: ParsedModelImage[] = [];

  if (isImageLike(mimeType, fileName)) {
    parsingMode = 'image_base64';
    const resolvedMimeType = resolveImageMimeType(fileName, mimeType) || 'image/png';
    if (input.fileBuffer.length <= MAX_IMAGE_BYTES) {
      images = [{
        dataUri: `data:${resolvedMimeType};base64,${input.fileBuffer.toString('base64')}`,
        mimeType: resolvedMimeType,
        source: fileName,
        sizeBytes: input.fileBuffer.length,
      }];
    }
  } else if (isDocxLike(mimeType, fileName)) {
    parsingMode = 'docx_zip';
    try {
      const parsed = await parseDocxBuffer(input.fileBuffer);
      extractedText = parsed.text;
      images = parsed.images;
    } catch {
      parsingMode = 'docx_zip_fallback';
      if (!isLikelyBinary(input.fileBuffer)) {
        extractedText = parsePlainTextBuffer(input.fileBuffer, mimeType);
      }
    }
  } else if (isXlsxLike(mimeType, fileName)) {
    parsingMode = 'xlsx_zip';
    try {
      const parsed = await parseXlsxBuffer(input.fileBuffer);
      extractedText = parsed.text;
      images = parsed.images;
    } catch {
      parsingMode = 'xlsx_zip_fallback';
      if (!isLikelyBinary(input.fileBuffer)) {
        extractedText = parsePlainTextBuffer(input.fileBuffer, mimeType);
      }
    }
  } else if (isTextLike(mimeType, fileName)) {
    parsingMode = 'plain_text';
    extractedText = parsePlainTextBuffer(input.fileBuffer, mimeType);
  } else if (!isLikelyBinary(input.fileBuffer)) {
    parsingMode = 'fallback_text';
    extractedText = parsePlainTextBuffer(input.fileBuffer, mimeType);
  }

  const { text, rawLength, truncated } = limitTextLength(normalizeText(extractedText));
  const markdown = buildMarkdownContext({
    fileName,
    mimeType: mimeType || 'application/octet-stream',
    parsingMode,
    text,
    images,
    textWasTruncated: truncated,
  });

  return {
    markdown,
    images,
    parsingMode,
    rawTextLength: rawLength,
    textWasTruncated: truncated,
  };
}

export async function parseNonPdfFileForModel(input: ParseNonPdfFileInput): Promise<ParsedNonPdfForModelResult> {
  const response = await fetch(input.fileUri);
  if (!response.ok) {
    throw new Error(`Не удалось скачать файл для non-PDF парсинга: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return parseNonPdfBufferForModel({
    fileBuffer: Buffer.from(arrayBuffer),
    fileName: input.fileName,
    mimeType: input.mimeType,
  });
}
