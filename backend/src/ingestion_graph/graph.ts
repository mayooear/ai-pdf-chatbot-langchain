/**
 * This "graph" simply exposes an endpoint for a user to upload docs to be indexed.
 */

import { RunnableConfig } from '@langchain/core/runnables';
import { StateGraph, END, START } from '@langchain/langgraph';
import fs from 'fs/promises';

import { IndexStateAnnotation } from './state.js';
import { makeRetriever } from '../shared/retrieval.js';
import {
  ensureIndexConfiguration,
  IndexConfigurationAnnotation,
} from './configuration.js';
import { reduceDocs } from '../shared/state.js';

async function ingestDocs(
  state: typeof IndexStateAnnotation.State,
  config?: RunnableConfig,
): Promise<typeof IndexStateAnnotation.Update> {
  if (!config) {
    throw new Error('Configuration required to run index_docs.');
  }

  const configuration = ensureIndexConfiguration(config);
  let docs = state.docs;

  if (!docs || docs.length === 0) {
    if (configuration.useSampleDocs) {
      const fileContent = await fs.readFile(configuration.docsFile, 'utf-8');
      const serializedDocs = JSON.parse(fileContent);
      docs = reduceDocs([], serializedDocs);
    } else {
      throw new Error('No sample documents to index.');
    }
  } else {
    docs = reduceDocs([], docs);
  }

  const retriever = await makeRetriever(config);
  await retriever.addDocuments(docs);

  return { docs: 'delete' };
}

// Define the graph
const builder = new StateGraph(
  IndexStateAnnotation,
  IndexConfigurationAnnotation,
)
  .addNode('ingestDocs', ingestDocs)
  .addEdge(START, 'ingestDocs')
  .addEdge('ingestDocs', END);

// Compile into a graph object that you can invoke and deploy.
export const graph = builder
  .compile()
  .withConfig({ runName: 'IngestionGraph' });
