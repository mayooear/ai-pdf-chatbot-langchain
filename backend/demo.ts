import { Client } from '@langchain/langgraph-sdk';
import { graph } from './src/retrieval_graph/graph.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Environment variables needed:
// LANGGRAPH_API_URL: The URL where your LangGraph server is running
//   - For local development: http://localhost:2024 (or your local server port)
//   - For LangSmith cloud: https://api.smith.langchain.com
//

const assistant_id = 'retrieval_graph';
async function runDemo() {
  // Initialize the LangGraph client
  const client = new Client({
    apiUrl: process.env.LANGGRAPH_API_URL || 'http://localhost:2024',
  });

  // Create a new thread for this conversation
  console.log('Creating new thread...');
  const thread = await client.threads.create({
    metadata: {
      demo: 'retrieval-graph',
    },
  });
  console.log('Thread created with ID:', thread.thread_id);

  // Example question
  const question = 'What is this document about?';

  console.log('\n=== Streaming Example ===');
  console.log('Question:', question);

  // Run the graph with streaming
  try {
    console.log('\nStarting stream...');
    const stream = await client.runs.stream(thread.thread_id, assistant_id, {
      input: { query: question },
      streamMode: ['values', 'messages', 'updates'], // Include all stream types
    });

    // Process the stream chunks
    console.log('\nWaiting for stream chunks...');
    for await (const chunk of stream) {
      console.log('\nReceived chunk:');
      //   console.log('Event type:', chunk.event);
      if (chunk.event === 'values') {
        // console.log('Values data:', JSON.stringify(chunk.data, null, 2));
      } else if (chunk.event === 'messages/partial') {
        // console.log('Messages data:', JSON.stringify(chunk, null, 2));
      } else if (chunk.event === 'updates') {
        console.log('Update data:', JSON.stringify(chunk.data, null, 2));
      }
    }
    console.log('\nStream completed.');

    const messagesStream = await client.runs.stream(
      thread.thread_id,
      assistant_id,
      {
        input: { query: question },
        streamMode: 'updates', // Include all stream types
      },
    );

    for await (const chunk of messagesStream) {
      console.log('\nReceived chunk:');
      console.log('Event type:', chunk.event);
      console.log('updates data:', JSON.stringify(chunk.data, null, 2));
    }
  } catch (error) {
    console.error('Error in streaming run:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

// Run the demo
runDemo().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
