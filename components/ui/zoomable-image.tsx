"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  maxZoom?: number;
  minZoom?: number;
  zoomStep?: number;
  showControls?: boolean;
  alignTopOnFit?: boolean;
}

export function ZoomableImage({
  src,
  alt,
  className = "",
  maxZoom = 5,
  minZoom = 0.1,
  zoomStep = 0.2,
  showControls = true,
  alignTopOnFit = false,
}: ZoomableImageProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Helper to fit image to container and center/top-align it
  const fitAndCenter = useCallback(() => {
    if (!containerRef.current || !imageRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const img = imageRef.current;
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (!width || !height) return;
    // Calculate scale to fit
    const scaleX = container.width / width;
    const scaleY = container.height / height;
    const newScale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1
    setScale(newScale);
    // Center or top-align the image
    const offsetX = (container.width - width * newScale) / 2;
    const offsetY = alignTopOnFit
      ? 0
      : (container.height - height * newScale) / 2;
    setPosition({ x: offsetX, y: offsetY });
  }, [alignTopOnFit]);

  // On image load, fit and center/top-align
  const handleImageLoad = useCallback(() => {
    if (!imageRef.current) return;
    setNaturalSize({
      width: imageRef.current.naturalWidth,
      height: imageRef.current.naturalHeight,
    });
    fitAndCenter();
  }, [fitAndCenter]);

  // Reset view (fit and center/top-align)
  const resetView = useCallback(() => {
    fitAndCenter();
  }, [fitAndCenter]);

  // Zoom in/out, always from center
  const zoom = useCallback(
    (delta: number) => {
      if (!containerRef.current || !imageRef.current) return;
      const container = containerRef.current.getBoundingClientRect();
      const img = imageRef.current;
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      if (!width || !height) return;
      const prevScale = scale;
      const newScale = Math.max(minZoom, Math.min(maxZoom, prevScale + delta));
      // Centered zoom: keep image centered in container
      const cx = container.width / 2;
      const cy = container.height / 2;
      // Calculate new offset so the center stays at the same place
      const prevImgW = width * prevScale;
      const prevImgH = height * prevScale;
      const newImgW = width * newScale;
      const newImgH = height * newScale;
      const prevOffsetX = position.x;
      const prevOffsetY = position.y;
      // Center of image in container coordinates
      const centerX = cx - prevOffsetX;
      const centerY = cy - prevOffsetY;
      // Ratio of center in image
      const ratioX = centerX / prevImgW;
      const ratioY = centerY / prevImgH;
      // New offset to keep center
      const newOffsetX = cx - newImgW * ratioX;
      const newOffsetY = cy - newImgH * ratioY;
      setScale(newScale);
      setPosition({ x: newOffsetX, y: newOffsetY });
    },
    [scale, position, minZoom, maxZoom]
  );

  const zoomIn = useCallback(() => {
    zoom(zoomStep);
  }, [zoom, zoomStep]);

  const zoomOut = useCallback(() => {
    zoom(-zoomStep);
  }, [zoom, zoomStep]);

  // Mouse wheel zoom (centered)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
      zoom(delta);
    },
    [zoom, zoomStep]
  );

  // Drag to pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale > 0.99) {
        setIsDragging(true);
        setDragStart({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
      }
    },
    [scale, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && scale > 0.99) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, scale, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Reset view when image changes
  useEffect(() => {
    resetView();
  }, [src, resetView]);

  // Refit on window resize
  useEffect(() => {
    function handleResize() {
      fitAndCenter();
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fitAndCenter]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${className}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: isDragging ? "grabbing" : scale > 1 ? "grab" : "default",
        }}>
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className="transition-transform duration-200 ease-out select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "top left",
            maxWidth: "none",
            maxHeight: "none",
            userSelect: "none",
            pointerEvents: "all",
          }}
          draggable={false}
          onLoad={handleImageLoad}
        />
      </div>

      {showControls && (
        <div className="absolute top-4 right-4 flex gap-2 bg-black/50 backdrop-blur-sm rounded-lg p-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            className="h-8 w-8 text-white hover:bg-white/20"
            disabled={scale >= maxZoom}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            className="h-8 w-8 text-white hover:bg-white/20"
            disabled={scale <= minZoom}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={resetView}
            className="h-8 w-8 text-white hover:bg-white/20">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Zoom indicator */}
      {showControls && (
        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1 text-white text-sm z-10">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  );
}
