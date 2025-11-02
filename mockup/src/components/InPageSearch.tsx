import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ChevronUp, ChevronDown, X } from 'lucide-react';

interface InPageSearchProps {
  content: string;
  onSearch: (term: string, currentMatch: number) => void;
  isVisible: boolean;
  onClose: () => void;
}

export const InPageSearch: React.FC<InPageSearchProps> = ({
  content,
  onSearch,
  isVisible,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  useEffect(() => {
    if (searchTerm) {
      const matches = content.toLowerCase().split(searchTerm.toLowerCase()).length - 1;
      setTotalMatches(matches);
      if (matches === 0) {
        setCurrentMatch(0);
      } else if (currentMatch >= matches) {
        setCurrentMatch(matches - 1);
      }
      onSearch(searchTerm, currentMatch);
    } else {
      setTotalMatches(0);
      setCurrentMatch(0);
      onSearch('', 0);
    }
  }, [searchTerm, currentMatch]);

  const handleNext = () => {
    if (totalMatches > 0) {
      setCurrentMatch((prev) => (prev + 1) % totalMatches);
    }
  };

  const handlePrevious = () => {
    if (totalMatches > 0) {
      setCurrentMatch((prev) => (prev - 1 + totalMatches) % totalMatches);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
      <Input
        type="text"
        placeholder="Find in page..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-64 h-8"
        autoFocus
      />
      <span className="text-sm text-neutral-500 min-w-[60px]">
        {searchTerm && totalMatches > 0
          ? `${currentMatch + 1} of ${totalMatches}`
          : searchTerm && totalMatches === 0
          ? 'No matches'
          : ''}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePrevious}
        disabled={totalMatches === 0}
        className="h-8 w-8 p-0"
      >
        <ChevronUp className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNext}
        disabled={totalMatches === 0}
        className="h-8 w-8 p-0"
      >
        <ChevronDown className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 w-8 p-0"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};
