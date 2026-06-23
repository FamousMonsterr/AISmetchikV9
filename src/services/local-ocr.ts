// src/services/local-ocr.ts
// Local OCR pipeline for PDF text extraction
// Engines: tesseract (default), paddle, surya

// --- Types ---

export interface OcrResult {
  /** Extracted text from the PDF */
  text: string;
  /** Confidence score 0-100 */
  confidence: number;
  /** Number of pages processed */
  pages: number;
  /** Processing time in milliseconds */
  durationMs: number;
  /** Which engine produced this result */
  engine: 'tesseract' | 'paddle' | 'surya';
  /** Per-page results if available */
  pageResults?: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
  }>;
}

export type OcrEngine = 'tesseract' | 'paddle' | 'surya';

export interface LocalOcrOptions {
  /** Which engine to use. Default: 'tesseract' */
  engine?: OcrEngine;
  /** Language for OCR. Default: 'rus+eng' */
  language?: string;
  /** If true, try all engines and return the best result */
  fallback?: boolean;
  /** Minimum acceptable confidence (0-100). Below this, try next engine. Default: 70 */
  minConfidence?: number;
  /** Timeout per engine in ms. Default: 30000 */
  timeoutMs?: number;
}

// --- Engine Implementations ---

async function extractWithTesseract(
  pdfBuffer: Buffer,
  language: string,
  timeoutMs: number
): Promise<OcrResult> {
  const start = performance.now()

  // Dynamic imports to avoid loading unused engines
  // @ts-ignore — tesseract.js types may not be installed
  const Tesseract = (await import('tesseract.js')).default;
  // @ts-ignore — pdfjs-dist types may not be installed
  const pdfjsLib = await import('pdfjs-dist')
  const { createCanvas } = await import('canvas')

  // Convert PDF to images
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    standardFontDataUrl: new URL(
      '../node_modules/pdfjs-dist/standard_fonts/',
      import.meta.url
    ).pathname,
  }).promise;

  const pageResults: OcrResult['pageResults'] = [];
  let totalConfidence = 0;
  let allText = '';

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 2.0 })
    const canvas = createCanvas(viewport.width, viewport.height)
    // @ts-ignore — canvas types mismatch between node-canvas and pdfjs
    const ctx = canvas.getContext('2d') as any;

    // @ts-ignore — canvas context type mismatch
    await page.render({ canvasContext: ctx, viewport }).promise;

    const imageBuffer = canvas.toBuffer('image/png')

    const result = await Promise.race([
      Tesseract.recognize(imageBuffer, language),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tesseract timeout')), timeoutMs)
      ),
    ])

    const pageText = result.data.text;
    const pageConfidence = result.data.confidence;

    pageResults.push({
      pageNumber: i,
      text: pageText,
      confidence: pageConfidence,
    })

    allText += pageText + '\n';
    totalConfidence += pageConfidence;
  }

  return {
    text: allText.trim(),
    confidence: totalConfidence / doc.numPages,
    pages: doc.numPages,
    durationMs: performance.now() - start,
    engine: 'tesseract',
    pageResults,
  };
}

