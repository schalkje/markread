import React, { useRef, useState, useEffect } from 'react';
import { OpenFile } from '../types';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

interface TabBarProps {
  openFiles: OpenFile[];
  activeFileId: string | null;
  onTabClick: (fileId: string) => void;
  onTabClose: (fileId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  openFiles,
  activeFileId,
  onTabClick,
  onTabClose
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [openFiles]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (openFiles.length === 0) return null;

  return (
    <div className="flex items-center bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
      {/* Left Scroll Button */}
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => scroll('left')}
          className="h-10 w-8 p-0 rounded-none border-r border-neutral-200 dark:border-neutral-800 flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      )}

      {/* Tabs Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex items-center overflow-x-auto scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {openFiles.map((file) => (
          <div
            key={file.id}
            className={`group flex items-center gap-2 px-4 h-10 border-r border-neutral-200 dark:border-neutral-800 transition-colors cursor-pointer flex-shrink-0 relative ${
              file.id === activeFileId
                ? 'bg-neutral-50 dark:bg-neutral-900'
                : 'hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50'
            }`}
            onClick={() => onTabClick(file.id)}
          >
            {/* Active indicator */}
            {file.id === activeFileId && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
            )}
            
            <span className="text-sm select-none whitespace-nowrap">
              {file.name}
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(file.id);
              }}
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-opacity"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Right Scroll Button */}
      {canScrollRight && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => scroll('right')}
          className="h-10 w-8 p-0 rounded-none border-l border-neutral-200 dark:border-neutral-800 flex-shrink-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
