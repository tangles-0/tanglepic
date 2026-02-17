"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DitherColorMode, ImageDitherer, type DitherParams } from "@/lib/ditherspace";
import Link from "next/link";

type DitherEditorProps = {
  imageUrl: string;
  imageName: string;
  outputExt: string;
  onCancel: () => void;
  onSave: (blob: Blob) => Promise<void>;
  onSaveCopy: (blob: Blob) => Promise<void>;
};

const PARAM_LIMITS = {
  pixelSize: { min: 1, max: 20, step: 1 },
  ditherAmount: { min: 0, max: 1, step: 0.05 },
  bitDepth: { min: 1, max: 8, step: 1 },
  contrast: { min: 0.5, max: 2, step: 0.1 },
  scale: { min: 0.1, max: 2, step: 0.1 },
} as const;

const DEFAULT_PARAMS: DitherParams = {
  algorithm: "bayer",
  colorMode: "bw",
  pixelSize: 4,
  ditherAmount: 0.75,
  bitDepth: 2,
  contrast: 1,
  scale: 1,
  fgColor: "#000000",
  bgColor: "#ffffff",
};

function mimeTypeForExt(ext: string): string {
  const normalized = ext.toLowerCase();
  if (normalized === "png") {
    return "image/png";
  }
  if (normalized === "webp") {
    return "image/webp";
  }
  if (normalized === "gif") {
    return "image/gif";
  }
  return "image/jpeg";
}

