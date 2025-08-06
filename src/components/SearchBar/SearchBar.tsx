import React, { useState, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useClipboardStore } from '../../stores/clipboardStore';

const filterTypes = [
  { value: 'all', label: '全部' },
  { value: 'text', label: '文本' },
  { value: 'image', label: '图片' },
  { value: 'file', label: '文件' },
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
            <span>{currentFilter.label}</span>
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
                {type.label}
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