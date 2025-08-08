import React, { useState, useEffect } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { useClipboardStore } from '../../stores/clipboardStore';

const filterTypes = [
  { value: 'all', label: '全部', icon: '📋' },
  { value: 'text', label: '全部文本', icon: '📝' },
  { value: 'text:plain_text', label: '纯文本', icon: '📄' },
  { value: 'text:url', label: 'URL链接', icon: '🔗' },
  { value: 'text:ip_address', label: 'IP地址', icon: '🌐' },
  { value: 'text:email', label: '邮箱地址', icon: '📧' },
  { value: 'text:color', label: '颜色值', icon: '🎨' },
  { value: 'text:code', label: '代码片段', icon: '💻' },
  { value: 'text:command', label: '命令行', icon: '⌨️' },
  { value: 'text:timestamp', label: '时间戳', icon: '🕐' },
  { value: 'text:json', label: 'JSON数据', icon: '{}' },
  { value: 'text:markdown', label: 'Markdown', icon: '📑' },
  { value: 'image', label: '图片', icon: '🖼️' },
  { value: 'file', label: '文件', icon: '📁' },
];

export const SearchBar: React.FC = () => {
  const { searchTerm, setSearchTerm, selectedType, setSelectedType } = useClipboardStore();
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [localSearchTerm, setSearchTerm]);

  const handleClear = () => {
    setLocalSearchTerm('');
    setSearchTerm('');
  };

  const currentFilter = filterTypes.find(f => f.value === selectedType) || filterTypes[0];

  return (
    <div className="flex items-center bg-secondary rounded-lg overflow-hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 px-4 py-3 h-auto rounded-none hover:bg-accent"
          >
            <span>{currentFilter.icon} {currentFilter.label}</span>
            <ChevronDown size={16} />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="min-w-[200px]">
          {filterTypes.map((type) => (
            <DropdownMenuItem
              key={type.value}
              className="flex items-center justify-between"
              onClick={() => setSelectedType(type.value)}
            >
              <span className="flex items-center gap-2">
                <span>{type.icon}</span>
                <span>{type.label}</span>
              </span>
              {type.value === selectedType && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="w-px h-5 bg-border"></div>
      
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="搜索内容或应用..."
          value={localSearchTerm}
          onChange={(e) => setLocalSearchTerm(e.target.value)}
          className="border-0 bg-transparent pl-10 pr-10 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {localSearchTerm && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};