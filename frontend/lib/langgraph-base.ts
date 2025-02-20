import {
  Client,
  DefaultValues,
  Thread,
  ThreadState,
} from '@langchain/langgraph-sdk';

export class LangGraphBase {
  client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  /**
   * Creates a new thread with optional metadata
   */
  async createThread(metadata?: Record<string, any>) {
    return this.client.threads.create({ metadata });
  }

  /**
   * Gets a thread by ID
   */
  async getThread(threadId: string): Promise<Thread> {
    return this.client.threads.get(threadId);
  }

  /**
   * Searches for threads with optional metadata filters
   */
  async searchThreads(params: {
    metadata?: Record<string, any>;
    limit?: number;
    offset?: number;
  }): Promise<Thread[]> {
    return this.client.threads.search({
      metadata: params.metadata,
      limit: params.limit || 10,
      offset: params.offset || 0,
    });
  }

  /**
   * Gets the current state of a thread
   */
  async getThreadState<T extends Record<string, any> = Record<string, any>>(
    threadId: string,
  ): Promise<ThreadState<T>> {
    return this.client.threads.getState(threadId);
  }

  /**
   * Updates the state of a thread
   */
  async updateThreadState(
    threadId: string,
    values: Record<string, any>,
    asNode?: string,
  ) {
    return this.client.threads.updateState(threadId, {
      values,
      asNode,
    });
  }

  /**
   * Deletes a thread by ID
   */
  async deleteThread(threadId: string) {
    return this.client.threads.delete(threadId);
  }

  /**
   * Gets the history of a thread's states
   */
  async getThreadHistory(threadId: string, limit: number = 10) {
    return this.client.threads.getHistory(threadId, { limit });
  }

  /**
   * Utility function to check if a thread is interrupted
   */
  isThreadInterrupted(thread: Thread): boolean {
    return !!(thread.interrupts && Object.keys(thread.interrupts).length > 0);
  }

  /**
   * Utility function to get interrupts from a thread
   */
  getThreadInterrupts(thread: Thread): any[] | undefined {
    if (!thread.interrupts) return undefined;

    return Object.values(thread.interrupts).flatMap((interrupt) => {
      if (Array.isArray(interrupt[0])) {
        return interrupt[0][1]?.value;
      }
      return interrupt.map((i) => i.value);
    });
  }

  /**
   * Utility function to resume an interrupted thread
   */
  async resumeThread(
    threadId: string,
    assistantId: string,
    resumeValue: any,
    config?: {
      configurable?: { [key: string]: unknown };
    },
  ) {
    return this.client.runs.stream(threadId, assistantId, {
      command: { resume: resumeValue },
      config: {
        configurable: config?.configurable,
      },
    });
  }
}
