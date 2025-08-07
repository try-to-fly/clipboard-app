interface TextRendererProps {
  content: string;
}

export function TextRenderer({ content }: TextRendererProps) {
  return (
    <div className="text-renderer">
      <pre className="detail-text">{content}</pre>
    </div>
  );
}