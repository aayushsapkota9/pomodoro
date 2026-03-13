import React, { useState } from "react";
import { useStore } from "@nanostores/react";
import { $timerStore } from "../../../stores/timerStore";

interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { themeMode, customFocusBg, customBreakBg } = useStore($timerStore);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: "customFocusBg" | "customBreakBg",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file, key);
  };

  const processFile = (file: File, key: "customFocusBg" | "customBreakBg") => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      import("../../../stores/timerStore").then(({ updateThemeSetting }) => {
        updateThemeSetting(key, base64);
      });
    };
    reader.readAsDataURL(file);
  };

  const [dragActive, setDragActive] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent, id: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(id);
    } else if (e.type === "dragleave") {
      setDragActive(null);
    }
  };

  const handleDrop = (
    e: React.DragEvent,
    key: "customFocusBg" | "customBreakBg",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file, key);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file, "customFocusBg");
        }
      }
    }
  };

  const deletePhoto = (key: "customFocusBg" | "customBreakBg") => {
    import("../../../stores/timerStore").then(({ updateThemeSetting }) => {
      updateThemeSetting(key, null);
    });
  };

  const setTheme = (mode: "minimal" | "immersive" | "custom") => {
    import("../../../stores/timerStore").then(({ updateThemeSetting }) => {
      updateThemeSetting("themeMode", mode);
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center p-4"
      onPaste={handlePaste}>
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl bg-gray-900 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 sm:p-12 text-white">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-black tracking-tight mb-2">
                Workspace Theme
              </h2>
              <p className="text-white/40 text-sm">
                Customize your deep work environment.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { id: "minimal", label: "Minimal", desc: "Flat" },
              { id: "immersive", label: "Immersive", desc: "Mesh" },
              { id: "custom", label: "Custom", desc: "Photo" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id as any)}
                className={`flex flex-col items-center p-6 rounded-3xl border-2 transition-all text-center ${
                  themeMode === t.id
                    ? "bg-white/10 border-white shadow-xl scale-105"
                    : "bg-white/5 border-transparent hover:bg-white/10"
                }`}>
                <span
                  className={`text-sm font-black mb-1 ${themeMode === t.id ? "text-white" : "text-white/70"}`}>
                  {t.label}
                </span>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                  {t.desc}
                </span>
              </button>
            ))}
          </div>

          {themeMode === "custom" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Focus Mode</span>
                    {customFocusBg && (
                      <button onClick={() => deletePhoto("customFocusBg")} className="text-[10px] font-bold text-red-400 hover:text-red-300">Remove</button>
                    )}
                  </div>
                  <label
                    onDragOver={(e) => handleDrag(e, 'focus')}
                    onDragLeave={(e) => handleDrag(e, null)}
                    onDrop={(e) => handleDrop(e, "customFocusBg")}
                    className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-2 ${
                      dragActive === 'focus' ? "border-white bg-white/10" : "border-white/10 hover:border-white/30 bg-white/5"
                    }`}>
                    {customFocusBg ? (
                      <img src={customFocusBg} alt="Focus" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] font-bold text-white/30 uppercase">Focus Wall</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "customFocusBg")} />
                  </label>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Break Mode</span>
                    {customBreakBg && (
                      <button onClick={() => deletePhoto("customBreakBg")} className="text-[10px] font-bold text-red-400 hover:text-red-300">Remove</button>
                    )}
                  </div>
                  <label
                    onDragOver={(e) => handleDrag(e, 'break')}
                    onDragLeave={(e) => handleDrag(e, null)}
                    onDrop={(e) => handleDrop(e, "customBreakBg")}
                    className={`relative aspect-video rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-2 ${
                      dragActive === 'break' ? "border-white bg-white/10" : "border-white/10 hover:border-white/30 bg-white/5"
                    }`}>
                    {customBreakBg ? (
                      <img src={customBreakBg} alt="Break" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    ) : (
                      <>
                        <svg className="w-5 h-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] font-bold text-white/30 uppercase">Break Wall</span>
                      </>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, "customBreakBg")} />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
