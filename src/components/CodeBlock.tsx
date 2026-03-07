import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './CodeBlock.css';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  maxHeight?: string;
  onCopy?: () => void;
}

export default function CodeBlock({ 
  code, 
  language = 'python', 
  showLineNumbers = true,
  maxHeight = '400px',
  onCopy 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-language">{language}</span>
        <button 
          className={`code-copy-btn ${copied ? 'copied' : ''}`} 
          onClick={handleCopy} 
          title="复制代码"
        >
          {copied ? '✓ 已复制' : '📋 复制'}
        </button>
      </div>
      <div className="code-block-content" style={{ maxHeight }}>
        <SyntaxHighlighter
          language={language}
          style={tomorrow}
          showLineNumbers={showLineNumbers}
          wrapLines={true}
          customStyle={{
            margin: 0,
            borderRadius: '0 0 8px 8px',
            fontSize: '13px',
            lineHeight: '1.5',
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
