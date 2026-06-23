// src/app/api/test-ai/route.ts
// Тест: один запрос к OpenRouter с выбранным плагином

import { NextRequest, NextResponse } from 'next/server';
import { getEnvSettings, getS3Client } from '@/actions/adminActions';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function POST(request: NextRequest) {
  try {
    const { model, prompt, file, pdfEngine, apiKey, baseUrl } = await request.json();

    // Получаем ключ
    let key = apiKey;
    if (!key) {
      const envSettings = await getEnvSettings({ allowInternal: true });
      key = envSettings.openRouterApiKey || process.env.OPENROUTER_API_KEY;
    }
    if (!key) return NextResponse.json({ error: 'Нет OpenRouter API ключа' }, { status: 400 });

    // Генерируем свежий presigned URL
    let fileUrl = file?.fileUri || '';
    if (file?.objectKey) {
      try {
        const { s3Client, config } = await getS3Client(undefined, { bucketType: 'analysis' });
        const bucket = config.bucketName || 'montagehub';
        const getCommand = new GetObjectCommand({ Bucket: bucket, Key: file.objectKey });
        fileUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
      } catch (e: any) {
        return NextResponse.json({ error: `Ошибка генерации URL: ${e.message}` }, { status: 500 });
      }
    }
    if (!fileUrl) return NextResponse.json({ error: 'Нет URL файла' }, { status: 400 });

    // Чистое имя файла
    const filename = (file?.fileName || 'document.pdf')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');

    // Формируем запрос ТОЧНО по документации OpenRouter
    const endpoint = baseUrl || 'https://openrouter.ai/api/v1/chat/completions';

    const requestBody: any = {
      model: model.replace('openrouter/', ''),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'file',
              file: {
                filename: filename,
                file_data: fileUrl,
              },
            },
          ],
        },
      ],
      plugins: [
        {
          id: 'file-parser',
          pdf: {
            engine: pdfEngine || 'cloudflare-ai',
          },
        },
      ],
      temperature: 0,
      stream: false,
    };

    // Debug log only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[test-ai] === SEND === model=${requestBody.model} engine=${pdfEngine} file=${filename}`);
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // 90 секунд

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://montagehub.ru',
          'X-Title': 'Montage HUB Test',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      const ms = Date.now() - startTime;
      const isTimeout = fetchErr.name === 'AbortError';
      console.error(`[test-ai] ${isTimeout ? 'TIMEOUT 90s' : fetchErr.message} (${ms}ms)`);
      return NextResponse.json({
        error: isTimeout ? 'Таймаут 90с — OpenRouter не ответил' : fetchErr.message,
        durationMs: ms,
        requestSent: { model: requestBody.model, plugins: requestBody.plugins, filename, file_data: fileUrl },
      }, { status: 504 });
    }
    clearTimeout(timeout);

    const durationMs = Date.now() - startTime;
    const responseText = await response.text();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[test-ai] ${response.status} (${durationMs}ms)`);
    }

    if (response.ok) {
      const data = JSON.parse(responseText);
      const text = data.choices?.[0]?.message?.content || '';
      return NextResponse.json({
        text,
        model: data.model,
        usage: data.usage,
        durationMs,
        engine: pdfEngine,
        requestId: response.headers.get('x-openrouter-request-id'),
        requestSent: {
          model: requestBody.model,
          plugins: requestBody.plugins,
          filename,
          file_data: fileUrl,
        },
      });
    }

    return NextResponse.json({
      error: `${response.status}: ${responseText.substring(0, 500)}`,
      durationMs,
      requestSent: {
        model: requestBody.model,
        plugins: requestBody.plugins,
        filename,
        file_data: fileUrl,
      },
    }, { status: response.status });

  } catch (error: any) {
    console.error('[test-ai] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
