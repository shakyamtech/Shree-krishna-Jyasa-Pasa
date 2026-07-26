import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { DevInfoModal } from "./DevInfoModal";
import {
  Sparkles,
  ShieldCheck,
  Calculator,
  Compass,
  ArrowRight,
  TrendingUp,
  Gem,
  Award,
  PhoneCall,
  MapPin,
  Clock,
  ChevronRight,
  ChevronLeft,
  X,
  Lock,
  UserCheck,
  CheckCircle2,
  Code,
  Headphones,
} from "lucide-react";

// Initial metal rates in NPR per Tola (1 Tola = 11.664 grams = 10 Lal)
const INITIAL_RATES = {
  gold24k: 175400, // Fine Gold
  gold22k: 174550, // Tejabbi Gold
  silver: 2050, // Fine Silver
  updatedAt: "Today, 10:30 AM",
};

interface ProductItem {
  id: string;
  name: string;
  nepaliName: string;
  category: "necklaces" | "earrings" | "bridal" | "bangles";
  weightTola: number;
  weightLal: number;
  purity: string;
  image: string;
  description: string;
  nepaliDescription: string;
  makingChargePercent: number;
  featured?: boolean;
}

const PRODUCTS: ProductItem[] = [
  {
    id: "tilhari-1",
    name: "Royal Emerald Green Tilhari",
    nepaliName: "शाही हरियो पोते तिलहरी",
    category: "necklaces",
    weightTola: 1.5,
    weightLal: 0,
    purity: "24K (99.9% Pure Gold)",
    image: "/tilhari.png",
    description:
      "Handcrafted 24K pure gold central engraved cylinder tube mounted on lush emerald green potote glass bead strands. The sacred ornament of traditional Nepalese matrimony.",
    nepaliDescription:
      "२४ क्यारेट शुद्ध सुनको नक्काशीदार तिलहरी र हरियो पोते। नेपाली वैवाहिक परम्पराको पवित्र र सर्वोत्कृष्ट गहना।",
    makingChargePercent: 8,
    featured: true,
  },
  {
    id: "naugedi-1",
    name: "Traditional Crimson Nau Gedi",
    nepaliName: "परम्परागत रातो नौगेडी",
    category: "necklaces",
    weightTola: 2.2,
    weightLal: 5,
    purity: "24K (99.9% Pure Gold)",
    image: "/naugedi.png",
    description:
      "Nine intricately carved hollow gold sphere beads laced meticulously onto a deep crimson velvet thread. Classic Nepalese royalty piece.",
    nepaliDescription:
      "नौ वटा नक्काशीदार सुनका गेडा र रातो मखमली धागोको अनुपम संगम। परम्परागत नेपाली सौन्दर्यको प्रतीक।",
    makingChargePercent: 9,
    featured: true,
  },
  {
    id: "jhumka-1",
    name: "Filigree Peacock Jhumka",
    nepaliName: "मयूर नक्काशीदार शाही झुम्का",
    category: "earrings",
    weightTola: 1.2,
    weightLal: 2,
    purity: "24K (99.9% Pure Gold)",
    image: "/jhumka.png",
    description:
      "Traditional 24K gold chandelier Jhumka featuring delicate peacock filigree carving and swinging golden drop balls.",
    nepaliDescription:
      "२४ क्यारेट सुनमा तयार पारिएको मयूर आकृति र झुम्किने दानाहरूसहितको सुन्दर झुम्का।",
    makingChargePercent: 10,
    featured: true,
  },
  {
    id: "kantha-1",
    name: "Royal Heritage Kantha & Sirbandi Set",
    nepaliName: "शाही कण्ठ र सिरबन्दी सेट",
    category: "bridal",
    weightTola: 4.8,
    weightLal: 0,
    purity: "24K (99.9% Pure Gold)",
    image: "/kantha.png",
    description:
      "Exquisite Newari & Gurung royal traditional Kantha bead necklace and matching bridal Sirbandi forehead crown set.",
    nepaliDescription:
      "नेवारी तथा गुरुङ परम्पराको भव्य कण्ठमाला र बेहुलीको लागि अति आकर्षक सिरबन्दी सेट।",
    makingChargePercent: 10,
    featured: true,
  },
  {
    id: "bulaki-1",
    name: "Intricate Royal Bulaki & Phuli",
    nepaliName: "नक्काशीदार बुलाकी र फुली",
    category: "bridal",
    weightTola: 0.4,
    weightLal: 5,
    purity: "24K (99.9% Pure Gold)",
    image: "/tilhari.png",
    description:
      "Traditional Nepalese nose ornament crafted with high-precision hand filigree work and gold drop beads.",
    nepaliDescription:
      "परम्परागत हातको सूक्ष्म कालीगढीमा बनेको २४ क्यारेट सुनको उत्कृष्ट बुलाकी।",
    makingChargePercent: 12,
  },
  {
    id: "bangle-1",
    name: "Embossed Floral Gold Chura (Pair)",
    nepaliName: "फूलबुट्टा नक्काशीदार सुनको चूरा",
    category: "bangles",
    weightTola: 3.0,
    weightLal: 0,
    purity: "22K (91.6% Tejabbi Gold)",
    image: "/naugedi.png",
    description:
      "Heavy solid 22K gold bangles with traditional Nepalese flower motifs and secure screw clasp.",
    nepaliDescription:
      "पारम्परिक बुट्टा भरिएको बलियो २२ क्यारेट तेजाबी सुनको चूरा जोडी।",
    makingChargePercent: 8,
  },
];

