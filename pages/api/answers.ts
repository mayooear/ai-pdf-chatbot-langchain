// This file handles API requests for fetching and deleting answers.
// It provides functionality to retrieve answers with pagination, sorting, and filtering options,
// as well as deleting individual answers with proper authentication.

import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/services/firebase';
import { getSudoCookie } from '@/utils/server/sudoCookieUtils';
import { getAnswersCollectionName } from '@/utils/server/firestoreUtils';
import {
  getTotalDocuments,
  getAnswersByIds,
} from '@/utils/server/answersUtils';
import { Answer } from '@/types/answer';
import { Document } from 'langchain/document';
import { withApiMiddleware } from '@/utils/server/apiMiddleware';

// 6/23/24: likedOnly filtering not being used in UI but leaving here for potential future use

// Retrieves answers based on specified criteria (page, limit, liked status, and sort order)
// Returns an array of answers and the total number of pages
async function getAnswers(
  page: number,
  limit: number,
  likedOnly: boolean,
  sortBy: string,
): Promise<{ answers: Answer[]; totalPages: number }> {
  // Initialize the query with sorting options
  let answersQuery = db
    .collection(getAnswersCollectionName())
    .orderBy(sortBy === 'mostPopular' ? 'likeCount' : 'timestamp', 'desc');

  // Add secondary sorting by timestamp for 'mostPopular' option
  if (sortBy === 'mostPopular') {
    answersQuery = answersQuery.orderBy('timestamp', 'desc');
  }

  // Calculate pagination details
  const totalDocs = await getTotalDocuments();
  const totalPages = Math.max(1, Math.ceil(totalDocs / limit)); // Ensure at least 1 page
  const offset = (page - 1) * limit;

  // Apply pagination to the query
  answersQuery = answersQuery.offset(offset).limit(limit);

  // Filter for liked answers if specified
  if (likedOnly) {
    answersQuery = answersQuery.where('likeCount', '>', 0);
  }

  // Execute the query and process the results
  const answersSnapshot = await answersQuery.get();
  const answers = answersSnapshot.docs.map((doc) => {
    const data = doc.data();
    let sources: Document[] = [];

    // Parse sources, handling potential errors
    try {
      sources = data.sources ? (JSON.parse(data.sources) as Document[]) : [];
    } catch (e) {
      // Very early sources were stored in non-JSON so recognize those and only log an error for other cases
      if (!data.sources.trim().substring(0, 50).includes('Sources:')) {
        console.error('Error parsing sources:', e);
        console.log("data.sources: '" + data.sources + "'");
        if (!data.sources || data.sources.length === 0) {
          console.log('data.sources is empty or null');
        }
      }
    }

    // Construct and return the Answer object
    return {
      id: doc.id,
      question: data.question,
      answer: data.answer,
      timestamp: data.timestamp,
      sources: sources as Document<Record<string, unknown>>[],
      vote: data.vote,
      collection: data.collection,
      ip: data.ip,
      likeCount: data.likeCount || 0,
      relatedQuestionsV2: data.relatedQuestionsV2 || [],
      related_questions: data.related_questions,
      adminAction: data.adminAction,
      adminActionTimestamp: data.adminActionTimestamp,
    } as Answer;
  });

  return { answers, totalPages };
}

// Deletes an answer by its ID
async function deleteAnswerById(id: string): Promise<void> {
  try {
    await db.collection(getAnswersCollectionName()).doc(id).delete();
  } catch (error) {
    console.error('Error deleting answer: ', error);
    throw error;
  }
}

// Main handler function for the API endpoint
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { answerIds } = req.query;

      if (answerIds) {
        // Handle fetching specific answers by IDs
        if (typeof answerIds !== 'string') {
          return res.status(400).json({
            message: 'answerIds parameter must be a comma-separated string.',
          });
        }
        const idsArray = answerIds.split(',');
        const answers = await getAnswersByIds(idsArray);
        if (answers.length === 0) {
          return res.status(404).json({ message: 'Answer not found.' });
        }
        res.status(200).json(answers);
      } else {
        // Handle fetching answers with pagination and filtering
        const { page, limit, likedOnly, sortBy } = req.query;
        const pageNumber = parseInt(page as string) || 1; // Default to page 1 if not provided
        const limitNumber = parseInt(limit as string) || 10;
        const likedOnlyFlag = likedOnly === 'true';
        const sortByValue = (sortBy as string) || 'mostRecent';
        const { answers, totalPages } = await getAnswers(
          pageNumber,
          limitNumber,
          likedOnlyFlag,
          sortByValue,
        );
        res.status(200).json({ answers, totalPages });
      }
    } catch (error: unknown) {
      // Error handling for GET requests
      console.error('Error fetching answers: ', error);
      if (error instanceof Error) {
        if ('code' in error && error.code === 8) {
          res.status(429).json({
            message: 'Error: Quota exceeded. Please try again later.',
          });
        } else {
          res
            .status(500)
            .json({ message: 'Error fetching answers', error: error.message });
        }
      } else {
        res.status(500).json({ message: 'An unknown error occurred' });
      }
    }
  } else if (req.method === 'DELETE') {
    try {
      // Handle deleting an answer
      const { answerId } = req.query;
      if (!answerId || typeof answerId !== 'string') {
        return res
          .status(400)
          .json({ message: 'answerId parameter is required.' });
      }
      // Check for sudo permissions before allowing deletion
      const sudo = getSudoCookie(req, res);
      if (!sudo.sudoCookieValue) {
        return res.status(403).json({ message: `Forbidden: ${sudo.message}` });
      }
      await deleteAnswerById(answerId);
      res.status(200).json({ message: 'Answer deleted successfully.' });
    } catch (error: unknown) {
      // Error handling for DELETE requests
      console.error('Handler: Error deleting answer: ', error);
      if (error instanceof Error) {
        res
          .status(500)
          .json({ message: 'Error deleting answer', error: error.message });
      } else {
        res.status(500).json({
          message: 'Error deleting answer',
          error: 'An unknown error occurred',
        });
      }
    }
  } else {
    // Handle unsupported HTTP methods
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Apply API middleware for additional functionality (e.g., error handling, authentication)
export default withApiMiddleware(handler);
