import { Document } from '@langchain/core/documents';

/**
 * Represents the state of the retrieval graph / agent.
 */
export type documentType =
  | PDFDocument[]
  | { [key: string]: any }[]
  | string[]
  | string
  | 'delete';
export interface AgentState {
  query?: string;
  route?: string;
  messages: Array<{
    content: string;
    additional_kwargs: Record<string, any>;
    response_metadata: Record<string, any>;
    id: string;
    type: 'human' | 'assistant';
  }>;
  documents: documentType;
}

export interface RetrieveDocumentsNodeUpdates {
  retrieveDocuments: {
    documents: documentType;
  };
}

export type PDFDocument = Document & {
  metadata?: {
    loc?: {
      lines?: {
        from: number;
        to: number;
      };
      pageNumber?: number;
    };
    pdf?: {
      info?: {
        Title?: string;
        Creator?: string;
        Producer?: string;
        CreationDate?: string;
        IsXFAPresent?: boolean;
        PDFFormatVersion?: string;
        IsAcroFormPresent?: boolean;
      };
      version?: string;
      metadata?: any;
      totalPages?: number;
    };
    uuid?: string;
    source?: string;
  };
};

export interface BaseConfiguration {
  /**
   * The vector store provider to use for retrieval.
   * @default 'supabase'
   */
  retrieverProvider?: 'supabase';

  /**
   * Additional keyword arguments to pass to the search function of the retriever for filtering.
   * @default {}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filterKwargs?: Record<string, any>;

  /**
   * The number of documents to retrieve.
   * @default 5
   */
  k?: number;
}

export interface AgentConfiguration extends BaseConfiguration {
  // models
  /**
   * The language model used for processing and refining queries.
   * Should be in the form: provider/model-name.
   */
  queryModel?: string;
}

export interface IndexConfiguration extends BaseConfiguration {
  /**
   * Path to a JSON file containing default documents to index.
   */
  docsFile?: string;

  /**
   * Whether to use sample documents for indexing.
   */
  useSampleDocs?: boolean;
}
