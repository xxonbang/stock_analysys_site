import * as React from 'react';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, disabled, onChange, ...props }, ref) => {
    return (
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            // 기본 스타일: 미선택 상태 - 흰색 배경, 얇은 회색 테두리
            'h-4 w-4 rounded border border-gray-300 bg-white',
            'flex items-center justify-center',
            'transition-all duration-200 ease-in-out',
            // 선택 상태
            'peer-checked:bg-primary peer-checked:border-primary',
            'peer-checked:hover:bg-primary/90',
            // 미선택 상태 호버 - 테두리 색상만 변경, 배경은 흰색 유지
            'hover:border-primary/60 hover:bg-white',
            // 포커스 상태 - 테두리 효과 제거
            'peer-focus:outline-none',
            // 비활성화 상태
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            'peer-disabled:hover:border-gray-300 peer-disabled:hover:bg-white',
            disabled && 'cursor-not-allowed',
            className
          )}
        >
          {checked && (
            <CheckIcon className="h-3 w-3 text-white stroke-[3]" />
          )}
        </div>
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
