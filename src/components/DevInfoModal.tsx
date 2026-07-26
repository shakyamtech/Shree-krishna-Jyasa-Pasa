import React from "react";
import { X, Gem, ExternalLink, Sparkles, ShieldCheck, Code, Cpu } from "lucide-react";

interface DevInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DevInfoModal({ isOpen, onClose }: DevInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click listener */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#1c140d] via-[#120d08] to-[#0a0704] border border-[#d4af37]/40 rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.25)] text-[#f4efe8] z-10 overflow-hidden">
        {/* Top Gold Ambient Light */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-36 bg-[#d4af37]/20 blur-3xl rounded-full pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-amber-200/70 hover:text-amber-100 hover:bg-[#d4af37]/20 transition-all cursor-pointer"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full border-2 border-[#d4af37] bg-[#1a130b] flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.4)] mb-3 p-1">
            <img
              src="/logo.jpg"
              alt="Shree Krishna Jyasa Pasa Logo"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <Gem className="w-8 h-8 text-[#d4af37]" />
          </div>

          <h2 className="font-serif text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#fbf2c0] via-[#d4af37] to-[#b8860b] bg-clip-text text-transparent">
            श्री कृष्ण ज्यासः पस
          </h2>
          <p className="text-xs text-amber-200/70 tracking-widest uppercase mt-0.5 font-medium">
            Shree Krishna Jyasa Pasa • Established Craft
          </p>

          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#fbf2c0] text-xs font-semibold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Jewellery ERP Management System</span>
            <span className="bg-[#d4af37] text-[#0d0a08] text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-1">
              v1.0.0
            </span>
          </div>
        </div>

        {/* Description Section */}
        <div className="space-y-4 text-xs sm:text-sm text-gray-300/90 leading-relaxed border-t border-b border-[#3a2c1d] py-4 mb-6">
          <p className="text-center sm:text-left">
            नेपाली परम्परागत सुन तथा चाँदी गहना व्यवसायीहरूका लागि विशेष रूपमा निर्मित डिजिटल व्यवस्थापन प्रणाली। यसले लाइभ सुन/चाँदीको भाउ (FENEGOSIDA Rates), १० ग्राम देखि तोला रूपान्तरण, स्टक तथा क्याटलग व्यवस्थापन, र डिजिटल बिलिङ प्रणाली सहज उपलब्ध गराउँदछ।
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs font-medium pt-1">
            <div className="flex items-center gap-2 bg-[#1b130a] p-2 rounded-lg border border-[#4a3925]">
              <ShieldCheck className="w-4 h-4 text-[#d4af37] shrink-0" />
              <span>Live FENEGOSIDA Rates</span>
            </div>
            <div className="flex items-center gap-2 bg-[#1b130a] p-2 rounded-lg border border-[#4a3925]">
              <Cpu className="w-4 h-4 text-[#d4af37] shrink-0" />
              <span>10g to Tola Auto Calc</span>
            </div>
            <div className="flex items-center gap-2 bg-[#1b130a] p-2 rounded-lg border border-[#4a3925]">
              <Gem className="w-4 h-4 text-[#d4af37] shrink-0" />
              <span>Full Jewelry Catalog</span>
            </div>
            <div className="flex items-center gap-2 bg-[#1b130a] p-2 rounded-lg border border-[#4a3925]">
              <Code className="w-4 h-4 text-[#d4af37] shrink-0" />
              <span>Dual Nepali / ENG UI</span>
            </div>
          </div>
        </div>

        {/* Developer Info Footer */}
        <div className="flex flex-col items-center text-center space-y-2 pt-1">
          <div className="text-xs text-amber-200/80">
            Technology Partner: <strong className="text-[#fbf2c0] font-bold">Shakya M. Tech</strong>
          </div>

          <a
            href="https://shakyamahesh.com.np"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#d4af37] hover:text-[#fbf2c0] font-semibold bg-[#241a10] hover:bg-[#322416] px-4 py-2 rounded-xl border border-[#d4af37]/50 shadow-md transition-all duration-200 hover:scale-105 cursor-pointer group"
          >
            <span>Developer: <strong className="underline">Mahesh Shakya</strong></span>
            <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>

          <p className="text-[10px] text-gray-500 pt-2">
            Visit <span className="text-amber-300">shakyamahesh.com.np</span> for custom software & AI development.
          </p>
        </div>
      </div>
    </div>
  );
}
