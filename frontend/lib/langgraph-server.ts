import { Client } from '@langchain/langgraph-sdk';
import { LangGraphBase } from './langgraph-base';

// Server client singleton instance
let clientInstance: LangGraphBase | null = null;

/**
 * Creates or returns a singleton instance of the LangGraph client for server-side use
 * @returns LangGraph Client instance
 */
export const createServerClient = () => {
  if (clientInstance) {
    return clientInstance;
  }

  if (!process.env.NEXT_PUBLIC_LANGGRAPH_API_URL) {
    throw new Error('NEXT_PUBLIC_LANGGRAPH_API_URL is not set');
  }

  if (!process.env.LANGCHAIN_API_KEY) {
    throw new Error('LANGCHAIN_API_KEY is not set');
  }

  const client = new Client({
    apiUrl: process.env.NEXT_PUBLIC_LANGGRAPH_API_URL,
    defaultHeaders: {
      'Content-Type': 'application/json',
      'X-Api-Key': process.env.LANGCHAIN_API_KEY,
    },
  });

  clientInstance = new LangGraphBase(client);
  return clientInstance;
};

// Export all methods from the base class instance
export const langGraphServerClient = createServerClient();
