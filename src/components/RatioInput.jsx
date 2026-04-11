import React from 'react';

/**
 * 재사용 가능한 비율 입력 컴포넌트
 * - 소수점 입력 지원
 * - 위아래 조정 버튼 정상 작동
 * - placeholder는 왼쪽 정렬, 입력값은 오른쪽 정렬
 * - suffix(% 등)와 겹치지 않도록 padding 조정
 */
const RatioInput = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  suffix = '%',
  disabled = false,
  readOnly = false,
  min = 0,
  max = 100,
  step = 0.01,
  className = '',
  showHelperText = false,
  helperText = '',
}) => {
  const handleChange = (e) => {
    const inputValue = e.target.value;
    
    // 빈 값 허용
    if (inputValue === '') {
      onChange({
        target: {
          name,
          value: '',
        },
      });
      return;
    }

    // 숫자와 소수점만 허용
    const numericValue = inputValue.replace(/[^0-9.]/g, '');
    
    // 소수점이 여러 개인 경우 마지막 것만 유지
    const parts = numericValue.split('.');
    const formattedValue = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('')
      : numericValue;

    onChange({
      target: {
        name,
        value: formattedValue,
      },
    });
  };

  const handleBlur = (e) => {
    const inputValue = e.target.value;
    if (inputValue === '') return;

    let numValue = parseFloat(inputValue);
    
    // NaN 체크
    if (isNaN(numValue)) {
      onChange({
        target: {
          name,
          value: '',
        },
      });
      return;
    }

    // min/max 범위 체크
    if (numValue < min) numValue = min;
    if (numValue > max) numValue = max;

    // 정수인 경우 그대로 유지, 소수점이 있는 경우에만 step에 맞게 반올림
    const isInteger = Number.isInteger(numValue);
    let finalValue;
    
    if (isInteger) {
      finalValue = numValue;
    } else {
      // 소수점이 있는 경우에만 step에 맞게 반올림 (최대 소수점 2자리)
      const roundedValue = Math.round((numValue / step)) * step;
      finalValue = parseFloat(roundedValue.toFixed(2));
    }

    onChange({
      target: {
        name,
        value: finalValue.toString(),
      },
    });
  };

  const handleStepUp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || readOnly) return;
    const currentValue = parseFloat(value) || 0;
    const newValue = Math.min(max, currentValue + step);
    // 정수인 경우 정수로, 소수점이 있는 경우 소수점 2자리로
    const isInteger = Number.isInteger(newValue);
    const formattedValue = isInteger ? newValue.toString() : newValue.toFixed(2);
    onChange({
      target: {
        name,
        value: formattedValue,
      },
    });
  };

  const handleStepDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || readOnly) return;
    const currentValue = parseFloat(value) || 0;
    const newValue = Math.max(min, currentValue - step);
    // 정수인 경우 정수로, 소수점이 있는 경우 소수점 2자리로
    const isInteger = Number.isInteger(newValue);
    const formattedValue = isInteger ? newValue.toString() : newValue.toFixed(2);
    onChange({
      target: {
        name,
        value: formattedValue,
      },
    });
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-wealth-muted mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          name={name}
          value={value || ''}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          min={min}
          max={max}
          step={step}
          className={`w-full px-4 py-3 bg-wealth-card border border-gray-700 rounded-lg text-white text-lg text-right placeholder:text-left focus:outline-none focus:ring-2 focus:ring-wealth-gold autofill:bg-wealth-card autofill:text-white ${
            readOnly ? 'bg-gray-800/50 cursor-not-allowed' : ''
          } ${suffix && !readOnly && !disabled ? 'pr-20' : suffix ? 'pr-12' : (!readOnly && !disabled ? 'pr-12' : 'pr-4')} ${className}`}
          style={{
            WebkitBoxShadow: '0 0 0 1000px rgb(30, 41, 59) inset',
            WebkitTextFillColor: 'white',
          }}
        />
        {!readOnly && !disabled && (
          <div className={`absolute top-0 bottom-0 w-8 flex flex-col border-l border-gray-700 pointer-events-auto z-10 ${
            suffix ? 'right-12' : 'right-4'
          }`}>
            <button
              type="button"
              onClick={handleStepUp}
              onMouseDown={(e) => e.preventDefault()}
              className="flex-1 px-2 text-wealth-muted hover:text-white hover:bg-gray-700/50 active:bg-gray-600/50 transition-colors flex items-center justify-center"
              tabIndex={-1}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleStepDown}
              onMouseDown={(e) => e.preventDefault()}
              className="flex-1 px-2 text-wealth-muted hover:text-white hover:bg-gray-700/50 active:bg-gray-600/50 transition-colors flex items-center justify-center border-t border-gray-700"
              tabIndex={-1}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-wealth-muted pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {showHelperText && helperText && (
        <p className="mt-2 text-sm text-wealth-muted text-right">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default RatioInput;

