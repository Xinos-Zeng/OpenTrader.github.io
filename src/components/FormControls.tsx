/**
 * 自定义表单控件组件
 * 
 * 完全自定义的 Select、DatePicker 和 Checkbox，避免原生控件的黑框闪现问题
 */
import { useState, useRef, useEffect } from 'react';
import './FormControls.css';

// ==================== Checkbox 复选框 ====================

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  className = ''
}: CheckboxProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!disabled) {
        onChange(!checked);
      }
    }
  };

  return (
    <div 
      className={`custom-checkbox ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
    >
      <div className="checkbox-box">
        {checked && (
          <svg 
            className="checkbox-icon" 
            width="12" 
            height="12" 
            viewBox="0 0 12 12" 
            fill="none"
          >
            <path 
              d="M2 6L5 9L10 3" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {label && <span className="checkbox-text">{label}</span>}
    </div>
  );
}

// ==================== Select 下拉框 ====================

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({ 
  value, 
  onChange, 
  options, 
  placeholder = '请选择',
  disabled = false,
  className = ''
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  
  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // 获取当前选中的标签
  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption?.label || placeholder;
  
  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };
  
  return (
    <div 
      ref={selectRef}
      className={`custom-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`}
    >
      <div 
        className="select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`select-value ${!selectedOption ? 'placeholder' : ''}`}>
          {displayLabel}
        </span>
        <span className="select-arrow">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
      
      {isOpen && !disabled && (
        <div className="select-dropdown">
          {options.map(option => (
            <div
              key={option.value}
              className={`select-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
              {option.value === value && (
                <span className="check-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== DatePicker 日期选择器 ====================

interface DatePickerProps {
  value: string;  // YYYY-MM-DD 格式
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({ 
  value, 
  onChange, 
  min,
  max,
  disabled = false,
  className = ''
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });
  const pickerRef = useRef<HTMLDivElement>(null);
  
  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  // 格式化显示日期
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '选择日期';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };
  
  // 获取月份的天数
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  // 获取月份第一天是星期几
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  // 生成日历数据
  const generateCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days: (number | null)[] = [];
    
    // 填充前面的空白
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    
    // 填充日期
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };
  
  // 检查日期是否可选
  const isDateDisabled = (day: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (min && dateStr < min) return true;
    if (max && dateStr > max) return true;
    return false;
  };
  
  // 检查日期是否选中
  const isDateSelected = (day: number) => {
    if (!value) return false;
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === value;
  };
  
  // 选择日期
  const handleSelectDate = (day: number) => {
    if (isDateDisabled(day)) return;
    
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(dateStr);
    setIsOpen(false);
  };
  
  // 切换月份
  const changeMonth = (delta: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + delta);
      return newDate;
    });
  };
  
  // 切换年份
  const changeYear = (delta: number) => {
    setViewDate(prev => {
      const newDate = new Date(prev);
      newDate.setFullYear(newDate.getFullYear() + delta);
      return newDate;
    });
  };
  
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const calendarDays = generateCalendar();
  
  return (
    <div 
      ref={pickerRef}
      className={`custom-datepicker ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${className}`}
    >
      <div 
        className="datepicker-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={`datepicker-value ${!value ? 'placeholder' : ''}`}>
          {formatDisplayDate(value)}
        </span>
        <span className="datepicker-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M2 6H14" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 1V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M11 1V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </span>
      </div>
      
      {isOpen && !disabled && (
        <div className="datepicker-dropdown">
          {/* 头部导航 */}
          <div className="datepicker-header">
            <button className="nav-btn" onClick={() => changeYear(-1)} title="上一年">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M8 3L4 7L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M12 3L8 7L12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="nav-btn" onClick={() => changeMonth(-1)} title="上一月">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            
            <span className="current-month">
              {viewDate.getFullYear()}年{viewDate.getMonth() + 1}月
            </span>
            
            <button className="nav-btn" onClick={() => changeMonth(1)} title="下一月">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <button className="nav-btn" onClick={() => changeYear(1)} title="下一年">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 3L6 7L2 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M6 3L10 7L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          
          {/* 星期头 */}
          <div className="datepicker-weekdays">
            {weekDays.map(day => (
              <span key={day} className="weekday">{day}</span>
            ))}
          </div>
          
          {/* 日期网格 */}
          <div className="datepicker-days">
            {calendarDays.map((day, index) => (
              <span
                key={index}
                className={`day ${day === null ? 'empty' : ''} ${day && isDateSelected(day) ? 'selected' : ''} ${day && isDateDisabled(day) ? 'disabled' : ''}`}
                onClick={() => day && handleSelectDate(day)}
              >
                {day}
              </span>
            ))}
          </div>
          
          {/* 快捷按钮 */}
          <div className="datepicker-footer">
            <button 
              className="today-btn"
              onClick={() => {
                const today = new Date();
                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                onChange(dateStr);
                setViewDate(today);
                setIsOpen(false);
              }}
            >
              今天
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
