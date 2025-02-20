import { ChatPromptTemplate } from '@langchain/core/prompts';

const ROUTER_SYSTEM_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    "You are a routing assistant. Your job is to determine if a question needs document retrieval or can be answered directly.\n\nRespond with either:\n'retrieve' - if the question requires retrieving documents\n'direct' - if the question can be answered directly AND your direct answer",
  ],
  ['human', '{query}'],
]);

const RESPONSE_SYSTEM_PROMPT = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an assistant for question-answering tasks. Use the following pieces of retrieved context to answer the question. 
    If you don't know the answer, just say that you don't know. Use three sentences maximum and keep the answer concise.
    
    question:
    {question}
    
    context:
    {context}
    `,
  ],
]);

export { ROUTER_SYSTEM_PROMPT, RESPONSE_SYSTEM_PROMPT };
