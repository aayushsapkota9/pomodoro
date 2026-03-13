import React from "react";

interface BackgroundLayerProps {
  themeMode: string;
  isFocus: boolean;
  bgStyle: React.CSSProperties;
  transitionKey: string;
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({
  themeMode,
  isFocus,
  bgStyle,
  transitionKey,
}) => {
  return (
    <>
      {/* Layer 1: The Basement - Background Color */}
      <div className="fixed inset-0 bg-[#020617] z-0" />

      {/* Layer 2: The Background Icons & Gradients */}
      <div
        key={transitionKey}
        className="fixed inset-0 transition-opacity duration-1000 animate-in fade-in fill-mode-forwards z-5 overflow-hidden pointer-events-none"
        style={bgStyle}>
        {/* Dynamic Background Particles & Icons (Only for Immersive) */}
        {themeMode === "immersive" && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden text-white/20">
            <div
              className={`absolute top-[20%] left-[10%] w-[30%] h-[30%] rounded-full blur-[120px] transition-colors duration-1000 ${isFocus ? "bg-red-950/20" : "bg-blue-950/20"} animate-pulse`}
            />
            <div
              className={`absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-1000 ${isFocus ? "bg-orange-950/10" : "bg-indigo-950/10"} animate-pulse`}
              style={{ animationDelay: "2s" }}
            />

            {/* Floating Icons akin to 404 - High Visibility Boost with Entrance Animation */}
            <div
              className="absolute top-[18%] right-[22%] text-8xl opacity-40 animate-float-reveal select-none"
              style={{ animationDelay: "0.1s" }}>
              {isFocus ? "🍅" : "💤"}
            </div>
            <div
              className="absolute bottom-[25%] left-[18%] text-5xl opacity-30 animate-float-reveal select-none"
              style={{ animationDelay: "0.2s" }}>
              ⏱️
            </div>
            <div
              className="absolute top-[42%] left-[8%] text-3xl opacity-20 animate-float-reveal select-none"
              style={{ animationDelay: "0.3s" }}>
              🎯
            </div>
            <div
              className="absolute bottom-[12%] right-[18%] text-6xl opacity-30 animate-float-reveal select-none"
              style={{ animationDelay: "0.4s" }}>
              ⌛
            </div>
          </div>
        )}
      </div>
    </>
  );
};
