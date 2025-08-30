"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";

export default function Home() {
  const [person, setPerson] = useState<File | null>(null);
  const [productUrl, setProductUrl] = useState("");
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null); // track which product is loading
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<{ id: string; title: string; priceText?: string; images: string[] }[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [imageEnlarged, setImageEnlarged] = useState<{ show: boolean; productId: string | null }>({ show: false, productId: null });
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const productsRef = useRef<HTMLElement>(null);
  const isHeroInView = useInView(heroRef, { once: true });
  const isProductsInView = useInView(productsRef, { once: true });

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 150 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  // Auto-load products
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/products`, { cache: "no-store" });
        const j = await res.json();
        setProducts(j.products || []);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  // Handle mouse movement for parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX - window.innerWidth / 2);
      mouseY.set(e.clientY - window.innerHeight / 2);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Handle ESC key for closing enlarged image
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (imageEnlarged.show) {
          setImageEnlarged({ show: false, productId: null });
        }
        if (selectedProduct !== null) {
          setSelectedProduct(null);
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [imageEnlarged.show, selectedProduct]);

  const onSubmit = async (productId: string, productImageUrl: string) => {
    setError(null);
    if (!person || !productImageUrl) return;
    setLoading(productId);
    try {
      const fd = new FormData();
      fd.append("person", person);
      fd.append("productUrl", productImageUrl);
      const res = await fetch("/api/vton", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Request failed: ${res.status}`);
      }
      const blob = await res.blob();
      const imageUrl = URL.createObjectURL(blob);
      setGeneratedImages(prev => ({ ...prev, [productId]: imageUrl }));
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setLoading(null);
    }
  };

  return (
    <main className="relative">
      {/* Background Elements */}
      <motion.div 
        className="fixed inset-0 pointer-events-none"
        style={{ x: x.get() / 50, y: y.get() / 50 }}
      >
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-20 w-80 h-80 bg-gradient-to-tr from-orange-500/10 to-red-500/10 rounded-full blur-3xl" />
      </motion.div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => setPerson(e.target.files?.[0] ?? null)}
      />

      {/* Navigation */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 p-6"
      >
        <div className="glass-elevated rounded-2xl px-6 py-4 mx-auto max-w-7xl">
          <div className="flex items-center justify-between">
            <motion.div 
              className="text-xl font-mono font-bold tracking-wider"
              whileHover={{ scale: 1.05 }}
            >
              BOGOTTO
            </motion.div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/80">
              {["Experience", "Jackets", "Technology", "About"].map((item, i) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="hover:text-white transition-colors"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 + 0.2 }}
                  whileHover={{ y: -2 }}
                >
                  {item}
                </motion.a>
              ))}
            </div>
            <motion.div 
              className="glass rounded-full px-4 py-2 text-xs font-mono"
              whileHover={{ scale: 1.05 }}
            >
              CART • 0
            </motion.div>
          </div>
              </div>
      </motion.nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.2, opacity: 0 }}
          animate={isHeroInView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 1.5, ease: "easeOut" }}
        >
          <img
            src="/bogotto/bogotto-motorcycle-wear-slider.webp"
            alt="Bogotto gear"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />
        </motion.div>



        <div className="relative z-10 text-center px-6 max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-display font-bold bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent mb-6"
          >
            Motorrad Bekleidung
            <br />
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              virtuell entdecken
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.7 }}
            className="text-xl text-white/70 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Virtual Try-On für Bogotto Motorrad Bekleidung – erlebe wie Premium Gear an dir aussieht.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isHeroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              className="glass-elevated rounded-full px-8 py-4 text-white font-semibold magnetic pulse-glow"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {person ? "✓ Photo Selected" : "Upload Your Photo"}
            </motion.button>
            <motion.button
              onClick={() => document.getElementById("jackets")?.scrollIntoView({ behavior: "smooth" })}
              className="glass rounded-full px-8 py-4 text-white/80 font-semibold magnetic"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Explore Collection
            </motion.button>
          </motion.div>
              </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <motion.div
              className="w-1 h-3 bg-white/60 rounded-full mt-2"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Products Section */}
      <section id="jackets" ref={productsRef} className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={isProductsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1 }}
            className="text-center mb-16"
          >
            <h2 className="text-headline mb-4">Featured Collection</h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Modernste Motorradbekleidung für höchste Performance und Stil. Jedes Stück vereint jahrzehntelange Innovation.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {products.map((product, i) => {
              const hasGeneratedImage = generatedImages[product.id];
              const isLoadingThis = loading === product.id;
              
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={isProductsInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className="group cursor-pointer"
                  onClick={() => {
                    setProductUrl(product.images[0]);
                    setSelectedProduct(i);
                  }}
                >
                  <div className="glass-elevated rounded-3xl overflow-hidden magnetic">
                    <div className="relative overflow-hidden">
                      {/* Show generated image if available, otherwise show original */}
                      {hasGeneratedImage ? (
                        <div className="relative">
                          <motion.img
                            src={hasGeneratedImage}
                            alt={`${product.title} - Virtual Try-On`}
                            className="w-full h-72 object-contain bg-gradient-to-b from-green-500/10 to-emerald-500/10 p-4"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.6 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setImageEnlarged({ show: true, productId: product.id });
                            }}
                          />
                          <div className="absolute top-4 left-4 bg-green-500 rounded-full px-3 py-1 text-xs font-semibold">
                            AI GENERATED
                          </div>
                        </div>
                      ) : (
                        <motion.img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-full h-72 object-contain bg-white p-4"
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.6 }}
                        />
                      )}
                      
                      {/* Loading state */}
                      {isLoadingThis && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                            <div className="text-sm font-semibold">Generating...</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Hover overlay and try-on button */}
                      {!hasGeneratedImage && !isLoadingThis && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          <div className="absolute bottom-6 left-6 right-6 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 ease-out">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSubmit(product.id, product.images[0]);
                              }}
                              disabled={!person}
                              className="w-full bg-black/80 rounded-full px-6 py-3 text-sm font-semibold text-center shadow-lg disabled:opacity-50"
                            >
                              {person ? 'Try On Virtual' : 'Upload Photo First'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  
                  <div className="p-6">
                    <div className="mb-4">
                      <div className="text-xs font-mono text-white/40 mb-2 tracking-wider">
                        ITEM {String(i + 1).padStart(2, "0")}
                      </div>
                      <h3 className="font-semibold text-lg leading-tight mb-3 line-clamp-2 text-white/95">
                        {product.title.replace('Bogotto ', '')}
                      </h3>
                      {product.priceText && (
                        <div className="flex items-baseline gap-2">
                          <span className="text-white font-bold text-xl">
                            {product.priceText.match(/€[\d,]+/)?.[0] || product.priceText.split(' ')[0]}
                          </span>
                          {product.priceText.includes('Normaler Preis') && (
                            <span className="text-white/40 text-sm line-through">
                              {product.priceText.match(/€[\d,]+/g)?.[1]}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-white/50 font-medium">
                        Motorcycle Jacket
                      </div>
                      <motion.div
                        className="w-10 h-10 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30"
                        whileHover={{ rotate: 90, scale: 1.1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )})}
          </div>
        </div>
      </section>

      {/* Try-On Modal */}
      {selectedProduct !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
          onClick={() => setSelectedProduct(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            className="glass-elevated rounded-3xl max-w-6xl w-full max-h-[95vh] overflow-hidden border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <div className="text-xs font-mono text-white/40 tracking-wider mb-1">
                  VIRTUAL TRY-ON EXPERIENCE
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
                  {products[selectedProduct]!.title.replace('Bogotto ', '')}
                </h2>
              </div>
              <motion.button
                onClick={() => setSelectedProduct(null)}
                className="w-10 h-10 glass rounded-full flex items-center justify-center text-white/60 hover:text-white"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>

            <div className={`${generatedImages[products[selectedProduct]!.id] ? 'grid lg:grid-cols-3' : 'grid lg:grid-cols-2'} h-[calc(95vh-100px)]`}>
              {/* Left: Product Image */}
              <div className="relative p-8 flex items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
                {products[selectedProduct]?.images[0] && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    className="relative"
                  >
                    <img
                      src={products[selectedProduct]!.images[0]}
                      alt={products[selectedProduct]!.title}
                      className="max-w-full max-h-[50vh] object-contain rounded-2xl shadow-2xl"
                    />
                    <div className="absolute -inset-4 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-3xl blur-xl -z-10" />
                  </motion.div>
                )}
                
                {/* Floating info pill */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="absolute top-8 left-8 glass rounded-full px-4 py-2"
                >
                  <div className="text-xs font-mono text-white/80">ORIGINAL</div>
                </motion.div>
              </div>

              {/* Center: VTON Result (when available) */}
              {generatedImages[products[selectedProduct]!.id] && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, x: 50 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ duration: 0.6 }}
                  className="relative p-8 flex items-center justify-center bg-gradient-to-br from-green-500/5 to-emerald-500/5"
                >
                  <div className="relative cursor-pointer" onClick={() => setImageEnlarged({ show: true, productId: products[selectedProduct]!.id })}>
                    <img 
                      src={generatedImages[products[selectedProduct]!.id]} 
                      alt="Try-on result" 
                      className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl hover:scale-105 transition-transform duration-300" 
                    />
                    <div className="absolute -inset-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur-xl -z-10" />
                    
                    {/* Click to enlarge hint */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                      className="absolute bottom-4 right-4 glass rounded-full p-2"
                    >
                      <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </motion.div>
                  </div>
                  
                  {/* Floating info pill */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="absolute top-8 left-8 glass-elevated rounded-full px-4 py-2 bg-green-500/20"
                  >
                    <div className="text-xs font-mono text-green-300">AI GENERATED</div>
                  </motion.div>

                  {/* Download/Share buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="absolute bottom-8 left-8 right-8 flex gap-3"
                  >
                    <motion.button
                      className="flex-1 glass-elevated rounded-xl py-3 text-sm font-medium magnetic"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Download
                    </motion.button>
                    <motion.button
                      className="flex-1 glass-elevated rounded-xl py-3 text-sm font-medium magnetic"
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Share
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}

              {/* Right: Controls */}
              <div className="p-8 flex flex-col overflow-y-auto">
                {/* Product Info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-8"
                >
                  {products[selectedProduct]?.priceText && (
                    <div className="flex items-baseline gap-3 mb-4">
                      <span className="text-3xl font-bold text-white">
                        {products[selectedProduct]!.priceText.match(/€[\d,]+/)?.[0] || products[selectedProduct]!.priceText.split(' ')[0]}
                      </span>
                      {products[selectedProduct]!.priceText.includes('Normaler Preis') && (
                        <span className="text-white/40 text-lg line-through">
                          {products[selectedProduct]!.priceText.match(/€[\d,]+/g)?.[1]}
                        </span>
                      )}
                      {products[selectedProduct]!.priceText.includes('Du sparst') && (
                        <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent text-sm font-semibold">
                          SAVE {products[selectedProduct]!.priceText.match(/\d+%/)?.[0]}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2 text-sm text-white/60">
                    <div>• Premium motorcycle jacket</div>
                    <div>• Weather resistant materials</div>
                    <div>• CE approved protection</div>
                    <div>• Bogotto engineering excellence</div>
                  </div>
                </motion.div>

                {/* Try-On Interface */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex-1 space-y-6"
                >
                  <div className="space-y-4">
                    <motion.button
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full glass-elevated rounded-2xl py-4 font-semibold magnetic transition-all ${
                        person ? 'bg-green-500/20 border-green-500/30' : ''
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {person ? '✓ Photo Selected - Change?' : '📸 Upload Your Photo'}
                    </motion.button>
                    
                    <motion.button
                      onClick={() => onSubmit(products[selectedProduct]!.id, products[selectedProduct]!.images[0])}
                      disabled={loading !== null || !person}
                      className="w-full bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl py-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/30 magnetic pulse-glow"
                      whileHover={loading === null && person ? { scale: 1.02 } : {}}
                      whileTap={loading === null && person ? { scale: 0.98 } : {}}
                    >
                      {loading === products[selectedProduct]!.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Generating Magic...
                        </div>
                      ) : person ? 
                        'Generate Virtual Try-On' : 
                        'Upload Photo to Continue'
                      }
                    </motion.button>
                  </div>

                  {/* Success State */}
                  {generatedImages[products[selectedProduct]!.id] && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="glass rounded-2xl p-6 bg-green-500/10 border-green-500/20"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-green-300 mb-2">Try-On Complete!</h3>
                        <p className="text-sm text-white/60">Your virtual try-on is displayed in the center panel. Check out how the jacket looks on you!</p>
                      </div>
                    </motion.div>
                  )}

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="glass rounded-2xl p-4 border-red-500/20 bg-red-500/10"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <div className="text-sm font-semibold text-red-300">Error</div>
                      </div>
                      <p className="text-red-300 text-sm">{error}</p>
                    </motion.div>
                  )}
                </motion.div>

                {/* Footer */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="pt-6 border-t border-white/10"
                >
                  <div className="text-xs text-white/40 text-center">
                    Powered by Gemini AI • Results are AI-generated representations
                  </div>
                </motion.div>
              </div>
            </div>
                    </motion.div>
        </motion.div>
      )}

      {/* Full-screen image overlay */}
      {imageEnlarged.show && imageEnlarged.productId && generatedImages[imageEnlarged.productId] && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/95 backdrop-blur-lg"
          onClick={() => setImageEnlarged({ show: false, productId: null })}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={generatedImages[imageEnlarged.productId!]}
              alt="Try-on result - Full size"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            />
            
            {/* Close button */}
            <motion.button
              onClick={() => setImageEnlarged({ show: false, productId: null })}
              className="absolute top-4 right-4 w-10 h-10 glass-elevated rounded-full flex items-center justify-center text-white/80 hover:text-white"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>

            {/* Download button */}
            <motion.button
              className="absolute bottom-4 left-4 glass-elevated rounded-full px-6 py-3 text-sm font-semibold magnetic"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Download Full Size
            </motion.button>

            {/* Info */}
            <div className="absolute bottom-4 right-4 glass rounded-full px-4 py-2">
              <div className="text-xs font-mono text-white/60">ESC to close</div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </main>
  );
}