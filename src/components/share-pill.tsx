

export const SharePill = ({ isShared, shouldShowOff = false, absolutePosition = false }: { isShared?: boolean, shouldShowOff?: boolean, absolutePosition?: boolean }) => {
  if (!isShared && !shouldShowOff) {
    return null;
  }
  return (
    <span className={`${absolutePosition ? "absolute left-[calc(50%-40px)] sm:left-18 top-1 z-10" : ""} rounded px-2 ${absolutePosition ? "py-0.5" : "py-1.5"} font-medium ${isShared ? "bg-emerald-600 text-white" : "bg-neutral-200 text-neutral-600"}`}>
      {isShared ? "shared" : "not shared"}
    </span>
  );
};