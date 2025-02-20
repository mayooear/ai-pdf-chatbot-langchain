import dotenv from 'dotenv';
dotenv.config();

import { graph } from '../../src/retrieval_graph/graph.js';
import { Document } from '@langchain/core/documents';
import { HumanMessage } from '@langchain/core/messages';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { createClient } from '@supabase/supabase-js';

/**
 * These tests require environment variables to be set:
 * OPENAI_API_KEY=your_openai_api_key
 * SUPABASE_URL=your_supabase_url
 * SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
 *
 * To run the tests:
 * 1. Create a .env file in the backend directory
 * 2. Add the above environment variables with your values
 * 3. Run: npm test retrieval_graph/integration
 */

describe('Retrieval Graph Integration', () => {
  let vectorStore: SupabaseVectorStore;

  beforeAll(async () => {
    // Check for required environment variables
    const requiredEnvVars = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    const missingEnvVars = Object.entries(requiredEnvVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingEnvVars.length > 0) {
      console.error('\nMissing required environment variables:');
      console.error(missingEnvVars.join('\n'));
      console.error(
        '\nPlease create a .env file with the following variables:',
      );
      console.error('OPENAI_API_KEY=your_openai_api_key');
      console.error('SUPABASE_URL=your_supabase_url');
      console.error(
        'SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key\n',
      );
      return;
    }

    try {
      // Setup test documents in Supabase
      const embeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-small',
      });

      const supabaseClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      );

      vectorStore = new SupabaseVectorStore(embeddings, {
        client: supabaseClient,
        tableName: 'documents',
        queryName: 'match_documents',
      });

      // Add test documents with specific, unique information and ensure IDs are set
      const testDocs = [
        new Document({
          pageContent:
            'Project XYZ-123 was initiated on March 15, 2024, with a budget of $2.5M. The project lead, Dr. Sarah Chen, established three primary objectives: improving system reliability by 35%, reducing operational costs by 28%, and implementing a new machine learning pipeline with 99.9% uptime.',
          metadata: {
            source: 'test',
            topic: 'project_report',
            id: 'test_xyz123',
          },
        }),
        new Document({
          pageContent:
            'The quarterly security audit for Q1 2024 identified 17 low-priority vulnerabilities and 3 medium-priority issues. Team lead Michael Rodriguez implemented fixes for all medium-priority issues within 48 hours, achieving a new record response time. The remaining issues are scheduled for resolution by April 30, 2024.',
          metadata: {
            source: 'test',
            topic: 'security_audit',
            id: 'test_audit_q1_2024',
          },
        }),
      ];

      // Clean up any existing test documents first
      await supabaseClient
        .from('documents')
        .delete()
        .eq('metadata->>source', 'test');

      // Add the new test documents
      await vectorStore.addDocuments(testDocs);
    } catch (error) {
      console.error('\nError setting up test environment:');
      console.error(error);
      console.error('\nPlease ensure:');
      console.error('1. Your Supabase credentials are correct');
      console.error('2. The documents table exists with the correct schema');
      console.error('3. Your OpenAI API key is valid\n');
      throw error; // Rethrow to fail the test suite if setup fails
    }
  }, 30000); // Increased timeout to 30 seconds

  afterAll(async () => {
    // Clean up test documents only if environment variables are available
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return;
    }

    try {
      const supabaseClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
      );

      // Delete test documents
      await supabaseClient
        .from('documents')
        .delete()
        .eq('metadata->>source', 'test');
    } catch (error) {
      console.error('\nError cleaning up test documents:');
      console.error(error);
    }
  });

  // Skip all tests if environment variables are missing
  const shouldRunTests = () => {
    const hasEnvVars =
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.OPENAI_API_KEY;
    if (!hasEnvVars) {
      console.warn('Skipping tests due to missing environment variables');
    }
    return hasEnvVars;
  };

  describe('Direct Answer Path', () => {
    it('should provide direct answers for general knowledge questions', async () => {
      if (!shouldRunTests()) return;

      const result = await graph.invoke({
        messages: [],
        query: 'What is 2+2?',
      });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toBeInstanceOf(HumanMessage);
      const content = String(result.messages[0].content);
      expect(content).toContain('4');
    }, 30000);
  });

  describe('Retrieval Path', () => {
    it('should retrieve and use context to answer specific project questions', async () => {
      if (!shouldRunTests()) return;

      const result = await graph.invoke({
        messages: [],
        query:
          'What is the budget for Project XYZ-123 and who is the project lead?',
      });

      expect(result.messages).toHaveLength(1);
      expect(result.documents).toBeDefined();
      expect(result.documents.length).toBeGreaterThan(0);

      const content = String(result.messages[0].content);
      expect(content).toContain('$2.5M');
      expect(content).toContain('Dr. Sarah Chen');
    }, 30000);

    it('should retrieve and provide security audit details', async () => {
      if (!shouldRunTests()) return;

      const result = await graph.invoke({
        messages: [],
        query:
          'How many security vulnerabilities were found in Q1 2024 and who implemented the fixes?',
      });

      expect(result.messages).toHaveLength(1);
      expect(result.documents).toBeDefined();
      expect(result.documents.length).toBeGreaterThan(0);

      const content = String(result.messages[0].content);
      expect(content).toContain('17 low-priority');
      expect(content).toContain('3 medium-priority');
      expect(content).toContain('Michael Rodriguez');
    }, 30000);

    it('should handle questions without relevant context gracefully', async () => {
      if (!shouldRunTests()) return;

      const result = await graph.invoke({
        messages: [],
        query: 'What were the Q2 2024 security audit results?',
      });

      expect(result.messages).toHaveLength(1);
      const content = String(result.messages[0].content);
      expect(content.toLowerCase()).toMatch(
        /(cannot|don't|not|sorry) (find|have|know|answer)/i,
      );
    }, 30000);
  });

  describe('Error Cases', () => {
    it('should handle malformed queries gracefully', async () => {
      if (!shouldRunTests()) return;

      const result = await graph.invoke({
        messages: [],
        query: '   ',
      });

      expect(result.messages).toHaveLength(1);
      const content = String(result.messages[0].content);
      expect(content).toBeTruthy();
    }, 30000);
  });

  describe('Message History', () => {
    it('should preserve human messages in the conversation history', async () => {
      if (!shouldRunTests()) return;

      // First query
      const result1 = await graph.invoke({
        messages: [],
        query: 'What is the budget for Project XYZ-123?',
      });

      // Second query should include history from first query
      const result2 = await graph.invoke({
        messages: result1.messages,
        query: 'Who is the project lead?',
      });

      // Verify message history structure
      expect(result2.messages.length).toBeGreaterThan(1);

      // Find human messages in the history
      const humanMessages = result2.messages.filter(
        (msg) => msg instanceof HumanMessage,
      );
      const aiMessages = result2.messages.filter(
        (msg) => !(msg instanceof HumanMessage),
      );

      // Verify we have both human and AI messages
      expect(humanMessages.length).toBeGreaterThan(0);
      expect(aiMessages.length).toBeGreaterThan(0);

      // Verify the order - each human message should be followed by an AI message
      result2.messages.forEach((msg, index) => {
        if (
          msg instanceof HumanMessage &&
          index < result2.messages.length - 1
        ) {
          expect(result2.messages[index + 1] instanceof HumanMessage).toBe(
            false,
          );
        }
      });

      // Verify content of messages
      expect(String(humanMessages[0].content)).toContain('budget');
      expect(String(humanMessages[1].content)).toContain('project lead');
    }, 30000);
  });
});
