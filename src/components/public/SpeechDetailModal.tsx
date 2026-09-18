import React, { useState, useEffect } from 'react';
import { PrincipalConfig } from '../../types';
import { X, Award, ZoomIn } from 'lucide-react';
import { FormattedContentRenderer } from '../common/FormattedContentRenderer';

interface SpeechDetailModalProps {
  principal: PrincipalConfig;
  schoolName: string;
  logoUrl?: string;
  onClose: () => void;
}

export const SpeechDetailModal: React.FC<SpeechDetailModalProps> = ({
  principal,
  schoolName,
  logoUrl = '',
  onClose,
}) => {
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);

  // Close photo preview on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (photoPreviewOpen) {
          setPhotoPreviewOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photoPreviewOpen, onClose]);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              {/* Logo / Badge */}
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-theme-light border border-[var(--theme-primary)]/20 shadow-xs flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Award className="w-6 h-6 text-theme-primary" />
                )}
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  Sambutan {principal.title?.toLowerCase().includes('ketua') ? 'Ketua' : 'Pimpinan'} {schoolName}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed">
            {/* Foto Pimpinan di Samping Quotes (Bisa Diklik & Preview) */}
            <div className="flex items-center gap-3 sm:gap-4 bg-gradient-to-r from-slate-50 via-slate-50 to-slate-100/60 border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs">
              {principal.imageUrl ? (
                <button
                  type="button"
                  onClick={() => setPhotoPreviewOpen(true)}
                  title="Ketuk untuk melihat foto ukuran penuh"
                  className="group relative w-16 h-20 sm:w-22 sm:h-28 rounded-xl overflow-hidden shadow-xs border-2 border-white bg-slate-200 shrink-0 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] active:scale-95 transition-transform"
                >
                  <img
                    src={principal.imageUrl}
                    alt={principal.name || principal.title || 'Ketua MGMP IPA'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Overlay Badge Hint */}
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="p-1.5 bg-white/90 rounded-full text-slate-800 shadow-sm">
                      <ZoomIn className="w-4 h-4" />
                    </div>
                  </div>
                  {/* Mobile Touch Badge Indicator */}
                  <div className="absolute bottom-1 right-1 sm:hidden bg-black/60 backdrop-blur-xs text-white p-0.5 rounded-md shadow-xs">
                    <ZoomIn className="w-3 h-3" />
                  </div>
                </button>
              ) : (
                <div className="relative w-16 h-20 sm:w-22 sm:h-28 rounded-xl overflow-hidden shadow-xs border-2 border-white bg-slate-200 shrink-0">
                  <div className="w-full h-full flex flex-col items-center justify-center bg-theme-primary text-white p-1 text-center">
                    <Award className="w-6 h-6 text-amber-300 mb-0.5" />
                    <span className="text-[7px] font-bold text-white uppercase">{principal.title || 'Ketua MGMP'}</span>
                  </div>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-slate-900 font-medium italic leading-relaxed">
                  "{principal.quote}"
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-500 mt-1 sm:mt-1.5 not-italic">
                  — {principal.name || principal.title || 'Ketua MGMP IPA'}
                </p>
              </div>
            </div>

            {/* Full Speech Body */}
            <div className="space-y-3 text-slate-700 pt-1">
              <FormattedContentRenderer content={principal.fullSpeech} />
            </div>

            {/* Info Pimpinan di Bawah */}
            <div className="pt-4 border-t border-slate-100 mt-6">
              <p className="font-bold text-slate-900 text-sm sm:text-base">{principal.name || principal.title || 'Ketua MGMP IPA'}</p>
              <p className="text-xs text-slate-500">{principal.title || 'Ketua MGMP IPA Kecamatan Bengkalis'}</p>
              {principal.nip && <p className="text-xs text-slate-400">NIP. {principal.nip}</p>}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn-theme-primary px-5 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>

        </div>
      </div>

      {/* Full-Screen High-Res Photo Preview Lightbox */}
      {photoPreviewOpen && principal.imageUrl && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setPhotoPreviewOpen(false)}
        >
          {/* Top Bar with Title and Close Button */}
          <div
            className="w-full max-w-lg flex items-center justify-between text-white mb-3 px-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 pr-3">
              <p className="text-sm sm:text-base font-bold text-white truncate">
                {principal.name || 'Foto Ketua MGMP'}
              </p>
              <p className="text-xs text-slate-300 truncate">
                {principal.title || 'Ketua MGMP IPA'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPhotoPreviewOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors cursor-pointer shrink-0"
              aria-label="Tutup Foto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Image Container */}
          <div
            className="relative max-w-lg max-h-[75vh] sm:max-h-[82vh] rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={principal.imageUrl}
              alt={principal.name || 'Foto Ketua MGMP'}
              referrerPolicy="no-referrer"
              className="max-h-[75vh] sm:max-h-[82vh] w-auto max-w-full object-contain rounded-2xl"
            />
          </div>

          {/* Bottom Caption / Dismiss note */}
          <p className="text-xs text-slate-400 mt-3 text-center">
            Ketuk area luar atau tombol silang untuk menutup
          </p>
        </div>
      )}
    </>
  );
};
