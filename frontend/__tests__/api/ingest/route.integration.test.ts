import { POST } from '../../../app/api/ingest/route'; // Import the actual route handler
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { processPDF } from '@/lib/pdf';
import { langGraphServerClient } from '@/lib/langgraph-server';

// Mock the processPDF function
jest.mock('@/lib/pdf', () => ({
  processPDF: jest.fn().mockImplementation((file: File) => {
    return Promise.resolve([
      {
        pageContent: 'Test content',
        metadata: { filename: file.name },
      },
    ]);
  }),
}));

// Mock the langGraphServerClient
jest.mock('@/lib/langgraph-server', () => {
  return {
    langGraphServerClient: {
      createThread: jest
        .fn()
        .mockResolvedValue({ thread_id: 'test-thread-id' }),
      client: {
        runs: {
          stream: jest.fn().mockImplementation(async function* () {
            yield { data: 'test' };
          }),
        },
      },
    },
  };
});
describe('PDF Ingest Route (node-fetch)', () => {
  const baseUrl = 'http://localhost:3000'; // Replace with your dev server URL
  const ingestUrl = `${baseUrl}/api/ingest`;
  const pdfFilePath = path.join(__dirname, 'test.pdf');

  beforeAll(() => {
    // Create a dummy PDF file for testing
    const minimalPDF = `%PDF-1.7
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>/Contents 4 0 R>>endobj
4 0 obj<</Length 21>>stream
BT /F1 12 Tf (Test) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000107 00000 n
0000000200 00000 n
trailer<</Size 5/Root 1 0 R>>
startxref
271
%%EOF`;
    fs.writeFileSync(pdfFilePath, minimalPDF);
  });

  afterAll(() => {
    // Clean up the dummy PDF file
    fs.unlinkSync(pdfFilePath);
  });

  it.skip('should reject empty requests', async () => {
    const formData = new FormData();
    const response = await fetch(ingestUrl, {
      method: 'POST',
      body: formData,
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('No files provided');
  });

  it('should reject non-PDF files', async () => {
    const formData = new FormData();
    formData.append('files', fs.createReadStream('jest.config.js'), 'test.txt'); // Attach a non-PDF file

    const response = await fetch(ingestUrl, {
      method: 'POST',
      body: formData,
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Only PDF files are allowed');
  });

  it('should accept PDF files', async () => {
    const formData = new FormData();
    formData.append('files', fs.createReadStream(pdfFilePath), 'test.pdf'); // Attach the PDF file

    const response = await fetch(ingestUrl, {
      method: 'POST',
      body: formData,
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toContain('');
    expect(data.threadId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('should handle multiple PDFs', async () => {
    const formData = new FormData();
    formData.append('files', fs.createReadStream(pdfFilePath), 'test1.pdf');
    formData.append('files', fs.createReadStream(pdfFilePath), 'test2.pdf');

    const response = await fetch(ingestUrl, {
      method: 'POST',
      body: formData,
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Documents ingested successfully');
    expect(data.threadId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it.skip('should correctly parse PDF files using PDFLoader', async () => {
    const formData = new FormData();
    formData.append('files', fs.createReadStream(pdfFilePath), 'test.pdf');

    await fetch(ingestUrl, {
      method: 'POST',
      body: formData,
    });

    expect(processPDF).toHaveBeenCalled();
  });

  it.skip('should call the ingestion graph with the correct data', async () => {
    const formData = new FormData();
    formData.append('files', fs.createReadStream(pdfFilePath), 'test.pdf');

    await fetch(ingestUrl, {
      method: 'POST',
      body: formData,
    });

    expect(langGraphServerClient.createThread).toHaveBeenCalled();
    expect(langGraphServerClient.client.runs.stream).toHaveBeenCalledWith(
      'test-thread-id',
      'ingestion_graph',
      {
        input: {
          docs: [
            { pageContent: 'Test content', metadata: { filename: 'test.pdf' } },
          ],
        },
      },
    );
  });
});
