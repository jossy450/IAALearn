import React, { useState, useRef, useEffect } from 'react';
import { X, Copy, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import '../styles/FloatingAnswer.css';

const FloatingAnswer = ({ 
  answer, 
  isVisible, 
  onClose, 
  isStreaming,
  formatAnswer 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const defaultWidth = 420;
      return {
        x: Math.max(8, (window.innerWidth - defaultWidth) / 2),
        y: 8,  // Very top, near camera position
      };
    }
    return { x: 20, y: 8 };
  });
  const [size, setSize] = useState({ width: 480, height: 300 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.closest('.floating-answer-header') && !e.target.closest('button')) {
      setIsDragging(true);
      const rect = containerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    }
    if (isResizing) {
      const minWidth = 320;
      const minHeight = 140;
      const rect = containerRef.current.getBoundingClientRect();
      
      setSize({
        width: Math.max(minWidth, e.clientX - rect.left),
        height: Math.max(minHeight, e.clientY - rect.top),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset]);

  if (!isVisible || !answer) return null;

  return (
    <div
      ref={containerRef}
      className="floating-answer-container"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: isCollapsed ? 'auto' : `${size.height}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header - Draggable */}
      <div className="floating-answer-header">
        <div className="header-content">
          <span className="header-title">✨ AI Answer</span>
          <span className="header-indicator">
            {isStreaming && <span className="streaming-dot">●</span>}
          </span>
        </div>
        <div className="header-controls">
          <button
            className="icon-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            className="icon-btn"
            onClick={() => navigator.clipboard.writeText(answer)}
            title="Copy answer"
          >
            <Copy size={16} />
          </button>
          <button
            className="icon-btn close-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content - Scrollable */}
      {!isCollapsed && (
        <div className="floating-answer-content">
          <div
            className="answer-text"
            dangerouslySetInnerHTML={{ __html: formatAnswer(answer) }}
          />
          {isStreaming && <span className="streaming-cursor">▌</span>}
        </div>
      )}

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          className="resize-handle"
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        />
      )}
    </div>
  );
};

export default FloatingAnswer;
