'use server';

import { promises as fs } from 'fs';
import path from 'path';

export interface StandardSection {
  id: string;
  section: string;
  hashtags: string[];
}

const sectionsFilePath = path.join(process.cwd(), 'src', 'lib', 'standard-sections.json');

export async function getStandardSectionsLite(): Promise<StandardSection[]> {
  try {
    const fileContent = await fs.readFile(sectionsFilePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading standard sections file:', error);
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw new Error('Не удалось загрузить стандартные разделы.');
  }
}
