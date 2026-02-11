"use client";

type FancyCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
};

export default function FancyCheckbox({
  checked,
  onChange,
  label,
  className,
}: FancyCheckboxProps) {
  return (
    <label className={`checkbox-chip ${className ?? ""}`.trim()}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="checkbox-box" aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </label>
  );
}

