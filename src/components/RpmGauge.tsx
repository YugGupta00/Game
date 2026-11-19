import React from 'react';

interface RpmGaugeProps {
  rpm: number; // 0..1.1
  speedKmh: number;
  jetActive: boolean;
  hasJet: boolean;
}

export const RpmGauge: React.FC<RpmGaugeProps> = ({ rpm, speedKmh, jetActive, hasJet }) => {
  const clampedRpm = Math.max(0, Math.min(1.08, rpm));
  // Sweep from -130 deg (0 RPM) to +130 deg (max RPM)
  const needleDeg = -130 + clampedRpm * 245;

  const ticks = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="relative flex flex-col items-center select-none pointer-events-none">
      <div className="relative w-28 h-24 sm:w-36 sm:h-28 flex items-center justify-center">
        <svg viewBox="0 0 140 112" className="w-full h-full overflow-visible drop-shadow-md">
          {/* Dial housing */}
          <path
            d="M 16 96 A 58 58 0 1 1 124 96"
            fill="rgba(15, 23, 42, 0.86)"
            stroke="#334155"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Normal arc */}
          <path
            d="M 24 90 A 50 50 0 0 1 108 38"
            fill="none"
            stroke="#475569"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Redline arc */}
          <path
            d="M 108 38 A 50 50 0 0 1 116 90"
            fill="none"
            stroke={jetActive ? '#38BDF8' : '#EF4444'}
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Tick marks */}
          {ticks.map((t) => {
            const frac = t / 8;
            const deg = -130 + frac * 260;
            const rad = ((deg - 90) * Math.PI) / 180;
            const x1 = 70 + Math.cos(rad) * 42;
            const y1 = 68 + Math.sin(rad) * 42;
            const x2 = 70 + Math.cos(rad) * 50;
            const y2 = 68 + Math.sin(rad) * 50;
            const tx = 70 + Math.cos(rad) * 33;
            const ty = 68 + Math.sin(rad) * 33;
            const isRed = t >= 6;
            return (
              <g key={t}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isRed ? '#F87171' : '#CBD5E1'}
                  strokeWidth={t % 2 === 0 ? '2' : '1.2'}
                />
                {t % 2 === 0 && (
                  <text
                    x={tx}
                    y={ty + 3}
                    textAnchor="middle"
                    fill={isRed ? '#FCA5A5' : '#94A3B8'}
                    fontSize="8.5"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="700"
                  >
                    {t}
                  </text>
                )}
              </g>
            );
          })}

          {/* RPM label */}
          <text
            x="70"
            y="53"
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="7.5"
            fontFamily="Plus Jakarta Sans, sans-serif"
            fontWeight="700"
          >
            {hasJet ? (jetActive ? 'AFTERBURNER' : 'TURBINE RPM') : 'RPM x1000'}
          </text>

          {/* Sweeping Needle */}
          <g transform={`translate(70, 68) rotate(${needleDeg})`}>
            <polygon points="-2.6,10 0,-44 2.6,10" fill={jetActive ? '#38BDF8' : '#F59E0B'} />
            <circle cx="0" cy="0" r="6" fill="#1E293B" stroke="#E2E8F0" strokeWidth="2" />
          </g>

          {/* Digital Speed readout */}
          <rect
            x="41"
            y="84"
            width="58"
            height="20"
            rx="4"
            fill="#020617"
            stroke="#334155"
            strokeWidth="1.2"
          />
          <text
            x="70"
            y="97.5"
            textAnchor="middle"
            fill="#F8FAFC"
            fontSize="11.5"
            fontFamily="JetBrains Mono, monospace"
            fontWeight="700"
          >
            {String(speedKmh).padStart(3, '0')} km/h
          </text>
        </svg>
      </div>
    </div>
  );
};
