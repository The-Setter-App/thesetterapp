import { Minus, Check } from 'lucide-react';

interface CustomCheckboxProps {
  checked: boolean | 'indeterminate';
  onChange: () => void;
}

export default function CustomCheckbox({ checked, onChange }: CustomCheckboxProps) {
  return (
    <div
      onClick={onChange}
      className={`w-4 h-4 flex items-center justify-center rounded-[5px] cursor-pointer border transition-all duration-200
        ${checked === 'indeterminate'
          ? 'border-2 border-[#8B5CF6] bg-white'
          : checked
            ? 'bg-[#8B5CF6] border-[#8B5CF6] border-2'
            : 'bg-white border-gray-300 hover:border-gray-400 border-2'}
      `}
    >
      {checked === 'indeterminate' && (
        <Minus size={12} strokeWidth={2} className="text-[#8B5CF6]" />
      )}
      {checked === true && (
        <Check
          size={10}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white mt-[1px] ml-[.5px]"
        />
      )}
    </div>
  );
}