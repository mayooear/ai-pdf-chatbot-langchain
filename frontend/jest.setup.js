// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import fetch, { Request, Response } from 'node-fetch';
import { ReadableStream, TransformStream } from 'node:stream/web';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill web streams and encoding APIs
global.ReadableStream = ReadableStream;
global.TransformStream = TransformStream;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill fetch API
global.fetch = fetch;
global.Request = Request;
global.Response = Response;

// Mock environment variables
process.env.NEXT_PUBLIC_LANGGRAPH_API_URL = 'http://localhost:2024';
process.env.LANGCHAIN_API_KEY = 'test-key';

// Mock the performance API
global.performance = {
  getEntriesByName: () => [], // Provide a mock implementation
};

// Mock NextResponse.json
global.Response.json = (data, init) => {
  const response = new Response(JSON.stringify(data), init);
  response.json = async () => data; // Mock the json() method
  return response;
};