export function DitherEditor({
  imageUrl,
  imageName,
  outputExt,
  onCancel,
  onSave,
  onSaveCopy,
}: DitherEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dithererRef = useRef<ImageDitherer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCopy, setIsSavingCopy] = useState(false);
  const [resolution, setResolution] = useState({ width: 0, height: 0 });
  const [isUpdatingResolutionInputs, setIsUpdatingResolutionInputs] = useState(false);
  const [targetWidth, setTargetWidth] = useState("");
  const [targetHeight, setTargetHeight] = useState("");
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [params, setParams] = useState<DitherParams | null>(null);

  const outputMime = useMemo(() => mimeTypeForExt(outputExt), [outputExt]);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ditherer = new ImageDitherer(canvas, {
      onResolutionChange: (width, height) => {
        setResolution({ width, height });
        setIsUpdatingResolutionInputs(true);
        setTargetWidth(String(width));
        setTargetHeight(String(height));
        window.setTimeout(() => setIsUpdatingResolutionInputs(false), 0);
      },
      onColorModeChange: (colorMode: DitherColorMode) => {
        setParams((current) => (current ? { ...current, colorMode } : current));
      },
    });
    dithererRef.current = ditherer;
    setParams({ ...ditherer.params });
    setError(null);
    setIsReady(false);

    void ditherer
      .loadImage(imageUrl)
      .then(() => {
        if (cancelled) {
          return;
        }
        setParams({ ...ditherer.params });
        setResolution({ width: ditherer.getCanvas().width, height: ditherer.getCanvas().height });
        setTargetWidth(String(ditherer.getCanvas().width));
        setTargetHeight(String(ditherer.getCanvas().height));
        setIsReady(true);
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load image.");
      });

    return () => {
      cancelled = true;
      dithererRef.current = null;
    };
  }, [imageUrl]);

  function updateParams(next: Partial<DitherParams>) {
    const ditherer = dithererRef.current;
    if (!ditherer || !params) {
      return;
    }
    ditherer.updateParams(next);
    setParams({ ...ditherer.params });
  }

  function applyCustomResolution() {
    const ditherer = dithererRef.current;
    if (!ditherer) {
      return;
    }
    const parsedWidth = Number.parseInt(targetWidth, 10);
    const parsedHeight = Number.parseInt(targetHeight, 10);
    if (!Number.isFinite(parsedWidth) || !Number.isFinite(parsedHeight) || parsedWidth < 1 || parsedHeight < 1) {
      setError("Please enter valid dimensions.");
      return;
    }
    setError(null);
    ditherer.setCustomResolution(parsedWidth, parsedHeight);
    setParams({ ...ditherer.params });
  }

  function resetResolution() {
    const ditherer = dithererRef.current;
    if (!ditherer) {
      return;
    }
    setError(null);
    ditherer.resetResolution();
    setParams({ ...ditherer.params });
  }

  function onWidthInput(value: string) {
    setTargetWidth(value);
    if (isUpdatingResolutionInputs || !maintainAspect) {
      return;
    }
    const ditherer = dithererRef.current;
    if (!ditherer) {
      return;
    }
    const parsedWidth = Number.parseInt(value, 10);
    if (Number.isFinite(parsedWidth) && parsedWidth > 0) {
      const nextHeight = Math.round(parsedWidth / ditherer.aspectRatio);
      setTargetHeight(String(nextHeight));
    }
  }

  function onHeightInput(value: string) {
    setTargetHeight(value);
    if (isUpdatingResolutionInputs || !maintainAspect) {
      return;
    }
    const ditherer = dithererRef.current;
    if (!ditherer) {
      return;
    }
    const parsedHeight = Number.parseInt(value, 10);
    if (Number.isFinite(parsedHeight) && parsedHeight > 0) {
      const nextWidth = Math.round(parsedHeight * ditherer.aspectRatio);
      setTargetWidth(String(nextWidth));
    }
  }

  async function exportBlob(): Promise<Blob> {
    const ditherer = dithererRef.current;
    if (!ditherer) {
      throw new Error("Ditherer not ready.");
    }
    return ditherer.toBlob(outputMime, outputMime === "image/jpeg" ? 0.9 : undefined);
  }

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    try {
      const blob = await exportBlob();
      await onSave(blob);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save image.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveCopy() {
    setIsSavingCopy(true);
    setError(null);
    try {
      const blob = await exportBlob();
      await onSaveCopy(blob);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save image copy.");
    } finally {
      setIsSavingCopy(false);
    }
  }

  const currentParams = params ?? DEFAULT_PARAMS;

  return (
    <>
      <h2>ditherspace <span className="text-xs text-neutral-600">source and algorithms thx to <Link href="https://landonjsmith.com/projects/ditherspace.html">Landon J Smith &lt;3</Link></span></h2>
      <div className="space-y-3 rounded border border-neutral-200 p-3">

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="font-medium text-neutral-600">Algorithm</span>
            <select
              value={currentParams.algorithm}
              onChange={(event) =>
                updateParams({
                  algorithm: event.target.value === "fs" ? "fs" : "bayer",
                })
              }
              disabled={!params}
              className="w-full rounded border border-neutral-200 px-2 py-1"
            >
              <option value="bayer">Bayer 8x8 (WebGL)</option>
              <option value="fs">Floyd-Steinberg (CPU)</option>
            </select>
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium text-neutral-600">Color mode</span>
            <select
              value={currentParams.colorMode}
              onChange={(event) =>
                updateParams({
                  colorMode: event.target.value === "color" ? "color" : "bw",
                })
              }
              disabled={!params}
              className="w-full rounded border border-neutral-200 px-2 py-1"
            >
              <option value="bw">Two-tone</option>
              <option value="color">Full color</option>
            </select>
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs">
            <span className="font-medium text-neutral-600">Pixel size: {currentParams.pixelSize}</span>
            <input
              type="range"
              min={PARAM_LIMITS.pixelSize.min}
              max={PARAM_LIMITS.pixelSize.max}
              step={PARAM_LIMITS.pixelSize.step}
              value={currentParams.pixelSize}
              onChange={(event) => updateParams({ pixelSize: Number(event.target.value) })}
              disabled={!params}
              className="w-full"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium text-neutral-600">Dither amount: {currentParams.ditherAmount.toFixed(2)}</span>
            <input
              type="range"
              min={PARAM_LIMITS.ditherAmount.min}
              max={PARAM_LIMITS.ditherAmount.max}
              step={PARAM_LIMITS.ditherAmount.step}
              value={currentParams.ditherAmount}
              onChange={(event) => updateParams({ ditherAmount: Number(event.target.value) })}
              disabled={!params}
              className="w-full"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium text-neutral-600">Bit depth: {currentParams.bitDepth}</span>
            <input
              type="range"
              min={PARAM_LIMITS.bitDepth.min}
              max={PARAM_LIMITS.bitDepth.max}
              step={PARAM_LIMITS.bitDepth.step}
              value={currentParams.bitDepth}
              onChange={(event) => updateParams({ bitDepth: Number(event.target.value) })}
              disabled={!params}
              className="w-full"
            />
          </label>
          <label className="space-y-1 text-xs">
            <span className="font-medium text-neutral-600">Contrast: {currentParams.contrast.toFixed(1)}</span>
            <input
              type="range"
              min={PARAM_LIMITS.contrast.min}
              max={PARAM_LIMITS.contrast.max}
              step={PARAM_LIMITS.contrast.step}
              value={currentParams.contrast}
              onChange={(event) => updateParams({ contrast: Number(event.target.value) })}
              disabled={!params}
              className="w-full"
            />
          </label>
          <label className="space-y-1 text-xs sm:col-span-2">
            <span className="font-medium text-neutral-600">Scale: {currentParams.scale.toFixed(1)}</span>
            <input
              type="range"
              min={PARAM_LIMITS.scale.min}
              max={PARAM_LIMITS.scale.max}
              step={PARAM_LIMITS.scale.step}
              value={currentParams.scale}
              onChange={(event) => updateParams({ scale: Number(event.target.value) })}
              disabled={!params}
              className="w-full"
            />
          </label>
        </div>

        {currentParams.colorMode === "bw" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="font-medium text-neutral-600">Foreground color</span>
              <input
                type="color"
                value={currentParams.fgColor}
                onChange={(event) => updateParams({ fgColor: event.target.value })}
                disabled={!params}
                className="h-9 w-full rounded border border-neutral-200"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-neutral-600">Background color</span>
              <input
                type="color"
                value={currentParams.bgColor}
                onChange={(event) => updateParams({ bgColor: event.target.value })}
                disabled={!params}
                className="h-9 w-full rounded border border-neutral-200"
              />
            </label>
          </div>
        ) : null}

        <div className="space-y-2 rounded border border-neutral-200 p-2 text-xs">
          <p className="text-neutral-600">
            Output: {resolution.width}×{resolution.height}
          </p>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:items-end">
            <label className="space-y-1">
              <span className="font-medium text-neutral-600">Width</span>
              <input
                type="number"
                min={1}
                value={targetWidth}
                onChange={(event) => onWidthInput(event.target.value)}
                disabled={!params}
                className="w-full rounded border border-neutral-200 px-2 py-1"
              />
            </label>
            <label className="space-y-1">
              <span className="font-medium text-neutral-600">Height</span>
              <input
                type="number"
                min={1}
                value={targetHeight}
                onChange={(event) => onHeightInput(event.target.value)}
                disabled={!params}
                className="w-full rounded border border-neutral-200 px-2 py-1"
              />
            </label>
            <button
              type="button"
              onClick={applyCustomResolution}
              disabled={!params}
              className="rounded border border-neutral-200 px-3 py-1"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={resetResolution}
              disabled={!params}
              className="rounded border border-neutral-200 px-3 py-1"
            >
              Reset
            </button>
          </div>
          <label className="inline-flex items-center gap-2 text-neutral-600">
            <input
              type="checkbox"
              checked={maintainAspect}
              onChange={(event) => setMaintainAspect(event.target.checked)}
              disabled={!params}
            />
            Lock aspect ratio
          </label>
        </div>

        <div className="rounded border border-neutral-200 p-2">
          <canvas
            ref={canvasRef}
            className="w-full rounded object-contain"
            aria-label={`Dither preview for ${imageName}`}
          />
        </div>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        {!isReady ? <p className="text-xs text-neutral-500">Loading dither preview...</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving || isSavingCopy}
            className="rounded border border-neutral-200 px-3 py-1 text-xs disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSaveCopy()}
            disabled={!isReady || isSaving || isSavingCopy}
            className="rounded border border-neutral-200 px-3 py-1 text-xs disabled:opacity-50"
          >
            {isSavingCopy ? "Saving copy..." : "Save as copy"}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isReady || isSaving || isSavingCopy}
            className="rounded bg-black px-3 py-1 text-xs text-white disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </>
  );
}


