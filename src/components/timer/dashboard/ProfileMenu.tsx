import React, { useRef, useEffect } from "react";

interface ProfileMenuProps {
  user: any;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  isAutoMode: boolean;
  handleToggleAutoSync: () => void;
  setIsThemeModalOpen: (open: boolean) => void;
  themeMode: string;
  soundEnabled: boolean;
  handleSoundSetting: (key: string, val: any) => void;
  tickEnabled: boolean;
  volume: number;
  logout: () => void;
  isGuest?: boolean;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  user,
  isProfileOpen,
  setIsProfileOpen,
  isAutoMode,
  handleToggleAutoSync,
  setIsThemeModalOpen,
  themeMode,
  soundEnabled,
  handleSoundSetting,
  tickEnabled,
  volume,
  logout,
  isGuest = false,
}) => {
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileOpen, setIsProfileOpen]);

  return (
    <div className="w-full flex justify-end items-center p-4 lg:p-6 sticky top-0 right-0 z-30 pointer-events-none">
      <div ref={profileRef} className="relative pointer-events-auto">
        <button
          onClick={() => setIsProfileOpen(!isProfileOpen)}
          className="flex items-center gap-3 bg-black/10 backdrop-blur-md p-1.5 rounded-full border border-white/10 hover:bg-black/20 transition-all shadow-lg overflow-hidden group">
          {isGuest ? (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/20 flex items-center justify-center bg-white/5 group-hover:border-white/50 transition-all">
              <span className="text-white/40 text-xs">?</span>
            </div>
          ) : (
            <img
              src={user?.photoURL || ""}
              alt="Profile"
              referrerPolicy="no-referrer"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/20 group-hover:border-white/50 transition-all object-cover"
            />
          )}
          <div className="flex flex-col items-start -translate-y-px pr-2">
            <h3 className="font-bold text-[10px] sm:text-xs leading-tight text-white">
              {isGuest ? "Guest Mode" : user?.displayName}
            </h3>
          </div>
        </button>

        {isProfileOpen && (
          <div className="absolute top-full right-0 mt-2 w-44 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-white/10 space-y-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">
                  Auto Schedule (Google)
                </span>
                <input
                  type="checkbox"
                  disabled={isGuest}
                  checked={isGuest ? false : isAutoMode}
                  onChange={handleToggleAutoSync}
                  className={`w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-0 cursor-pointer ${isGuest ? "opacity-30 cursor-not-allowed" : ""}`}
                />
              </label>

              <button
                onClick={() => {
                  setIsThemeModalOpen(true);
                  setIsProfileOpen(false);
                }}
                className="w-full flex items-center justify-between group py-1">
                <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">
                  Theme
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-white/30 capitalize">
                    {themeMode}
                  </span>
                  <svg
                    className="w-3 h-3 text-white/30 group-hover:text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </button>

              <div className="pt-2 border-t border-white/5 space-y-3">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-[10px] font-bold text-white/50 group-hover:text-white transition-colors">
                    Sound
                  </span>
                  <input
                    type="checkbox"
                    checked={soundEnabled}
                    onChange={(e) =>
                      handleSoundSetting("soundEnabled", e.target.checked)
                    }
                    className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-0 cursor-pointer"
                  />
                </label>

                {soundEnabled && (
                  <>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-[10px] font-bold text-white/50 group-hover:text-white transition-colors">
                        Tick-Tock
                      </span>
                      <input
                        type="checkbox"
                        checked={tickEnabled}
                        onChange={(e) =>
                          handleSoundSetting("tickEnabled", e.target.checked)
                        }
                        className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-0 cursor-pointer"
                      />
                    </label>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-bold text-white/30 uppercase">
                        <span>Volume</span>
                        <span>{Math.round(volume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={(e) =>
                          handleSoundSetting(
                            "volume",
                            parseFloat(e.target.value),
                          )
                        }
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white/50"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            {isGuest && (
              <button
                onClick={() => import("../../../stores/authStore").then(m => m.loginWithGoogle())}
                className="w-full flex items-center justify-between p-4 border-t border-white/10 hover:bg-white/10 text-blue-400 transition-colors group">
                <span className="text-sm font-bold tracking-tight">Sign in with Google</span>
                <svg className="w-4 h-4 text-blue-400/50 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
            <button
              onClick={logout}
              className={`w-full flex items-center justify-between p-4 hover:bg-white/10 text-white transition-colors group ${!isGuest ? "border-t border-white/10" : ""}`}>
              <span className="text-sm font-bold tracking-tight">
                {isGuest ? "Exit Guest Mode" : "Sign out"}
              </span>
              <svg
                className="w-4 h-4 text-white/30 group-hover:text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