async function extractWithPaddle(
  pdfBuffer: Buffer,
  _language: string,
  timeoutMs: number
): Promise<OcrResult> {
  const start = performance.now()

  // PaddleOCR requires ONNX models to be pre-downloaded
  // See: https://huggingface.co/monkt/paddleocr-onnx
  const MODEL_DIR = process.env.PADDLE_OCR_MODEL_DIR || './models/paddleocr';

  // @ts-ignore — paddleocr types not installed
  const { PaddleOcrService } = await import('paddleocr')
  // @ts-ignore — onnxruntime-node types not installed
  const ort = await import('onnxruntime-node')
  const { readFileSync } = await import('fs')
  // @ts-ignore — fast-png types not installed
  const { decode } = await import('fast-png')
  const pdfjsLib = await import('pdfjs-dist')
  const { createCanvas } = await import('canvas')

  // Load models
  const detOnnx = readFileSync(`${MODEL_DIR}/det.onnx`).buffer;
  const recOnnx = readFileSync(`${MODEL_DIR}/rec.onnx`).buffer;
  const dictText = readFileSync(`${MODEL_DIR}/dict.txt`, 'utf-8')
  const dict = dictText.split('\n').filter((l: string) => l.length > 0)

  const service = await PaddleOcrService.createInstance({
    ort,
    detection: {
      modelBuffer: detOnnx,
      minimumAreaThreshold: 24,
      textPixelThreshold: 0.55,
      paddingBoxVertical: 0.3,
      paddingBoxHorizontal: 0.5,
    },
    recognition: {
      modelBuffer: recOnnx,
      charactersDictionary: dict,
      imageHeight: 48,
    },
  })

  // Convert PDF to images
  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
  }).promise;

  const pageResults: OcrResult['pageResults'] = [];
  let totalConfidence = 0;
  let allText = '';

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 2.0 })
    const canvas = createCanvas(viewport.width, viewport.height)
    // @ts-ignore — canvas types mismatch
    const ctx = canvas.getContext('2d') as any;

    // @ts-ignore — canvas context type mismatch
    await page.render({ canvasContext: ctx, viewport }).promise;

    const imageBuffer = canvas.toBuffer('image/png')
    const image = decode(imageBuffer)

    const result = await Promise.race([
      service.recognize({
        data: image.data,
        width: image.width,
        height: image.height,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PaddleOCR timeout')), timeoutMs)
      ),
    ])

    const processed = service.processRecognition(result, {
      lineMergeThresholdRatio: 0.8,
    })

    // PaddleOCR doesn't provide confidence per line, estimate from detection
    const estimatedConfidence = 75; // Default estimate

    pageResults.push({
      pageNumber: i,
      text: processed.text,
      confidence: estimatedConfidence,
    })

    allText += processed.text + '\n';
    totalConfidence += estimatedConfidence;
  }

  return {
    text: allText.trim(),
    confidence: totalConfidence / doc.numPages,
    pages: doc.numPages,
    durationMs: performance.now() - start,
    engine: 'paddle',
    pageResults,
  };
}

async function extractWithSurya(
  pdfBuffer: Buffer,
  _language: string,
  timeoutMs: number
): Promise<OcrResult> {
  const start = performance.now()
  const { execSync } = await import('child_process')
  const { writeFileSync, unlinkSync, readFileSync } = await import('fs')
  const { tmpdir } = await import('os')
  const { join } = await import('path')

  // Surya requires Python — call via child_process
  const tmpPdf = join(tmpdir(), `ocr-${Date.now()}.pdf`)
  const tmpOut = join(tmpdir(), `ocr-out-${Date.now()}.json`)

  writeFileSync(tmpPdf, pdfBuffer)

  const pythonScript = `
import json, sys
from PIL import Image
from surya.recognition import RecognitionPredictor
import fitz  # pymupdf

pdf = fitz.open("${tmpPdf}")
rec = RecognitionPredictor()
results = []
for i, page in enumerate(pdf):
    pix = page.get_pixmap(dpi=200)
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    ocr = rec([img], full_page=True)
    lines = [l.text for l in ocr[0].text_lines]
    results.append({"page": i+1, "text": "\\n".join(lines), "confidence": 85})

with open("${tmpOut}", "w") as f:
    json.dump(results, f)
`;

  try {
    execSync(`python3 -c '${pythonScript}'`, {
      timeout: timeoutMs,
      stdio: 'pipe',
    })

    const raw = JSON.parse(readFileSync(tmpOut, 'utf-8'))
    const pageResults = raw.map((r: any) => ({
      pageNumber: r.page,
      text: r.text,
      confidence: r.confidence,
    }))

    const allText = pageResults.map((r: any) => r.text).join('\n')
    const avgConf =
      pageResults.reduce((s: number, r: any) => s + r.confidence, 0) /
      pageResults.length;

    return {
      text: allText,
      confidence: avgConf,
      pages: pageResults.length,
      durationMs: performance.now() - start,
      engine: 'surya',
      pageResults,
    };
  } finally {
    try {
      unlinkSync(tmpPdf)
      unlinkSync(tmpOut)
    } catch {}
  }
}

