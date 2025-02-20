'use client';

import type React from 'react';

import { useToast } from '@/hooks/use-toast';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, ArrowUp, Loader2 } from 'lucide-react';
import { ExamplePrompts } from '@/components/example-prompts';
import { ChatMessage } from '@/components/chat-message';
import { FilePreview } from '@/components/file-preview';
import { client } from '@/lib/langgraph-client';
import {
  AgentState,
  documentType,
  PDFDocument,
  RetrieveDocumentsNodeUpdates,
} from '@/types/graphTypes';
import { Card, CardContent } from '@/components/ui/card';
export default function Home() {
  const { toast } = useToast(); // Add this hook
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      sources?: PDFDocument[];
    }>
  >([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // Track the AbortController
  const messagesEndRef = useRef<HTMLDivElement>(null); // Add this ref
  const lastRetrievedDocsRef = useRef<PDFDocument[]>([]); // useRef to store the last retrieved documents

  useEffect(() => {
    // Create a thread when the component mounts
    const initThread = async () => {
      // Skip if we already have a thread
      if (threadId) return;

      try {
        const thread = await client.createThread();

        setThreadId(thread.thread_id);
      } catch (error) {
        console.error('Error creating thread:', error);
        toast({
          title: 'Error',
          description:
            'Error creating thread. Please make sure you have set the LANGGRAPH_API_URL environment variable correctly. ' +
            error,
          variant: 'destructive',
        });
      }
    };
    initThread();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !threadId || isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const userMessage = input.trim();
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMessage, sources: undefined }, // Clear sources for new user message
      { role: 'assistant', content: '', sources: undefined }, // Clear sources for new assistant message
    ]);
    setInput('');
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    lastRetrievedDocsRef.current = []; // Clear the last retrieved documents

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          threadId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value);
        const lines = chunkStr.split('\n').filter(Boolean);

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;

          const sseString = line.slice('data: '.length);
          let sseEvent: any;
          try {
            sseEvent = JSON.parse(sseString);
          } catch (err) {
            console.error('Error parsing SSE line:', err, line);
            continue;
          }

          const { event, data } = sseEvent;

          if (event === 'messages/partial') {
            if (Array.isArray(data)) {
              const lastObj = data[data.length - 1];
              if (lastObj?.type === 'ai') {
                const partialContent = lastObj.content ?? '';

                // Only display if content is a string message
                if (
                  typeof partialContent === 'string' &&
                  !partialContent.startsWith('{')
                ) {
                  setMessages((prev) => {
                    const newArr = [...prev];
                    if (
                      newArr.length > 0 &&
                      newArr[newArr.length - 1].role === 'assistant'
                    ) {
                      newArr[newArr.length - 1].content = partialContent;
                      newArr[newArr.length - 1].sources =
                        lastRetrievedDocsRef.current;
                    }

                    return newArr;
                  });
                }
              }
            }
          } else if (event === 'updates' && data) {
            if (
              data &&
              typeof data === 'object' &&
              'retrieveDocuments' in data &&
              data.retrieveDocuments &&
              Array.isArray(data.retrieveDocuments.documents)
            ) {
              const retrievedDocs = (data as RetrieveDocumentsNodeUpdates)
                .retrieveDocuments.documents as PDFDocument[];

              // // Handle documents here
              lastRetrievedDocsRef.current = retrievedDocs;
              console.log('Retrieved documents:', retrievedDocs);
            } else {
              // Clear the last retrieved documents if it's a direct answer
              lastRetrievedDocsRef.current = [];
            }
          } else {
            console.log('Unknown SSE event:', event, data);
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description:
          'Failed to send message. Please try again.\n' +
          (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive',
      });
      setMessages((prev) => {
        const newArr = [...prev];
        newArr[newArr.length - 1].content =
          'Sorry, there was an error processing your message.';
        return newArr;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const nonPdfFiles = selectedFiles.filter(
      (file) => file.type !== 'application/pdf',
    );
    if (nonPdfFiles.length > 0) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload PDF files only',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/ingest', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload files');
      }

      setFiles((prev) => [...prev, ...selectedFiles]);
      toast({
        title: 'Success',
        description: `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} uploaded successfully`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: 'Upload failed',
        description:
          'Failed to upload files. Please try again.\n' +
          (error instanceof Error ? error.message : 'Unknown error'),
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles(files.filter((file) => file !== fileToRemove));
    toast({
      title: 'File removed',
      description: `${fileToRemove.name} has been removed`,
      variant: 'default',
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-24 max-w-5xl mx-auto w-full">
      {messages.length === 0 ? (
        <>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="font-medium text-muted-foreground max-w-md mx-auto">
                This ai chatbot is an example template to accompany the book:{' '}
                <a
                  href="https://tinyurl.com/learning-langchain"
                  className="underline hover:text-foreground"
                >
                  Learning LangChain (O'Reilly): Building AI and LLM
                  applications with LangChain and LangGraph
                </a>
              </p>
            </div>
          </div>
          <ExamplePrompts onPromptSelect={setInput} />
        </>
      ) : (
        <div className="w-full space-y-4 mb-20">
          {messages.map((message, i) => (
            <ChatMessage key={i} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background">
        <div className="max-w-5xl mx-auto space-y-4">
          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {files.map((file, index) => (
                <FilePreview
                  key={`${file.name}-${index}`}
                  file={file}
                  onRemove={() => handleRemoveFile(file)}
                />
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative">
            <div className="flex gap-2 border rounded-md overflow-hidden bg-gray-50">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                multiple
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-none h-12"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isUploading ? 'Uploading PDF...' : 'Send a message...'
                }
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 bg-transparent"
                disabled={isUploading || isLoading || !threadId}
              />
              <Button
                type="submit"
                size="icon"
                className="rounded-none h-12"
                disabled={
                  !input.trim() || isUploading || isLoading || !threadId
                }
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
