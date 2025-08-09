import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { useClipboardStore } from '../../stores/clipboardStore';
import { analytics, ANALYTICS_EVENTS } from '../../services/analytics';


export const SearchBar: React.FC = () => {
  const { t } = useTranslation(['common', 'clipboard']);
  const { searchTerm, setSearchTerm, selectedType, setSelectedType } = useClipboardStore();
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);
  
  const filterTypes = useMemo(() => [
    { value: 'all', label: t('clipboard:contentTypes.allTypes'), icon: '📋' },
    { value: 'text', label: t('clipboard:contentTypes.allText'), icon: '📝' },
    { value: 'text:plain_text', label: t('clipboard:contentTypes.plainText'), icon: '📄' },
    { value: 'text:url', label: t('clipboard:contentTypes.url'), icon: '🔗' },
    { value: 'text:ip_address', label: t('clipboard:contentTypes.ipAddress'), icon: '🌐' },
    { value: 'text:email', label: t('clipboard:contentTypes.email'), icon: '📧' },
    { value: 'text:color', label: t('clipboard:contentTypes.color'), icon: '🎨' },
    { value: 'text:code', label: t('clipboard:contentTypes.codeSnippet'), icon: '💻' },
    { value: 'text:command', label: t('clipboard:contentTypes.command'), icon: '⌨️' },
    { value: 'text:timestamp', label: t('clipboard:contentTypes.timestamp'), icon: '🕐' },
    { value: 'text:json', label: t('clipboard:contentTypes.json'), icon: '{}' },
    { value: 'text:markdown', label: t('clipboard:contentTypes.markdown'), icon: '📑' },
    { value: 'image', label: t('clipboard:contentTypes.image'), icon: '🖼️' },
    { value: 'file', label: t('clipboard:contentTypes.file'), icon: '📁' },
  ], [t]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setSearchTerm(localSearchTerm);
      // Track search performed (only if there's a search term)
      if (localSearchTerm.trim()) {
        analytics.track(ANALYTICS_EVENTS.SEARCH_PERFORMED, {
          has_filter: selectedType !== 'all' ? 1 : 0,
          filter_type: selectedType,
        });
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [localSearchTerm, setSearchTerm, selectedType]);

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
          placeholder={t('common:search')}
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