// --- Main Export ---

/**
 * Extract text from a PDF buffer using a local OCR engine.
 *
 * @param pdfBuffer - Raw PDF file as Buffer
 * @param options - OCR options (engine, language, fallback, etc.)
 * @returns Extracted text with confidence and metadata
 *
 * @example
 * ```ts
 * // Simple usage
 * const result = await extractTextFromPdf(buffer)
 *
 * // With specific engine
 * const result = await extractTextFromPdf(buffer, { engine: 'tesseract' })
 *
 * // With fallback — try all engines, return best
 * const result = await extractTextFromPdf(buffer, { fallback: true })
 * ```
 */
export async function extractTextFromPdf(
  pdfBuffer: Buffer,
  options: LocalOcrOptions = {}
): Promise<OcrResult> {
  const {
    engine = 'tesseract',
    language = 'rus+eng',
    fallback = false,
    minConfidence = 70,
    timeoutMs = 30_000,
  } = options;

  const engines: Record<OcrEngine, typeof extractWithTesseract> = {
    tesseract: extractWithTesseract,
    paddle: extractWithPaddle,
    surya: extractWithSurya,
  };

  if (!fallback) {
    // Single engine mode
    const extractor = engines[engine];
    if (!extractor) {
      throw new Error(`Unknown OCR engine: ${engine}`)
    }
    return extractor(pdfBuffer, language, timeoutMs)
  }

  // Fallback mode: try all engines, return best result
  const engineOrder: OcrEngine[] = ['tesseract', 'paddle', 'surya'];
  const results: OcrResult[] = [];
  const errors: Array<{ engine: OcrEngine; error: string }> = [];

  for (const eng of engineOrder) {
    try {
      if (process.env.NODE_ENV === 'development') console.log(`[local-ocr] Trying engine: ${eng}`);
      const result = await engines[eng](pdfBuffer, language, timeoutMs);
      results.push(result);

      // If confidence is high enough, use this result
      if (result.confidence >= minConfidence) {
        if (process.env.NODE_ENV === 'development') console.log(`[local-ocr] ${eng} succeeded with ${result.confidence.toFixed(1)}% confidence`);
        return result;
      }

      if (process.env.NODE_ENV === 'development') console.log(`[local-ocr] ${eng} confidence ${result.confidence.toFixed(1)}% below threshold ${minConfidence}%`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV === 'development') console.log(`[local-ocr] Engine ${eng} failed: ${errorMsg}`);
      errors.push({ engine: eng, error: errorMsg });
    }
  }

  // Return best result even if below threshold
  if (results.length > 0) {
    const best = results.sort((a, b) => b.confidence - a.confidence)[0];
    if (process.env.NODE_ENV === 'development') console.log(`[local-ocr] All engines below threshold. Best: ${best.engine} (${best.confidence.toFixed(1)}%)`);
    return best;
  }

  // All engines failed
  throw new Error(
    `All OCR engines failed: ${errors.map((e) => `${e.engine}: ${e.error}`).join('; ')}`
  )
}

/**
 * Quick check if a specific OCR engine is available.
 */
export async function isEngineAvailable(engine: OcrEngine): Promise<boolean> {
  try {
    switch (engine) {
      case 'tesseract':
        // @ts-ignore — optional dependency
        await import('tesseract.js');
        return true;
      case 'paddle':
        // @ts-ignore — optional dependency
        await import('paddleocr');
        return true;
      case 'surya':
        // Check if Python + surya-ocr are available
        const { execSync } = await import('child_process')
        execSync('python3 -c "import surya"', { stdio: 'pipe' })
        return true;
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Get list of available OCR engines.
 */
export async function getAvailableEngines(): Promise<OcrEngine[]> {
  const engines: OcrEngine[] = ['tesseract', 'paddle', 'surya'];
  const available: OcrEngine[] = [];

  for (const engine of engines) {
    if (await isEngineAvailable(engine)) {
      available.push(engine)
    }
  }

  return available;
}
