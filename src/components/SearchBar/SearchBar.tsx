import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useClipboardStore } from '../../stores/clipboardStore';

export const SearchBar: React.FC = () => {
  const { searchTerm, setSearchTerm } = useClipboardStore();
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

  return (
    <div className="search-bar">
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