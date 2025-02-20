import { Client } from '@langchain/langgraph-sdk';
import { LangGraphBase } from './langgraph-base';

// Frontend client singleton instance
let clientInstance: LangGraphBase | null = null;

/**
 * Creates or returns a singleton instance of the LangGraph client for frontend use
 * @returns LangGraph Client instance
 */
export const createClient = () => {
  if (clientInstance) {
    return clientInstance;
  }

  if (!process.env.NEXT_PUBLIC_LANGGRAPH_API_URL) {
    throw new Error('NEXT_PUBLIC_LANGGRAPH_API_URL is not set');
  }

  const client = new Client({
    apiUrl: process.env.NEXT_PUBLIC_LANGGRAPH_API_URL,
  });

  clientInstance = new LangGraphBase(client);
  return clientInstance;
};

export const client = createClient();
