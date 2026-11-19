import React, { useEffect, useRef } from 'react';
import { getVehicleById } from '../game/catalog';
import { drawVehicleWithDriver, drawVIPDriver } from '../game/renderer';
import { DriverId, VehicleId } from '../game/types';

interface VehiclePreviewProps {
  driverId: DriverId;
  vehicleId: VehicleId;
  vehicleColorId?: string;
  driverOutfitId?: string;
  rollcageShields?: number;
  mode?: 'combo' | 'driver' | 'vehicle';
  width?: number;
  height?: number;
  animate?: boolean;
  className?: string;
}

export const VehiclePreview: React.FC<VehiclePreviewProps> = ({
  driverId,
  vehicleId,
  vehicleColorId = 'default',
  driverOutfitId = 'default',
  rollcageShields = 0,
  mode = 'combo',
  width = 360,
  height = 190,
  animate = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    let rafId = 0;
    const start = performance.now();
    const vehicle = getVehicleById(vehicleId);

    const drawFrame = (now: number) => {
      const t = animate ? (now - start) / 1000 : 0.4;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      if (mode === 'driver') {
        const grad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.52,
          10,
          width * 0.5,
          height * 0.52,
          width * 0.6
        );
        grad.addColorStop(0, 'rgba(51, 65, 85, 0.45)');
        grad.addColorStop(1, 'rgba(15, 23, 42, 0.1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(width * 0.48, height * 0.72);
        const scale = Math.min(width, height) / 68;
        ctx.scale(scale, scale);
        drawVIPDriver(ctx, driverId, Math.sin(t * 3.1) * 0.14, t, false, driverOutfitId);
        ctx.restore();
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#0F172A');
        bgGrad.addColorStop(0.75, '#1E293B');
        bgGrad.addColorStop(1, '#0F172A');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        const floorY = height * 0.8;
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(0, floorY, width, height - floorY);
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(16, floorY);
        ctx.lineTo(width - 16, floorY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
        ctx.beginPath();
        ctx.ellipse(width * 0.5, floorY + 2, width * 0.3, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Scale smoothly even for extra-long vehicles (Presidential Limo / Rocket Sled / Monster Truck)
        const spanW = Math.max(245, vehicle.chassisHalfW * 2.75);
        const spanH = Math.max(155, (vehicle.wheelAnchorY + vehicle.suspensionRest + vehicle.wheelRadius) * 2.15);
        const scale = Math.min(width / spanW, height / spanH);
        const bounce = Math.sin(t * 4.2) * 2.5;
        const pitch = Math.sin(t * 2.6) * 0.03;
        const wheelBottomOffset = vehicle.wheelAnchorY + vehicle.suspensionRest + vehicle.wheelRadius;

        ctx.save();
        ctx.translate(width * 0.5, floorY - wheelBottomOffset * scale + bounce);
        ctx.scale(scale, scale);

        drawVehicleWithDriver(ctx, vehicle, driverId, {
          x: 0,
          y: 0,
          angle: pitch,
          rearWheelLen: vehicle.suspensionRest - bounce * 0.5,
          frontWheelLen: vehicle.suspensionRest - bounce * 0.5,
          rearSpin: t * 3.4,
          frontSpin: t * 3.4,
          headAngle: Math.sin(t * 4.2 - 0.6) * 0.16,
          jetHeat: vehicle.hasJetThruster ? 0.55 + Math.sin(t * 8) * 0.25 : 0,
          timeSec: t,
          crashed: false,
          vehicleColorId,
          driverOutfitId,
          rollcageShields,
        });
        ctx.restore();
      }

      ctx.restore();
      if (animate) {
        rafId = requestAnimationFrame(drawFrame);
      }
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, [driverId, vehicleId, vehicleColorId, driverOutfitId, rollcageShields, mode, width, height, animate]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: 'auto', maxWidth: `${width}px` }}
      className={`block rounded-lg ${className}`}
    />
  );
};
