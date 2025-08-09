import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useClipboardStore } from '../../stores/clipboardStore';
import { useMemo } from 'react';

interface FilterOption {
  value: string;
  label: string;
  icon: string;
}

export function TypeFilter() {
  const { t } = useTranslation('clipboard');
  const { selectedType, setSelectedType } = useClipboardStore();

  const filterOptions = useMemo(
    (): FilterOption[] => [
      { value: 'all', label: t('contentTypes.allTypes'), icon: '📋' },
      { value: 'text', label: t('contentTypes.allText'), icon: '📝' },
      { value: 'text:plain_text', label: t('contentTypes.plainText'), icon: '📄' },
      { value: 'text:url', label: t('contentTypes.url'), icon: '🔗' },
      { value: 'text:ip_address', label: t('contentTypes.ipAddress'), icon: '🌐' },
      { value: 'text:email', label: t('contentTypes.email'), icon: '📧' },
      { value: 'text:color', label: t('contentTypes.color'), icon: '🎨' },
      { value: 'text:code', label: t('contentTypes.codeSnippet'), icon: '💻' },
      { value: 'text:command', label: t('contentTypes.command'), icon: '⌨️' },
      { value: 'text:timestamp', label: t('contentTypes.timestamp'), icon: '🕐' },
      { value: 'text:json', label: t('contentTypes.json'), icon: '{}' },
      { value: 'text:markdown', label: t('contentTypes.markdown'), icon: '📑' },
      { value: 'image', label: t('contentTypes.image'), icon: '🖼️' },
      { value: 'file', label: t('contentTypes.file'), icon: '📁' },
    ],
    [t]
  );

  // 获取当前选中项的显示文本
  const getDisplayText = (value: string) => {
    const option = filterOptions.find((opt) => opt.value === value);
    return option ? `${option.icon} ${option.label}` : `📋 ${t('contentTypes.allTypes')}`;
  };

  return (
    <div className="type-filter">
      <h3 className="type-filter-title">{t('contentTypes.allTypes')}</h3>
      <Select.Root value={selectedType} onValueChange={setSelectedType}>
        <Select.Trigger className="type-filter-trigger">
          <Select.Value>{getDisplayText(selectedType)}</Select.Value>
          <Select.Icon className="type-filter-icon">
            <ChevronDown size={16} />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content className="type-filter-content" position="popper" sideOffset={5}>
            <Select.Viewport className="type-filter-viewport">
              {filterOptions.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="type-filter-select-item"
                >
                  <Select.ItemText>
                    <span className="type-filter-option-icon">{option.icon}</span>
                    <span className="type-filter-option-label">{option.label}</span>
                  </Select.ItemText>
                  <Select.ItemIndicator className="type-filter-indicator">
                    <Check size={14} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
