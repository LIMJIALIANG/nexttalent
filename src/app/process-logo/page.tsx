"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function ProcessLogoPage() {
  const [imageSrc, setImageSrc] = useState<string>("/nexttalent-logo/nexttalent-logo-only-dark.png");
  const [status, setStatus] = useState<string>("");
  const [threshold, setThreshold] = useState<number>(20);
  const [targetColor, setTargetColor] = useState<{ r: number; g: number; b: number }>({ r: 255, g: 255, b: 255 }); // Default: white background
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const processAndSave = async () => {
    setStatus("Processing...");
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setStatus("Error: Canvas not found");
        return;
      }
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setStatus("Error: Context not found");
        return;
      }
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Key out target color (e.g. white background)
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Calculate distance to target color
        const dist = Math.sqrt(
          Math.pow(r - targetColor.r, 2) +
          Math.pow(g - targetColor.g, 2) +
          Math.pow(b - targetColor.b, 2)
        );

        if (dist < threshold) {
          data[i + 3] = 0; // Set alpha to 0 (transparent)
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setStatus("Saving...");

      try {
        const base64Image = canvas.toDataURL("image/png");
        const response = await fetch("/api/save-logo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image: base64Image,
            filename: "nexttalent-logo-only-dark.png", // Overwrite with transparent version
          }),
        });

        const result = await response.json();
        if (result.success) {
          setStatus("Success! Logo has been saved with a transparent background.");
        } else {
          setStatus(`Failed to save: ${result.error}`);
        }
      } catch (err: any) {
        setStatus(`Error saving: ${err.message}`);
      }
    };

    img.onerror = () => {
      setStatus("Failed to load source image");
    };
  };

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif", color: "#fff", background: "#121212", minHeight: "100vh" }}>
      <h1>NextTalent Logo Processor</h1>
      <p>This utility removes the solid background from the logo image and saves it back as transparent.</p>
      
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <div>
          <label>Target Color to Remove:</label>
          <div style={{ display: "flex", gap: "10px", marginTop: "5px" }}>
            <button 
              onClick={() => setTargetColor({ r: 255, g: 255, b: 255 })}
              style={{
                padding: "8px 16px",
                background: targetColor.r === 255 ? "#00F2FE" : "#333",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              White Background
            </button>
            <button 
              onClick={() => setTargetColor({ r: 0, g: 0, b: 0 })}
              style={{
                padding: "8px 16px",
                background: targetColor.r === 0 ? "#00F2FE" : "#333",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Black Background
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="threshold-slider">Tolerance Threshold ({threshold}):</label>
          <input 
            id="threshold-slider"
            type="range" 
            min="5" 
            max="150" 
            value={threshold} 
            onChange={(e) => setThreshold(Number(e.target.value))}
            style={{ display: "block", marginTop: "10px", width: "200px" }}
          />
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <button 
          onClick={processAndSave}
          style={{
            padding: "12px 24px",
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer"
          }}
          id="process-btn"
        >
          Process and Overwrite Logo
        </button>
      </div>

      {status && (
        <div style={{
          padding: "15px",
          borderRadius: "6px",
          background: status.includes("Success") ? "#1b4d3e" : status.includes("Error") || status.includes("Failed") ? "#4a1515" : "#333",
          border: "1px solid",
          borderColor: status.includes("Success") ? "#2e7d5c" : status.includes("Error") || status.includes("Failed") ? "#7d2e2e" : "#555",
          marginBottom: "20px"
        }} id="status-message">
          {status}
        </div>
      )}

      <div style={{ display: "flex", gap: "40px" }}>
        <div>
          <h3>Original Logo:</h3>
          <div style={{ padding: "20px", background: "#222", borderRadius: "8px" }}>
            <img 
              src={imageSrc} 
              alt="Original Logo" 
              style={{ maxWidth: "300px", display: "block" }} 
            />
          </div>
        </div>

        <div>
          <h3>Transparent Output Preview (Checked Background):</h3>
          <div style={{ 
            padding: "20px", 
            borderRadius: "8px",
            backgroundImage: "conic-gradient(#333 0.25turn, #444 0.25turn 0.5turn, #333 0.5turn 0.75turn, #444 0.75turn)",
            backgroundSize: "20px 20px"
          }}>
            <canvas 
              ref={canvasRef} 
              style={{ maxWidth: "300px", display: "block", background: "transparent" }} 
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: "40px" }}>
        <Link href="/" style={{ color: "#00F2FE", textDecoration: "underline" }}>← Go to Home</Link>
      </div>
    </div>
  );
}
