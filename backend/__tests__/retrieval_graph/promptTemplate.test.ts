import {
  ROUTER_SYSTEM_PROMPT,
  RESPONSE_SYSTEM_PROMPT,
} from '../../src/retrieval_graph/prompts.js';

describe('Prompt Templates', () => {
  describe('ROUTER_SYSTEM_PROMPT', () => {
    it('should format the router prompt correctly', async () => {
      const query = 'What is the capital of France?';
      const formattedPrompt = await ROUTER_SYSTEM_PROMPT.invoke({
        query,
      });

      expect(formattedPrompt.toString()).toContain(
        'You are a routing assistant',
      );
      expect(formattedPrompt.toString()).toContain(query);
      expect(formattedPrompt.toString()).toContain("'retrieve'");
      expect(formattedPrompt.toString()).toContain("'direct'");
    });
  });

  describe('RESPONSE_SYSTEM_PROMPT', () => {
    it('should format the response prompt correctly', async () => {
      const context = 'Paris is the capital of France.';
      const question = 'Tell me about the capital of France.';

      const formattedPrompt = await RESPONSE_SYSTEM_PROMPT.invoke({
        context: 'Paris is the capital of France.',
        question: 'Tell me about the capital of France.',
      });

      console.log(formattedPrompt.toString());

      expect(formattedPrompt.toString()).toContain(
        'You are an assistant for question-answering tasks',
      );
      expect(formattedPrompt.toString()).toContain(context);
      expect(formattedPrompt.toString()).toContain(question);
    });
  });
});
