import { useClipboardStore } from '../../stores/clipboardStore';
import './TypeFilter.css';

const filterTypes = [
  { value: 'all', label: '全部', icon: '📋' },
  { value: 'text', label: '文本', icon: '📝' },
  { value: 'image', label: '图片', icon: '🖼️' },
  { value: 'file', label: '文件', icon: '📁' },
];

export function TypeFilter() {
  const { selectedType, setSelectedType } = useClipboardStore();

  return (
    <div className="type-filter">
      <h3 className="type-filter-title">类型筛选</h3>
      <div className="type-filter-list">
        {filterTypes.map((type) => (
          <button
            key={type.value}
            className={`type-filter-item ${selectedType === type.value ? 'active' : ''}`}
            onClick={() => setSelectedType(type.value)}
          >
            <span className="type-filter-icon">{type.icon}</span>
            <span className="type-filter-label">{type.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}