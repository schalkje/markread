import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from './ui/scroll-area';

interface MarkdownViewerProps {
  content: string;
  searchTerm?: string;
  currentMatch?: number;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  content,
  searchTerm,
  currentMatch
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchTerm && currentMatch !== undefined && containerRef.current) {
      const highlights = containerRef.current.querySelectorAll('.search-highlight');
      if (highlights[currentMatch]) {
        highlights[currentMatch].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatch, searchTerm]);

  const highlightText = (text: string) => {
    if (!searchTerm) return text;

    const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, index) => {
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        return (
          <mark
            key={index}
            className="search-highlight bg-yellow-200 dark:bg-yellow-700/50"
          >
            {part}
          </mark>
        );
      }
      return part;
    }).join('');
  };

  return (
    <ScrollArea className="h-full">
      <div
        ref={containerRef}
        className="markdown-content max-w-4xl mx-auto px-8 py-6"
      >
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="mb-6 pb-3 border-b border-neutral-200 dark:border-neutral-800">
                {typeof children === 'string' ? highlightText(children) : children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mt-8 mb-4">
                {typeof children === 'string' ? highlightText(children) : children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="mt-6 mb-3">
                {typeof children === 'string' ? highlightText(children) : children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mb-4 text-neutral-700 dark:text-neutral-300">
                {typeof children === 'string' ? highlightText(children) : children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="mb-4 ml-6 list-disc space-y-2">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-4 ml-6 list-decimal space-y-2">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-neutral-700 dark:text-neutral-300">
                {children}
              </li>
            ),
            code: ({ inline, children, ...props }: any) => {
              if (inline) {
                return (
                  <code className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-sm">
                    {children}
                  </code>
                );
              }
              return (
                <code className="block p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg overflow-x-auto mb-4" {...props}>
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="mb-4">{children}</pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-4 italic text-neutral-600 dark:text-neutral-400">
                {children}
              </blockquote>
            ),
            table: ({ children }) => (
              <div className="mb-4 overflow-x-auto">
                <table className="min-w-full border-collapse border border-neutral-300 dark:border-neutral-700">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-neutral-300 dark:border-neutral-700 px-4 py-2 bg-neutral-100 dark:bg-neutral-800">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-neutral-300 dark:border-neutral-700 px-4 py-2">
                {children}
              </td>
            ),
            a: ({ href, children }) => (
              <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline">
                {children}
              </a>
            ),
            hr: () => (
              <hr className="my-8 border-neutral-200 dark:border-neutral-800" />
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </ScrollArea>
  );
};
