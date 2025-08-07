import { useState, useEffect, useRef } from 'react';
import { Keyboard, RotateCcw, Check, X } from 'lucide-react';
import './ShortcutRecorder.css';

interface ShortcutRecorderProps {
  value: string;
  onChange: (shortcut: string) => void;
  onValidate?: (shortcut: string) => Promise<boolean>;
}

interface RecordedKeys {
  key: string;
  modifiers: {
    cmd: boolean;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
  };
}

const MAC_KEY_SYMBOLS: Record<string, string> = {
  'cmd': '⌘',
  'ctrl': '⌃',
  'alt': '⌥',
  'shift': '⇧',
  'meta': '⌘',
  'control': '⌃',
  'option': '⌥',
  'enter': '↵',
  'return': '↵',
  'escape': '⎋',
  'esc': '⎋',
  'tab': '⇥',
  'space': '␣',
  'backspace': '⌫',
  'delete': '⌦',
  'arrowup': '↑',
  'arrowdown': '↓',
  'arrowleft': '←',
  'arrowright': '→',
  'up': '↑',
  'down': '↓',
  'left': '←',
  'right': '→',
};

export function ShortcutRecorder({ value, onChange, onValidate }: ShortcutRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<RecordedKeys | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);

  // Convert shortcut string to display format with symbols
  const formatShortcut = (shortcut: string): string => {
    if (!shortcut) return '';
    
    return shortcut
      .split('+')
      .map(part => {
        const key = part.toLowerCase().trim();
        return MAC_KEY_SYMBOLS[key] || part.toUpperCase();
      })
      .join(' + ');
  };

  // Convert recorded keys to shortcut string
  const keysToShortcut = (keys: RecordedKeys): string => {
    const parts: string[] = [];
    
    if (keys.modifiers.cmd || keys.modifiers.ctrl) {
      parts.push('CmdOrCtrl');
    }
    if (keys.modifiers.alt) {
      parts.push('Alt');
    }
    if (keys.modifiers.shift) {
      parts.push('Shift');
    }
    
    // Add the main key (capitalize first letter)
    const mainKey = keys.key.charAt(0).toUpperCase() + keys.key.slice(1).toLowerCase();
    parts.push(mainKey);
    
    return parts.join('+');
  };

  // Handle key recording
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isRecording) return;
    
    e.preventDefault();
    e.stopPropagation();

    const key = e.key.toLowerCase();
    
    // Skip modifier-only keys
    if (['meta', 'control', 'alt', 'shift', 'cmd', 'ctrl'].includes(key)) {
      return;
    }

    const recorded: RecordedKeys = {
      key: key,
      modifiers: {
        cmd: e.metaKey,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
      }
    };

    setRecordedKeys(recorded);
  };

  useEffect(() => {
    if (isRecording) {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [isRecording]);

  const startRecording = () => {
    setIsRecording(true);
    setRecordedKeys(null);
    setValidationError(null);
    inputRef.current?.focus();
  };

  const cancelRecording = () => {
    setIsRecording(false);
    setRecordedKeys(null);
    setValidationError(null);
  };

  const confirmShortcut = async () => {
    if (!recordedKeys) return;

    const newShortcut = keysToShortcut(recordedKeys);
    
    // Validate the shortcut
    if (onValidate) {
      setIsValidating(true);
      try {
        const isValid = await onValidate(newShortcut);
        if (!isValid) {
          setValidationError('This shortcut conflicts with system shortcuts or is invalid');
          setIsValidating(false);
          return;
        }
      } catch (error) {
        setValidationError('Failed to validate shortcut');
        setIsValidating(false);
        return;
      }
      setIsValidating(false);
    }

    onChange(newShortcut);
    setIsRecording(false);
    setRecordedKeys(null);
    setValidationError(null);
  };

  const currentDisplay = recordedKeys ? formatShortcut(keysToShortcut(recordedKeys)) : '';
  const hasValidKeys = recordedKeys && 
    (recordedKeys.modifiers.cmd || recordedKeys.modifiers.ctrl || recordedKeys.modifiers.alt) &&
    recordedKeys.key !== '';

  return (
    <div className="shortcut-recorder">
      {!isRecording ? (
        <div className="shortcut-display">
          <div className="shortcut-value">
            <Keyboard size={16} />
            <span>{formatShortcut(value) || '未设置'}</span>
          </div>
          <button 
            className="change-button"
            onClick={startRecording}
          >
            更改
          </button>
        </div>
      ) : (
        <div className="shortcut-recording">
          <div 
            ref={inputRef}
            className="recording-input"
            tabIndex={0}
          >
            {currentDisplay || '请按下快捷键组合...'}
          </div>
          
          <div className="recording-actions">
            <button
              className="action-button cancel"
              onClick={cancelRecording}
              title="取消"
            >
              <X size={14} />
            </button>
            
            <button
              className="action-button reset"
              onClick={() => setRecordedKeys(null)}
              title="重新录制"
              disabled={!recordedKeys}
            >
              <RotateCcw size={14} />
            </button>
            
            <button
              className="action-button confirm"
              onClick={confirmShortcut}
              title="确认"
              disabled={!hasValidKeys || isValidating}
            >
              {isValidating ? (
                <div className="spinner" />
              ) : (
                <Check size={14} />
              )}
            </button>
          </div>
        </div>
      )}
      
      {validationError && (
        <div className="validation-error">
          {validationError}
        </div>
      )}
      
      {isRecording && (
        <div className="recording-hint">
          快捷键必须包含至少一个修饰键（⌘、⌃、⌥）
        </div>
      )}
    </div>
  );
}