const HERO_SLIDES = [
  {
    id: "slide-1",
    image: "/hero_bg.png",
    caption: "शाही सुनका परम्परागत गहनाहरू • Royal 24K Gold Set",
  },
  {
    id: "slide-2",
    image: "/hero_bg_2.png",
    caption: "नक्काशीदार सुनको चूरा र मयूर झुम्का • Fine Gold Chura & Jhumka",
  },
  {
    id: "slide-3",
    image: "/kantha.png",
    caption: "मौलिक नेवारी कण्ठ र बेहुलीको सिरबन्दी • Heritage Kantha & Sirbandi",
  },
  {
    id: "slide-4",
    image: "/naugedi.png",
    caption: "परम्परागत रातो नौगेडी र तिलहरी • Traditional Nau Gedi & Tilhari",
  },
];

export function NepaliJewelleryHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rates] = useState(INITIAL_RATES);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeModalProduct, setActiveModalProduct] = useState<ProductItem | null>(null);
  const [showDevModal, setShowDevModal] = useState<boolean>(false);

  // Hero background slider state
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  const nextSlide = () => setCurrentSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
  const prevSlide = () => setCurrentSlideIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Calculator State
  const [calcMetal, setCalcMetal] = useState<"gold24k" | "gold22k" | "silver">("gold24k");
  const [calcTola, setCalcTola] = useState<number>(1);
  const [calcLal, setCalcLal] = useState<number>(0);
  const [calcMakingPercent, setCalcMakingPercent] = useState<number>(8);

  // Calculate estimated total price
  const calculateEstimate = (
    metal: "gold24k" | "gold22k" | "silver",
    tola: number,
    lal: number,
    makingPct: number
  ) => {
    const ratePerTola = rates[metal];
    const totalTola = tola + lal / 10;
    const rawPrice = totalTola * ratePerTola;
    const makingCharge = rawPrice * (makingPct / 100);
    const totalPrice = rawPrice + makingCharge;
    return {
      rawPrice: Math.round(rawPrice),
      makingCharge: Math.round(makingCharge),
      totalPrice: Math.round(totalPrice),
    };
  };

  const currentEstimate = calculateEstimate(
    calcMetal,
    calcTola,
    calcLal,
    calcMakingPercent
  );

  const filteredProducts =
    selectedCategory === "all"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#0d0a08] text-[#f4efe8] font-sans antialiased selection:bg-[#d4af37] selection:text-[#0d0a08]">
      {/* TOP LIVE METAL RATES MARQUEE TICKER */}
      <div className="bg-gradient-to-r from-[#17110c] via-[#241a11] to-[#17110c] border-b border-[#3a2c1d] flex items-center h-9 overflow-hidden">
        {/* LIVE Label – pinned left */}
        <div className="shrink-0 flex items-center gap-1.5 bg-[#d4af37] text-[#0d0a08] font-bold text-[10px] tracking-widest uppercase px-3 h-full">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0d0a08] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0d0a08]"></span>
          </span>
          LIVE
        </div>
        {/* Scrolling marquee track */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex items-center animate-ticker whitespace-nowrap">
            {/* Duplicated twice for seamless looping */}
            {[0, 1].map((copy) => (
              <span key={copy} className="inline-flex items-center gap-6 px-6">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#d4af37]/70 text-[11px]">छापावाल सुन (२४K):</span>
                  <span className="text-[#fbf2c0] font-bold text-xs">रू {rates.gold24k.toLocaleString("ne-NP")}</span>
                  <span className="text-[#d4af37]/50 text-[10px]">/तोला</span>
                </span>
                <span className="text-[#d4af37]/30 text-base">◆</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#d4af37]/70 text-[11px]">तेजाबी सुन (२२K):</span>
                  <span className="text-[#fbf2c0] font-bold text-xs">रू {rates.gold22k.toLocaleString("ne-NP")}</span>
                  <span className="text-[#d4af37]/50 text-[10px]">/तोला</span>
                </span>
                <span className="text-[#d4af37]/30 text-base">◆</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-slate-400/80 text-[11px]">चाँदी (Silver 999):</span>
                  <span className="text-slate-200 font-bold text-xs">रू {rates.silver.toLocaleString("ne-NP")}</span>
                  <span className="text-slate-500 text-[10px]">/तोला</span>
                </span>
                <span className="text-[#d4af37]/30 text-base">◆</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-[#d4af37]/50 text-[11px] italic">FENEGOSIDA Nepal • आजको बजारभाउ</span>
                </span>
                <span className="text-[#d4af37]/30 text-base">◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* LUXURY NAVIGATION HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#0d0a08]/90 border-b border-[#2a1f15]/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              title="होमपेजमा जानुहोस् (Go to Homepage)"
              className="cursor-pointer group hover:scale-110 transition-transform duration-200"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.3)] group-hover:shadow-[0_0_25px_rgba(212,175,55,0.7)] group-hover:border-[#fbf2c0] bg-[#1a130b] flex items-center justify-center p-0.5 transition-all">
                <img
                  src="/logo.jpg"
                  alt="Shree Krishna Jyasa Pasa Logo"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <Gem className="w-6 h-6 text-[#d4af37]" />
              </div>
            </Link>
            <div>
              <h1 className="font-serif text-lg md:text-xl font-bold bg-gradient-to-r from-[#fbf2c0] via-[#d4af37] to-[#b8860b] bg-clip-text text-transparent inline-block py-1 px-1">
                श्री कृष्ण ज्यासः पस
              </h1>
              <p className="text-[10px] tracking-widest text-amber-200/70 uppercase">
                Shree Krishna Jyasa Pasa • Established Craft
              </p>
            </div>
          </div>

          {/* Nav links with animated gold underline on hover */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a
              href="#collections"
              className="relative text-amber-100/80 hover:text-[#fbf2c0] transition-colors py-1 group"
            >
              <span>गहना संग्रह (Collections)</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#d4af37] to-[#fbf2c0] group-hover:w-full transition-all duration-300 rounded-full" />
            </a>
            <a
              href="#calculator"
              className="relative text-amber-100/80 hover:text-[#fbf2c0] transition-colors py-1 group"
            >
              <span>मूल्य क्याल्कुलेटर (Estimator)</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#d4af37] to-[#fbf2c0] group-hover:w-full transition-all duration-300 rounded-full" />
            </a>
            <a
              href="#heritage"
              className="relative text-amber-100/80 hover:text-[#fbf2c0] transition-colors py-1 group"
            >
              <span>हाम्रो विरासत (Heritage)</span>
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-[#d4af37] to-[#fbf2c0] group-hover:w-full transition-all duration-300 rounded-full" />
            </a>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate({ to: "/dashboard" })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-[#0d0a08] font-semibold text-sm shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:brightness-110 transition"
              >
                <UserCheck className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
            ) : (
              <button
                onClick={() => navigate({ to: "/login" })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-[#0d0a08] font-semibold text-sm shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:brightness-110 transition"
              >
                <Lock className="w-4 h-4" />
                <span>पसल लगइन (Shop Login)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32 bg-[#0d0a08]">
        {/* Jewellery background image slideshow with smooth sliding & Ken-Burns animation */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {HERO_SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out ${
                idx === currentSlideIndex
                  ? "opacity-60 scale-100 translate-x-0 z-0"
                  : idx < currentSlideIndex
                  ? "opacity-0 scale-105 -translate-x-full -z-10"
                  : "opacity-0 scale-105 translate-x-full -z-10"
              }`}
            >
              <img
                src={slide.image}
                alt={slide.caption}
                className="w-full h-full object-cover filter brightness-90 contrast-110"
              />
            </div>
          ))}
          {/* Black gradient dim overlay to ensure text contrast while showcasing jewellery */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d0a08]/75 via-[#0d0a08]/50 to-[#0d0a08]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#0d0a08_90%)]" />
        </div>

        {/* Left & Right Slider Arrow Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-full bg-[#1c140c]/80 text-[#d4af37] border border-[#d4af37]/40 hover:bg-[#d4af37] hover:text-black transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] cursor-pointer backdrop-blur-md hidden sm:flex items-center justify-center group"
          aria-label="Previous background slide"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-full bg-[#1c140c]/80 text-[#d4af37] border border-[#d4af37]/40 hover:bg-[#d4af37] hover:text-black transition-all shadow-[0_0_15px_rgba(212,175,55,0.3)] cursor-pointer backdrop-blur-md hidden sm:flex items-center justify-center group"
          aria-label="Next background slide"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Background glow graphics */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-tr from-[#d4af37]/20 via-[#b8860b]/15 to-transparent rounded-full blur-3xl pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#241a11]/90 border border-[#d4af37]/40 text-[#fbf2c0] text-xs font-medium mb-8 backdrop-blur-md shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>२४ क्यारेट विशुद्ध नेपाली परम्परागत गहनाहरू • 24K Pure Gold</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight text-[#fbf2c0] max-w-4xl mx-auto leading-relaxed md:leading-relaxed">
            परम्परा र उत्कृष्ट कालीगढीको <br />
            <span className="inline-block pt-2 pb-6 px-3 bg-gradient-to-r from-[#fbf2c0] via-[#d4af37] to-[#8b6d05] bg-clip-text text-transparent italic">
              शाही गहना संग्रह
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-amber-100/70 max-w-2xl mx-auto leading-relaxed">
            पाटन तथा काठमाडौँका सिद्धहस्त सुवर्णकारहरूद्वारा निर्मित विशुद्ध २४ क्यारेट तिलहरी, नौगेडी, कण्ठ, सिरबन्दी र शाही झुम्काहरूको अनुपम प्रस्तुति।
          </p>

          {/* Slide Indicator Dots */}
          <div className="mt-6 flex items-center justify-center gap-2 relative z-20">
            {HERO_SLIDES.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={() => setCurrentSlideIndex(idx)}
                title={slide.caption}
                className={`h-2 rounded-full transition-all duration-500 cursor-pointer ${
                  idx === currentSlideIndex
                    ? "w-8 bg-[#d4af37] shadow-[0_0_12px_rgba(212,175,55,0.9)]"
                    : "w-2 bg-amber-100/30 hover:bg-amber-100/60"
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#collections"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#fbf2c0] to-[#b8860b] text-[#0d0a08] font-bold text-sm shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:scale-[1.02] transition-all duration-200"
            >
              <span>गहना संग्रह हेर्नुहोस् (Explore Catalog)</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <a
              href="#calculator"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#1c140c] border border-[#d4af37]/50 text-[#fbf2c0] font-semibold text-sm hover:bg-[#281d12] transition-colors"
            >
              <Calculator className="w-4 h-4 text-[#d4af37]" />
              <span>आजको मूल्य क्याल्कुलेटर</span>
            </a>
          </div>

          {/* Quick Features Row with interactive gold hover effects */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-[#16100a]/80 border border-[#332516] flex items-center gap-3 text-left transition-all duration-300 hover:scale-[1.05] hover:-translate-y-1 hover:border-[#d4af37]/70 hover:bg-[#241a11] hover:shadow-[0_0_20px_rgba(212,175,55,0.35)] cursor-pointer group backdrop-blur-sm">
              <ShieldCheck className="w-8 h-8 text-[#d4af37] shrink-0 group-hover:scale-110 group-hover:rotate-3 group-hover:text-[#fbf2c0] transition-transform duration-300" />
              <div>
                <h4 className="text-xs font-bold text-[#fbf2c0] group-hover:text-[#d4af37] transition-colors">100% BIS Hallmark</h4>
                <p className="text-[11px] text-gray-400 group-hover:text-amber-100/90 transition-colors">प्रमाणित शुद्धता ग्यारेन्टी</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#16100a]/80 border border-[#332516] flex items-center gap-3 text-left transition-all duration-300 hover:scale-[1.05] hover:-translate-y-1 hover:border-[#d4af37]/70 hover:bg-[#241a11] hover:shadow-[0_0_20px_rgba(212,175,55,0.35)] cursor-pointer group backdrop-blur-sm">
              <Gem className="w-8 h-8 text-[#d4af37] shrink-0 group-hover:scale-110 group-hover:rotate-3 group-hover:text-[#fbf2c0] transition-transform duration-300" />
              <div>
                <h4 className="text-xs font-bold text-[#fbf2c0] group-hover:text-[#d4af37] transition-colors">24K Pure Gold</h4>
                <p className="text-[11px] text-gray-400 group-hover:text-amber-100/90 transition-colors">विशुद्ध सुनको बनावट</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#16100a]/80 border border-[#332516] flex items-center gap-3 text-left transition-all duration-300 hover:scale-[1.05] hover:-translate-y-1 hover:border-[#d4af37]/70 hover:bg-[#241a11] hover:shadow-[0_0_20px_rgba(212,175,55,0.35)] cursor-pointer group backdrop-blur-sm">
              <Compass className="w-8 h-8 text-[#d4af37] shrink-0 group-hover:scale-110 group-hover:rotate-3 group-hover:text-[#fbf2c0] transition-transform duration-300" />
              <div>
                <h4 className="text-xs font-bold text-[#fbf2c0] group-hover:text-[#d4af37] transition-colors">Custom Orders</h4>
                <p className="text-[11px] text-gray-400 group-hover:text-amber-100/90 transition-colors">चाहेको डिजाइनमा तयार</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#16100a]/80 border border-[#332516] flex items-center gap-3 text-left transition-all duration-300 hover:scale-[1.05] hover:-translate-y-1 hover:border-[#d4af37]/70 hover:bg-[#241a11] hover:shadow-[0_0_20px_rgba(212,175,55,0.35)] cursor-pointer group backdrop-blur-sm">
              <Award className="w-8 h-8 text-[#d4af37] shrink-0 group-hover:scale-110 group-hover:rotate-3 group-hover:text-[#fbf2c0] transition-transform duration-300" />
              <div>
                <h4 className="text-xs font-bold text-[#fbf2c0] group-hover:text-[#d4af37] transition-colors">Buyback Guarantee</h4>
                <p className="text-[11px] text-gray-400 group-hover:text-amber-100/90 transition-colors">१००% फिर्ता तथा सट्टा-पट्टा</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRADITIONAL NEPALI JEWELLERY SHOWCASE */}
      <section id="collections" className="py-16 bg-[#090705] border-t border-[#23180e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#fbf2c0]">
              हाम्रा मौलिक तथा परम्परागत गहनाहरू
            </h2>
            <p className="mt-3 text-sm text-amber-100/60">
              नेपाली संस्कृति, विवाह तथा चाडपर्वका लागि नभई नहुने मौलिक गहनाहरूको अलौकिक संग्रह
            </p>

            {/* Category Filter Tabs */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {[
                { id: "all", label: "सबै (All)" },
                { id: "necklaces", label: "तिलहरी र नौगेडी (Necklaces)" },
                { id: "earrings", label: "झुम्का (Earrings)" },
                { id: "bridal", label: "सिरबन्दी र कण्ठ (Bridal)" },
                { id: "bangles", label: "चूरा र कडा (Bangles)" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    selectedCategory === tab.id
                      ? "bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-[#0d0a08] shadow-md"
                      : "bg-[#18110a] text-amber-100/70 border border-[#332415] hover:border-[#d4af37]/50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => {
              const estimatedPrice = calculateEstimate(
                product.purity.includes("22K") ? "gold22k" : "gold24k",
                product.weightTola,
                product.weightLal,
                product.makingChargePercent
              ).totalPrice;

              return (
                <div
                  key={product.id}
                  className="group relative bg-gradient-to-b from-[#16100b] to-[#100b07] rounded-2xl border border-[#332415] hover:border-[#d4af37]/60 transition-all duration-300 overflow-hidden shadow-xl flex flex-col"
                >
                  {/* Image container */}
                  <div className="relative h-64 overflow-hidden bg-[#0a0705]">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#100b07] via-transparent to-transparent opacity-80" />

                    <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#0d0a08]/80 border border-[#d4af37]/40 text-[#fbf2c0] text-[11px] font-semibold backdrop-blur-md">
                      {product.purity}
                    </div>

                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#d4af37] text-[#0d0a08] text-[11px] font-bold">
                      {product.weightTola} तोला {product.weightLal > 0 ? `${product.weightLal} लाल` : ""}
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[#fbf2c0] group-hover:text-[#d4af37] transition-colors">
                        {product.nepaliName}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 italic">{product.name}</p>
                      <p className="text-xs text-amber-100/70 mt-3 line-clamp-2 leading-relaxed">
                        {product.nepaliDescription}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#261b10] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 block">अनुमानित कुल मूल्य (Est. Price):</span>
                        <span className="text-lg font-bold font-mono text-[#d4af37]">
                          रू {estimatedPrice.toLocaleString("ne-NP")}
                        </span>
                      </div>

                      <button
                        onClick={() => setActiveModalProduct(product)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#24190e] hover:bg-[#d4af37] hover:text-[#0d0a08] border border-[#d4af37]/40 text-xs font-semibold text-[#fbf2c0] transition-colors"
                      >
                        <span>विस्तृत विवरण</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* INTERACTIVE GOLD PRICE ESTIMATOR CALCULATOR */}
      <section id="calculator" className="py-16 bg-[#120d09] border-t border-[#261b10]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#1c140d] via-[#160f09] to-[#0d0a08] rounded-3xl border border-[#44321e] p-6 sm:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-[#281c11] border border-[#d4af37]/40 text-[#d4af37]">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#fbf2c0]">
                  सुनको गहना मूल्य अनुमानक (Gold Jewellery Price Estimator)
                </h2>
                <p className="text-xs text-amber-100/60">
                  तौल, सुनको प्रकार र ज्यालाका आधारमा तत्काल मूल्य हिसाब गर्नुहोस्
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">
                    सुनको प्रकार (Metal & Purity):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setCalcMetal("gold24k")}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition ${
                        calcMetal === "gold24k"
                          ? "bg-[#d4af37] text-[#0d0a08] border-[#d4af37]"
                          : "bg-[#18110b] text-gray-300 border-[#332415]"
                      }`}
                    >
                      २४K छापावाल
                    </button>
                    <button
                      onClick={() => setCalcMetal("gold22k")}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition ${
                        calcMetal === "gold22k"
                          ? "bg-[#d4af37] text-[#0d0a08] border-[#d4af37]"
                          : "bg-[#18110b] text-gray-300 border-[#332415]"
                      }`}
                    >
                      २२K तेजाबी
                    </button>
                    <button
                      onClick={() => setCalcMetal("silver")}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition ${
                        calcMetal === "silver"
                          ? "bg-[#d4af37] text-[#0d0a08] border-[#d4af37]"
                          : "bg-[#18110b] text-gray-300 border-[#332415]"
                      }`}
                    >
                      चाँदी (Silver)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      तौल (तोला / Tola):
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={calcTola}
                      onChange={(e) => setCalcTola(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#0d0a08] border border-[#44321e] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1">
                      लाल (Lal - 1 Tola = 10 Lal):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="9.9"
                      step="0.5"
                      value={calcLal}
                      onChange={(e) => setCalcLal(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#0d0a08] border border-[#44321e] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    ज्याला तथा जडाउ (Making & Craft Charge %):
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="15"
                    value={calcMakingPercent}
                    onChange={(e) => setCalcMakingPercent(parseInt(e.target.value))}
                    className="w-full accent-[#d4af37]"
                  />
                  <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                    <span>साधारण (५%)</span>
                    <span className="text-[#d4af37] font-bold">{calcMakingPercent}%</span>
                    <span>जटिल नक्काशी (१५%)</span>
                  </div>
                </div>
              </div>

              {/* Estimate Calculation Result Box */}
              <div className="bg-[#0b0806] rounded-2xl border border-[#3d2b1a] p-6 text-left flex flex-col justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-amber-200/60 font-semibold block mb-1">
                    अनुमानित हिसाब विग्यापन (Cost Breakdown)
                  </span>

                  <div className="space-y-3 mt-4 text-xs">
                    <div className="flex justify-between text-gray-300">
                      <span>सुनको कुल तौल:</span>
                      <span className="font-mono text-white">
                        {calcTola} तोला {calcLal} लाल ({( (calcTola + calcLal/10) * 11.664 ).toFixed(2)} grams)
                      </span>
                    </div>

                    <div className="flex justify-between text-gray-300">
                      <span>आजको बजार दर:</span>
                      <span className="font-mono text-white">
                        रू {rates[calcMetal].toLocaleString("ne-NP")} /तोला
                      </span>
                    </div>

                    <div className="flex justify-between text-gray-300">
                      <span>कच्चा धातुको मूल्य:</span>
                      <span className="font-mono text-white">
                        रू {currentEstimate.rawPrice.toLocaleString("ne-NP")}
                      </span>
                    </div>

                    <div className="flex justify-between text-gray-300">
                      <span>कालीगढी ज्याला ({calcMakingPercent}%):</span>
                      <span className="font-mono text-white">
                        रू {currentEstimate.makingCharge.toLocaleString("ne-NP")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#2a1d12]">
                  <span className="text-xs text-gray-400 block">कुल अनुमानित मूल्य (Total Estimated Cost):</span>
                  <span className="text-2xl sm:text-3xl font-serif font-bold text-[#d4af37] font-mono">
                    रू {currentEstimate.totalPrice.toLocaleString("ne-NP")}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-2">
                    * यो अनुमानित मूल्य हो। पसलमा आउँदा वास्तविक नापतौल र दर लागू हुनेछ।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HERITAGE & CRAFT STORY */}
      <section id="heritage" className="py-16 bg-[#0a0705]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#241a11] border border-[#d4af37]/40 text-[#d4af37] text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>पुस्तान्तरण कला र परम्परा</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#fbf2c0] leading-tight">
                श्री कृष्ण ज्यासः पसको इतिहास र मौलिकता
              </h2>

              <p className="mt-4 text-sm text-amber-100/70 leading-relaxed">
                काठमाडौँ उपत्यकाको प्राचीन हस्तकला र सुवर्णकार परम्परालाई निरन्तरता दिँदै हामीले दशकौँदेखि शुद्ध २४ क्यारेट सुन तथा शुद्ध चाँदीका परम्परागत नेपाली गहनाहरू निर्माण गर्दै आएका छौँ।
              </p>

              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
                  <p className="text-amber-100/80">
                    <strong className="text-white">सिद्धहस्त नेवारी कालीगढी:</strong> परम्परागत ढाँचामा हस्तनिर्मित तिलहरी, नौगेडी र कण्ठमाला।
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
                  <p className="text-amber-100/80">
                    <strong className="text-white">शतप्रतिशत शुद्धता र प्रमाण:</strong> नेपाल सुनचाँदी व्यवसायी महासंघ र सरकारी मापदण्ड अनुसार प्रमाणित।
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
                  <p className="text-amber-100/80">
                    <strong className="text-white">अर्डर अनुसार डिजाइन:</strong> ग्राहकको रोजाइ र बजेट अनुसार इच्छाएको डिजाइनमा गहना तयार।
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden border border-[#44321e] shadow-2xl">
                <img
                  src="/kantha.png"
                  alt="Nepali Traditional Jewellery Crafting"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0a08] via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-[#0d0a08]/90 border border-[#d4af37]/40 backdrop-blur-md">
                  <h4 className="font-serif font-bold text-[#fbf2c0] text-sm">
                    Shree Krishna Jyasa Pasa • Craftsmen Heritage
                  </h4>
                  <p className="text-xs text-amber-100/70 mt-1">
                    "गहना मात्र होइन, नेपाली संस्कृति र परम्पराको संरक्षण।"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK VIEW MODAL */}
      {activeModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-[#140e0a] border border-[#d4af37]/50 rounded-2xl p-6 sm:p-8 shadow-2xl overflow-hidden">
            <button
              onClick={() => setActiveModalProduct(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-[#241a11] text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="rounded-xl overflow-hidden border border-[#332415] bg-black">
                <img
                  src={activeModalProduct.image}
                  alt={activeModalProduct.name}
                  className="w-full h-64 object-cover"
                />
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#d4af37]/20 text-[#d4af37] text-xs font-semibold border border-[#d4af37]/30 mb-2">
                    {activeModalProduct.purity}
                  </span>
                  <h3 className="font-serif text-xl font-bold text-[#fbf2c0]">
                    {activeModalProduct.nepaliName}
                  </h3>
                  <p className="text-xs text-gray-400 italic">{activeModalProduct.name}</p>

                  <p className="text-xs text-amber-100/80 mt-4 leading-relaxed">
                    {activeModalProduct.nepaliDescription}
                  </p>

                  <div className="mt-4 space-y-2 text-xs text-gray-300">
                    <div className="flex justify-between border-b border-[#281c11] py-1">
                      <span>तौल (Weight):</span>
                      <span className="font-bold text-white">
                        {activeModalProduct.weightTola} तोला {activeModalProduct.weightLal} लाल
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-[#281c11] py-1">
                      <span>कालीगढी (Making Charge):</span>
                      <span className="font-bold text-white">
                        {activeModalProduct.makingChargePercent}%
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-[#281c11] py-1">
                      <span>प्रमाणपत्र (Hallmark):</span>
                      <span className="font-bold text-[#d4af37]">Certified 100% Pure</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#281c11] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 block">अनुमानित कुल मूल्य:</span>
                    <span className="text-xl font-bold font-mono text-[#d4af37]">
                      रू{" "}
                      {calculateEstimate(
                        activeModalProduct.purity.includes("22K") ? "gold22k" : "gold24k",
                        activeModalProduct.weightTola,
                        activeModalProduct.weightLal,
                        activeModalProduct.makingChargePercent
                      ).totalPrice.toLocaleString("ne-NP")}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setActiveModalProduct(null);
                      navigate({ to: "/login" });
                    }}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-[#0d0a08] font-bold text-xs shadow-lg hover:brightness-110 transition"
                  >
                    पसल सोधपुछ (Inquire)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-[#070504] border-t border-[#23180e] pt-12 pb-8 text-amber-100/70 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Gem className="w-5 h-5 text-[#d4af37]" />
                <span className="font-serif font-bold text-base text-[#fbf2c0]">
                  श्री कृष्ण ज्यासः पस
                </span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed">
                विशुद्ध २४ क्यारेट सुन तथा शुद्ध चाँदीका परम्परागत नेपाली गहनाहरूको विश्वासीलो र पुरानो पसल।
              </p>
            </div>

            <div>
              <h4 className="font-bold text-[#fbf2c0] mb-3 text-sm flex items-center gap-2 group cursor-pointer hover:text-[#d4af37] transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] group-hover:scale-150 group-hover:shadow-[0_0_8px_rgba(212,175,55,0.9)] transition-all" />
                <span>मुख्य गहनाहरू</span>
              </h4>
              <ul className="space-y-2 text-gray-400 text-xs">
                <li className="hover:text-[#fbf2c0] hover:translate-x-1.5 transition-all duration-200 cursor-pointer flex items-center gap-1.5">
                  <span className="text-[#d4af37]">•</span>
                  <a href="#collections">हरियो तथा रातो पोते तिलहरी</a>
                </li>
                <li className="hover:text-[#fbf2c0] hover:translate-x-1.5 transition-all duration-200 cursor-pointer flex items-center gap-1.5">
                  <span className="text-[#d4af37]">•</span>
                  <a href="#collections">नौगेडी र कण्ठमाला</a>
                </li>
                <li className="hover:text-[#fbf2c0] hover:translate-x-1.5 transition-all duration-200 cursor-pointer flex items-center gap-1.5">
                  <span className="text-[#d4af37]">•</span>
                  <a href="#collections">मयूर झुम्का र मारवाडी</a>
                </li>
                <li className="hover:text-[#fbf2c0] hover:translate-x-1.5 transition-all duration-200 cursor-pointer flex items-center gap-1.5">
                  <span className="text-[#d4af37]">•</span>
                  <a href="#collections">सिरबन्दी र बुलाकी</a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#fbf2c0] mb-3 text-sm flex items-center gap-2 group cursor-pointer hover:text-[#d4af37] transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] group-hover:scale-150 group-hover:shadow-[0_0_8px_rgba(212,175,55,0.9)] transition-all" />
                <span>सम्पर्क तथा ठेगाना</span>
              </h4>
              <ul className="space-y-2.5 text-gray-400 text-xs">
                <li className="flex items-center gap-2.5 hover:text-[#fbf2c0] transition-colors cursor-pointer group">
                  <MapPin className="w-4 h-4 text-[#d4af37] group-hover:scale-110 transition-transform" />
                  <span>काठमाडौँ / पाटन दरबार क्षेत्र, नेपाल</span>
                </li>
                <li className="flex items-center gap-2.5 hover:text-[#fbf2c0] transition-colors cursor-pointer group">
                  <PhoneCall className="w-4 h-4 text-[#d4af37] group-hover:scale-110 transition-transform" />
                  <span>+९७७ ०१-XXXXXXX / ९८XXXXXXXX</span>
                </li>
                <li className="flex items-center gap-2.5 hover:text-[#fbf2c0] transition-colors cursor-pointer group">
                  <Clock className="w-4 h-4 text-[#d4af37] group-hover:scale-110 transition-transform" />
                  <span>आइतबार - शुक्रबार: बिहान १०:०० - साँझ ६:००</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-[#fbf2c0] mb-3 text-sm flex items-center gap-2 group cursor-pointer hover:text-[#d4af37] transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] group-hover:scale-150 group-hover:shadow-[0_0_8px_rgba(212,175,55,0.9)] transition-all" />
                <span>पसल व्यवस्थापन</span>
              </h4>
              <p className="text-gray-400 mb-4 text-xs">
                स्टाफ तथा पसल सञ्चालक लगइन गरी बिलिङ र स्टक व्यवस्थापन गर्न सक्नुहुन्छ।
              </p>
              <button
                onClick={() => navigate({ to: "/login" })}
                className="w-full py-2.5 rounded-lg bg-[#1c140d] border border-[#d4af37]/50 text-[#fbf2c0] font-semibold text-xs hover:bg-[#d4af37] hover:text-[#0d0a08] hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:scale-[1.02] transition-all duration-200 cursor-pointer"
              >
                Sign In to Shop Dashboard
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-[#1a120b] flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left text-gray-400 text-xs">
            <div>
              © {new Date().getFullYear()} Shree Krishna Jyasa Pasa • All Rights Reserved. Nepali Traditional Jewellery.
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
              <span
                onClick={() => setShowDevModal(true)}
                className="flex items-center gap-1.5 text-amber-200/90 hover:text-[#fbf2c0] transition-all cursor-pointer group bg-[#1a120b] hover:bg-[#281b10] px-2.5 py-1 rounded-full border border-[#d4af37]/30 hover:border-[#d4af37]/70 shadow-sm"
                title="Click to view System & Developer Information"
              >
                <Code className="w-3.5 h-3.5 text-[#d4af37] group-hover:scale-110 transition-transform" />
                <span>Developed by:</span> <strong className="text-[#fbf2c0] font-bold underline decoration-amber-500/50 underline-offset-2">Shakya M. Tech</strong>
              </span>
              <span className="text-gray-700 hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5 text-amber-200/90">
                <Headphones className="w-3.5 h-3.5 text-[#d4af37]" />
                <span>Support:</span> <a href="tel:+9779800000000" className="text-[#fbf2c0] font-bold hover:underline">+९७-९८XXXXXXXX</a>
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Developer & System Info Modal */}
      <DevInfoModal isOpen={showDevModal} onClose={() => setShowDevModal(false)} />
    </div>
  );
}
