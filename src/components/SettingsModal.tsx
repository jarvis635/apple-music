import React from 'react';
import { 
  X, 
  Sparkles, 
  Sliders, 
  Tv, 
  Eye, 
  Volume2, 
  ShieldCheck, 
  RotateCcw,
  Sun,
  Layers,
  Palette
} from 'lucide-react';
import { AmbientSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ambientSettings: AmbientSettings;
  onUpdateAmbientSettings: (settings: AmbientSettings) => void;
  showToast: (msg: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  ambientSettings,
  onUpdateAmbientSettings,
  showToast,
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onUpdateAmbientSettings({
      enabled: true,
      blurLevel: 50,
      saturation: 180,
      brightness: 65,
      liveVideoBg: true,
    });
    showToast('Ambient settings restored to defaults');
  };

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xl animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl bg-[#141418]/90 border border-white/20 shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FA2D48] to-purple-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">App &amp; Ambient Settings</h2>
              <p className="text-[11px] text-white/50">Apple Music Liquid Glass &amp; YouTube Engine</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section: Ambient Light Engine */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FA2D48] flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5" />
                Ambient Light Extension
              </span>
              <button
                onClick={handleReset}
                className="text-[11px] text-white/40 hover:text-white flex items-center gap-1 transition-colors"
                title="Reset to defaults"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Master Toggle */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <div className="text-sm font-semibold text-white">Full-Screen Ambient Lighting</div>
                <div className="text-xs text-white/50 leading-relaxed">
                  Stream real-time blurred live video in the background covering the entire screen.
                </div>
              </div>
              <button
                onClick={() => {
                  const updated = { ...ambientSettings, enabled: !ambientSettings.enabled };
                  onUpdateAmbientSettings(updated);
                  showToast(updated.enabled ? 'Ambient Light Enabled' : 'Ambient Light Disabled');
                }}
                className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  ambientSettings.enabled ? 'bg-[#FA2D48]' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md absolute top-1 transition-transform ${
                    ambientSettings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {ambientSettings.enabled && (
              <div className="space-y-4 pt-1">
                {/* Blur Level Preset */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/90 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#FA2D48]" />
                      Blur Effect Level
                    </span>
                    <span className="font-mono text-white/50">{ambientSettings.blurLevel}px</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: 'Subtle', val: 25 },
                      { label: 'Cinematic', val: 50 },
                      { label: 'Deep', val: 75 },
                      { label: 'Dream', val: 100 },
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() => onUpdateAmbientSettings({ ...ambientSettings, blurLevel: item.val })}
                        className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          ambientSettings.blurLevel === item.val
                            ? 'bg-white text-black shadow-md'
                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Saturation */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/90 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-[#FA2D48]" />
                      Color Saturation Boost
                    </span>
                    <span className="font-mono text-white/50">{ambientSettings.saturation}%</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Natural', val: 130 },
                      { label: 'Vivid', val: 180 },
                      { label: 'Hyper Neon', val: 240 },
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() => onUpdateAmbientSettings({ ...ambientSettings, saturation: item.val })}
                        className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          ambientSettings.saturation === item.val
                            ? 'bg-white text-black shadow-md'
                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ambient Brightness */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white/90 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-[#FA2D48]" />
                      Ambient Vignette Brightness
                    </span>
                    <span className="font-mono text-white/50">{ambientSettings.brightness}%</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Moody Dark', val: 45 },
                      { label: 'Balanced', val: 65 },
                      { label: 'Luminous', val: 85 },
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() => onUpdateAmbientSettings({ ...ambientSettings, brightness: item.val })}
                        className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          ambientSettings.brightness === item.val
                            ? 'bg-white text-black shadow-md'
                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section: Audio Quality & Engine */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
              Streaming Engine
            </span>

            <div className="divide-y divide-white/10 rounded-2xl bg-white/5 border border-white/10 overflow-hidden text-xs">
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Audio Quality</div>
                  <div className="text-[11px] text-white/50">Lossless 256kbps AAC (YouTube HD Stream)</div>
                </div>
                <span className="text-[10px] font-bold text-[#FA2D48] px-2 py-0.5 rounded-full bg-red-950/80 border border-red-800/40">
                  Lossless HD
                </span>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Liquid Glass Aesthetics</div>
                  <div className="text-[11px] text-white/50">Ultra-smooth 60fps glass reflections &amp; transitions</div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/40">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Done Button Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-[#FA2D48] hover:bg-rose-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
