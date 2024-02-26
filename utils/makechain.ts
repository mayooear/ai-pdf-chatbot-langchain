import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ChatPromptTemplate } from 'langchain/prompts';
import { RunnableSequence } from 'langchain/schema/runnable';
import { StringOutputParser } from 'langchain/schema/output_parser';
import type { Document } from 'langchain/document';
import type { VectorStoreRetriever } from 'langchain/vectorstores/base';

const CONDENSE_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

<chat_history>
  {chat_history}
</chat_history>

Follow Up Input: {question}
Standalone question:`;

const QA_TEMPLATE = `
You are an expert researcher. Use the following pieces of context to answer the question at the end.

# General guidelines
If you don't know the answer, just say you don't know. DO NOT try to make up an answer.
If the question is not related to the context or chat history, politely respond that you are tuned to 
  only answer questions that are related to the context.
IMPORTANT: DO NOT use any information you know about the world.
The context is Ananda Library. 
Always say Ananda Library, NOT "the context" or "the content provided in the context".
If the question is not related to the Ananda Library, politely respond that you are tuned to only answer 
questions that are related to the Ananda Library.
Never list a source as generically "Ananda Library" - not helpful.
Today's date is ${new Date().toLocaleDateString()}.
Do not mention the source, author, or title.

# Names
Refer to Paramhansa Yogananda and Swami Yogananda as Master.
NEVER call Master "the Master" or "Master Yogananda".
Refer to Swami Kriyananda as Swamiji.
Master = Paramhansa Yogananda
Swami = Swami Kriyananda
Swamiji = Swami
A reference to Swami is always to Swami Kriyananda.

# Format
ALWAYS answer in markdown format but do not enclose in a code block.
DO NOT start your output with \`\`\`markdown.

# Context
{context}

# Chat History
{chat_history}


Question: {question}
Helpful answer:`;

const combineDocumentsFn = (docs: Document[], separator = '\n\n') => {
  const serializedDocs = docs.map((doc) => doc.pageContent);
  return serializedDocs.join(separator);
};

export const makeChain = (retriever: VectorStoreRetriever) => {
  const condenseQuestionPrompt =
    ChatPromptTemplate.fromTemplate(CONDENSE_TEMPLATE);
  const answerPrompt = ChatPromptTemplate.fromTemplate(QA_TEMPLATE);

  const model = new ChatOpenAI({
    temperature: 0, // increase temperature to get more creative answers
    modelName: 'gpt-4-turbo-preview',
  });

  // Rephrase the initial question into a dereferenced standalone question based on
  // the chat history to allow effective vectorstore querying.
  const standaloneQuestionChain = RunnableSequence.from([
    condenseQuestionPrompt,
    model,
    new StringOutputParser(),
  ]);

  // Retrieve documents based on a query, then format them.
  const retrievalChain = retriever.pipe(combineDocumentsFn);

  // Generate an answer to the standalone question based on the chat history
  // and retrieved documents. Additionally, we return the source documents directly.
  const answerChain = RunnableSequence.from([
    {
      context: RunnableSequence.from([
        (input) => input.question,
        retrievalChain,
      ]),
      chat_history: (input) => input.chat_history,
      question: (input) => input.question,
    },
    answerPrompt,
    model,
    new StringOutputParser(),
  ]);

  // First generate a standalone question, then answer it based on
  // chat history and retrieved context documents.
  const conversationalRetrievalQAChain = RunnableSequence.from([
    {
      question: standaloneQuestionChain,
      chat_history: (input) => input.chat_history,
    },
    answerChain,
  ]);

  return conversationalRetrievalQAChain;
};

