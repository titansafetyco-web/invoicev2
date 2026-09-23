"use client";
import { useState } from "react";

type Shape = "landscape" | "thumbnail";

function shapeOf(width: number, height: number): Shape {
  if (!width || !height) return "thumbnail";
  return width / height >= 1.35 ? "landscape" : "thumbnail";
}

export default function LogoImage({ src, alt = "", variant = "sheet" }: { src: string; alt?: string; variant?: "sheet" | "settings" }) {
  const [shape, setShape] = useState<Shape>("thumbnail");
  const frame = variant === "settings"
    ? shape === "landscape" ? "h-16 w-auto max-w-[240px]" : "h-24 w-24"
    : shape === "landscape" ? "h-16 w-auto max-w-[220px]" : "h-16 w-16";

  return (
    <img
      src={src}
      alt={alt}
      onLoad={(e) => setShape(shapeOf(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight))}
      className={`${frame} shrink-0 object-contain`}
    />
  );
}
