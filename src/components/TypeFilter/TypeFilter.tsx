import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { useClipboardStore } from '../../stores/clipboardStore';
import './TypeFilter.css';

interface FilterOption {
  value: string;
  label: string;
  icon: string;
  children?: FilterOption[];
}

const filterOptions: FilterOption[] = [
  { value: 'all', label: '全部类型', icon: '📋' },
  { 
    value: 'text', 
    label: '文本', 
    icon: '📝',
    children: [
      { value: 'text:all', label: '全部文本', icon: '📝' },
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
    ]
  },
  { value: 'image', label: '图片', icon: '🖼️' },
  { value: 'file', label: '文件', icon: '📁' },
];

export function TypeFilter() {
  const { selectedType, setSelectedType } = useClipboardStore();

  // 获取当前选中项的显示文本
  const getDisplayText = (value: string) => {
    for (const option of filterOptions) {
      if (option.value === value) return `${option.icon} ${option.label}`;
      if (option.children) {
        const child = option.children.find(c => c.value === value);
        if (child) return `${child.icon} ${child.label}`;
      }
    }
    return '📋 全部类型';
  };

  return (
    <div className="type-filter">
      <h3 className="type-filter-title">类型筛选</h3>
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
                <div key={option.value}>
                  <Select.Item 
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
                  
                  {option.children && (
                    <div className="type-filter-group">
                      {option.children.map((child) => (
                        <Select.Item 
                          key={child.value} 
                          value={child.value} 
                          className="type-filter-select-item type-filter-child-item"
                        >
                          <Select.ItemText>
                            <span className="type-filter-option-icon">{child.icon}</span>
                            <span className="type-filter-option-label">{child.label}</span>
                          </Select.ItemText>
                          <Select.ItemIndicator className="type-filter-indicator">
                            <Check size={14} />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </div>
                  )}
                  
                  {option.children && <Select.Separator className="type-filter-separator" />}
                </div>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}