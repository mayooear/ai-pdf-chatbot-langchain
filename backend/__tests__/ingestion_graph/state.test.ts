import { Document } from '@langchain/core/documents';
import { reduceDocs } from '../../src/shared/state.js';

describe('IndexStateAnnotation', () => {
  describe('docs reducer', () => {
    it('should handle adding new documents', () => {
      const initialDocs: Document[] = [];
      const newDoc = new Document({
        pageContent: 'test content',
        metadata: { source: 'test.pdf', page: 1 },
      });

      const result = reduceDocs(initialDocs, [newDoc]);
      expect(result).toHaveLength(1);
      expect(result[0].pageContent).toBe('test content');
      expect(result[0].metadata).toEqual({ source: 'test.pdf', page: 1 });
    });

    it('should handle merging multiple documents', () => {
      const initialDocs = [
        new Document({
          pageContent: 'initial doc',
          metadata: { source: 'initial.pdf', page: 1 },
        }),
      ];

      const newDocs = [
        new Document({
          pageContent: 'new doc 1',
          metadata: { source: 'new1.pdf', page: 1 },
        }),
        new Document({
          pageContent: 'new doc 2',
          metadata: { source: 'new2.pdf', page: 1 },
        }),
      ];

      const result = reduceDocs(initialDocs, newDocs);
      expect(result).toHaveLength(3);
      expect(result.map((doc: Document) => doc.pageContent)).toEqual([
        'initial doc',
        'new doc 1',
        'new doc 2',
      ]);
      expect(result.map((doc: Document) => doc.metadata.source)).toEqual([
        'initial.pdf',
        'new1.pdf',
        'new2.pdf',
      ]);
    });

    it('should handle empty document arrays', () => {
      const initialDocs: Document[] = [];
      const newDocs: Document[] = [];

      const result = reduceDocs(initialDocs, newDocs);
      expect(result).toHaveLength(0);
    });

    it('should handle "delete" action', () => {
      const initialDocs = [
        new Document({
          pageContent: 'to be deleted',
          metadata: { source: 'delete.pdf', page: 1 },
        }),
      ];

      const result = reduceDocs(initialDocs, 'delete');
      expect(result).toHaveLength(0);
    });
  });
});
