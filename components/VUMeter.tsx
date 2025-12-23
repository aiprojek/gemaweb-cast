import React, { useEffect, useRef } from 'react';

interface VUMeterProps {
  volume: { left: number; right: number };
}

export const VUMeter: React.FC<VUMeterProps> = ({ volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawMeter = (val: number, yPos: number, height: number) => {
      const width = canvas.width;
      const fillWidth = Math.min(width, width * val * 1.5); // 1.5 gain for visual pop

      // Background
      ctx.fillStyle = '#1f2937'; // gray-800
      ctx.fillRect(0, yPos, width, height);

      // Gradient for meter
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#22c55e'); // Green
      gradient.addColorStop(0.6, '#eab308'); // Yellow
      gradient.addColorStop(1, '#ef4444'); // Red
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, yPos, fillWidth, height);

      // Markers
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      for (let i = 1; i < 10; i++) {
        ctx.fillRect(i * (width / 10), yPos, 1, height);
      }
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Left Channel
    drawMeter(volume.left, 0, 12);
    
    // Right Channel
    drawMeter(volume.right, 16, 12);

    // Labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText('L', 4, 10);
    ctx.fillText('R', 4, 26);

  }, [volume]);

  return (
    <div className="bg-gray-900 border border-gray-700 p-2 rounded shadow-inner">
      <canvas 
        ref={canvasRef} 
        width={300} 
        height={28} 
        className="w-full h-8"
      />
    </div>
  );
};