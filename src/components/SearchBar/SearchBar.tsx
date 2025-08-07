import React, { useState, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
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
    <div className="search-bar">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="type-filter-dropdown">
            <span>{currentFilter.icon} {currentFilter.label}</span>
            <ChevronDown size={16} />
          </button>
        </DropdownMenu.Trigger>
        
        <DropdownMenu.Portal>
          <DropdownMenu.Content className="dropdown-content" align="start">
            {filterTypes.map((type) => (
              <DropdownMenu.Item
                key={type.value}
                className="dropdown-item"
                onClick={() => setSelectedType(type.value)}
              >
                <span>{type.icon} {type.label}</span>
                {type.value === selectedType && <span className="dropdown-check">✓</span>}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <div className="search-divider"></div>
      
      <Search className="search-icon" size={18} />
      <input
        type="text"
        placeholder="搜索内容或应用..."
        value={localSearchTerm}
        onChange={(e) => setLocalSearchTerm(e.target.value)}
        className="search-input"
      />
      {localSearchTerm && (
        <button onClick={handleClear} className="clear-button">
          <X size={18} />
        </button>
      )}
    </div>
  );
};