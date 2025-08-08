import { Card, CardContent } from '../../ui/card';
import { ScrollArea } from '../../ui/scroll-area';

interface TextRendererProps {
  content: string;
}

export function TextRenderer({ content }: TextRendererProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="max-h-96">
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">
            {content}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}