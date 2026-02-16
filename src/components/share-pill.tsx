

export const SharePill = ({ isShared, shouldShowOff = false, absolutePosition = false }: { isShared?: boolean, shouldShowOff?: boolean, absolutePosition?: boolean }) => {
  if (!isShared && !shouldShowOff) {
    return null;
  }
  return (
    <span className={`${absolutePosition ? "absolute left-18 top-2 z-10" : ""} rounded px-2 py-1 font-medium ${isShared ? "bg-emerald-600 text-white" : "bg-neutral-200 text-neutral-600"}`}>
      {isShared ? "shared" : "not shared"}
    </span>
  );
};