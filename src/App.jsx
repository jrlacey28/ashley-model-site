import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Instagram, Mail, Menu, X, ChevronRight, ArrowLeft, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HERO_PATH = "./assets/photos/A.Wachtendonk-17.JPG";
const SHOOT_FOLDER_RE = /^(\d{4})-(\d{2})-(\d{2})-(.+)$/;
const coverRegex = /^cover\.(jpg|jpeg|png)$/i;
const PHOTO_ROOT_PREFIX = "./assets/photos/";

const photoLoaders = import.meta.glob("./assets/photos/**/*.{jpg,JPG,jpeg,png}", {
  import: "default"
});

const toTitleCase = (value) =>
  value
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const getFolderDateValue = (folderName) => {
  const match = folderName.match(SHOOT_FOLDER_RE);

  if (!match) {
    return Number.NEGATIVE_INFINITY;
  }

  const [, year, month, day] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day));
};

const LazyPhoto = React.memo(({ loader, alt, className, priority = false }) => {
  const [src, setSrc] = useState(null);
  const [shouldLoad, setShouldLoad] = useState(priority);
  const imageRef = useRef(null);

  useEffect(() => {
    if (priority || shouldLoad) {
      return undefined;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return undefined;
    }

    const node = imageRef.current;

    if (!node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [priority, shouldLoad]);

  useEffect(() => {
    if (!loader || !shouldLoad) {
      return undefined;
    }

    let isMounted = true;

    loader()
      .then((resolvedSrc) => {
        if (isMounted) {
          setSrc(resolvedSrc);
        }
      })
      .catch(() => {
        if (isMounted) {
          setSrc(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loader, shouldLoad]);

  return (
    <img
      ref={imageRef}
      src={src || undefined}
      alt={alt}
      className={className}
      loading="lazy"
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
    />
  );
});

const App = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const heroPhoto = photoLoaders[HERO_PATH];

  const { shoots, digitalImages } = useMemo(() => {
    const shootsByFolder = new Map();
    const digitals = [];

    Object.entries(photoLoaders).forEach(([path, loader]) => {
      if (path === HERO_PATH || !path.startsWith(PHOTO_ROOT_PREFIX)) {
        return;
      }

      const relativePath = path.slice(PHOTO_ROOT_PREFIX.length);
      const parts = relativePath.split("/");

      if (parts.length < 2) {
        return;
      }

      const folderName = parts[0];
      const fileName = parts[parts.length - 1];

      if (folderName.toLowerCase() === "digitals") {
        digitals.push({ fileName, loader });
        return;
      }

      if (!SHOOT_FOLDER_RE.test(folderName)) {
        return;
      }

      if (!shootsByFolder.has(folderName)) {
        shootsByFolder.set(folderName, []);
      }

      shootsByFolder.get(folderName).push({ path, fileName, loader });
    });

    const builtShoots = Array.from(shootsByFolder.entries())
      .sort(([folderA], [folderB]) => {
        const dateDiff = getFolderDateValue(folderB) - getFolderDateValue(folderA);

        if (dateDiff !== 0) {
          return dateDiff;
        }

        return folderB.localeCompare(folderA, undefined, { sensitivity: "base" });
      })
      .map(([folderName, files]) => {
        const sortedFiles = [...files].sort((a, b) =>
          a.fileName.localeCompare(b.fileName, undefined, { sensitivity: "base" })
        );

        if (sortedFiles.length === 0) {
          return null;
        }

        const coverFile = sortedFiles.find((file) => coverRegex.test(file.fileName)) || sortedFiles[0];
        const gallery = sortedFiles
          .filter((file) => file.path !== coverFile.path)
          .map((file) => file.loader);

        const match = folderName.match(SHOOT_FOLDER_RE);
        const slug = match ? match[4] : folderName;

        return {
          id: folderName,
          title: toTitleCase(slug),
          category: "Creative Shoot",
          image: coverFile.loader,
          gallery,
        };
      })
      .filter(Boolean);

    const sortedDigitals = digitals
      .sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { sensitivity: "base" }))
      .map((file) => file.loader)
      .slice(0, 3);

    return {
      shoots: builtShoots,
      digitalImages: sortedDigitals,
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      setScrolled((current) => (current === isScrolled ? current : isScrolled));
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!heroPhoto) {
    return null;
  }

  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  };

  return (
    <div className="min-h-screen bg-[#E5EAEF] text-[#1A1F2B] font-sans selection:bg-[#5F7A91] selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed w-full z-[100] transition-all duration-700 px-6 py-4 flex justify-between items-center ${scrolled || selectedProject ? 'bg-[#E5EAEF]/90 backdrop-blur-md py-3 border-b border-[#1A1F2B]/5 shadow-sm' : 'bg-transparent'}`}>
        <motion.div 
          onClick={() => setSelectedProject(null)}
          className={`text-xl font-bold tracking-[0.3em] uppercase cursor-pointer transition-colors duration-500 ${(selectedProject || scrolled) ? 'text-[#1A1F2B]' : 'text-white'}`}>
          ASHLEY WACHTENDONK
        </motion.div>
        
        <div className={`hidden md:flex gap-12 items-center text-[10px] uppercase tracking-[0.25em] font-medium transition-colors duration-500 ${(selectedProject || scrolled) ? 'text-[#1A1F2B]' : 'text-white'}`}>
          <button onClick={() => setSelectedProject(null)} className="hover:text-[#5F7A91] transition-colors">Home</button>
          <a href="#work" onClick={() => setSelectedProject(null)} className="hover:text-[#5F7A91] transition-colors">Portfolio</a>
          <a href="#contact" className="hover:text-[#5F7A91] transition-colors border-b border-current pb-1">Contact</a>
        </div>

        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`md:hidden p-2 transition-colors duration-500 ${(selectedProject || scrolled) ? 'text-[#1A1F2B]' : 'text-white'}`}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 bg-[#E5EAEF] z-[110] flex flex-col justify-center items-center gap-10"
          >
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-6 right-6 p-2 text-[#1A1F2B]"><X size={24} /></button>
            <button onClick={() => {setSelectedProject(null); setIsMenuOpen(false)}} className="text-4xl uppercase tracking-[0.2em] font-light text-[#1A1F2B]">Home</button>
            <a href="#work" onClick={() => {setSelectedProject(null); setIsMenuOpen(false)}} className="text-4xl uppercase tracking-[0.2em] font-light text-[#1A1F2B]">Portfolio</a>
            <a href="#contact" onClick={() => setIsMenuOpen(false)} className="text-4xl uppercase tracking-[0.2em] font-light text-[#1A1F2B]">Contact</a>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!selectedProject ? (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* HERO SECTION - Using User Uploaded Image Background */}
            <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#1A1F2B]">
              <div className="absolute inset-0 w-full h-full">
                <LazyPhoto
                  loader={heroPhoto}
                  alt="Ashley Wachtendonk Hero" 
                  className="w-full h-full object-cover object-[center_17%] opacity-80 brightness-[0.9] contrast-[1.05]"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#1A1F2B]/40 via-transparent to-[#1A1F2B]/60"></div>
              </div>
              <div className="relative z-10 text-center px-6">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2 }}>
                  <h1 className="text-white text-4xl md:text-8xl lg:text-9xl font-serif tracking-[0.05em] uppercase leading-none drop-shadow-2xl italic">
                    ASHLEY WACHTENDONK
                  </h1>
                  <p className="mt-4 text-white/90 text-[10px] md:text-xs uppercase tracking-[1em] font-light font-sans pl-[1em]">MODEL</p>
                  <div className="mt-14">
                    <a href="#work" className="inline-block px-12 py-3.5 border border-white/50 text-white rounded-full text-[10px] uppercase tracking-[0.4em] hover:bg-white hover:text-[#1A1F2B] transition-all duration-500 backdrop-blur-sm">View Work</a>
                  </div>
                </motion.div>
              </div>
              <div className="absolute bottom-8 w-full px-10 flex justify-between items-end text-white/60 text-[9px] uppercase tracking-[0.3em]">
                <div className="hidden md:block">BASED IN MILWAUKEE/CHICAGO</div>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-[1px] h-14 bg-white/20"></div>
                </div>
                <div className="hidden md:block">© 2026 ALL RIGHTS RESERVED</div>
              </div>
            </section>

            {/* PORTFOLIO GRID */}
            <section id="work" className="py-24 px-6 max-w-7xl mx-auto">
              <motion.div {...fadeUp} className="mb-16">
                <span className="text-[10px] uppercase tracking-[0.5em] text-[#5F7A91] mb-4 block font-bold">Selection</span>
                <h2 className="text-4xl md:text-5xl font-serif italic tracking-widest text-[#1A1F2B]">Portfolio & Work</h2>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-y-16">
                {shoots.map((item, index) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: (index % 3) * 0.1 }}
                    viewport={{ once: true }}
                    onClick={() => {
                      setSelectedProject(item);
                      window.scrollTo(0, 0);
                    }}
                    className={`group cursor-pointer ${index % 2 !== 0 ? 'md:mt-12' : ''}`}
                  >
                    <div className="relative overflow-hidden aspect-[4/5] bg-[#CED6DE] mb-6 shadow-sm">
                      <LazyPhoto loader={item.image} alt={item.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-[#1A1F2B]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                        <span className="text-white text-[9px] uppercase tracking-[0.4em] border border-white/40 px-6 py-2 rounded-full backdrop-blur-md">View Shoot</span>
                      </div>
                    </div>
                    <h3 className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] font-bold text-[#1A1F2B] mb-1">{item.title}</h3>
                    <p className="text-[9px] uppercase tracking-[0.2em] text-[#5F7A91]">{item.category}</p>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* MEASUREMENTS - MATCHING SCREENSHOT 2 LAYOUT */}
            <section className="py-24 bg-[#1A1F2B] text-white">
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column Stats */}
                  <div className="lg:col-span-5 pt-8">
                    <motion.div {...fadeUp}>
                      <div className="flex items-center gap-6 mb-20">
                        <div className="w-[1px] h-12 bg-[#5F7A91]"></div>
                        <h2 className="text-4xl font-light tracking-[0.1em] uppercase">Measurements</h2>
                      </div>

                      <div className="grid grid-cols-2 gap-x-12 gap-y-16">
                        {[
                          { label: 'Height', value: "5'8\" / 173cm" },
                          { label: 'Bust', value: '32" / 81cm' },
                          { label: 'Waist', value: '25" / 63cm' },
                          { label: 'Hips', value: '35.5" / 90cm' },
                          { label: 'Eyes', value: 'Blue-Green-Grey' },
                          { label: 'Shoe', value: '7.5 US / 38 EU' },
                          { label: 'Hair', value: 'Dark Blonde' }
                        ].map((stat, i) => (
                          <div key={i} className="space-y-4">
                            <p className="text-[10px] uppercase tracking-[0.5em] text-white/30 font-bold">{stat.label}</p>
                            <p className="text-xl md:text-2xl font-serif italic tracking-tight text-[#CED6DE]">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  {/* Right Column Digitals Grid */}
                  <div className="lg:col-span-7 mt-12 lg:mt-0">
                    <div className="flex justify-between items-end mb-6 px-1">
                      <span className="text-[10px] uppercase tracking-[0.5em] text-white/40 font-bold">Digitals</span>
                      <span className="text-[10px] uppercase tracking-[0.5em] text-white/10 font-bold">Raw & Unedited</span>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2 }}
                        viewport={{ once: true }}
                        className="aspect-[4/5] md:aspect-[3/4] bg-white/5 overflow-hidden"
                      >
                        {digitalImages[0] && (
                          <LazyPhoto loader={digitalImages[0]} className="w-full h-full object-cover grayscale opacity-80 hover:opacity-100 transition-opacity duration-700" alt="Ashley Digital" />
                        )}
                      </motion.div>

                      <div className="grid grid-rows-2 gap-6">
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          viewport={{ once: true }}
                          className="aspect-square bg-white/5 overflow-hidden"
                        >
                          {digitalImages[1] && (
                            <LazyPhoto loader={digitalImages[1]} className="w-full h-full object-cover grayscale opacity-70 hover:opacity-100 transition-opacity duration-700" alt="Ashley Profile" />
                          )}
                        </motion.div>
                        <motion.div 
                          initial={{ opacity: 0, x: 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.8, delay: 0.4 }}
                          viewport={{ once: true }}
                          className="aspect-square bg-white/5 overflow-hidden"
                        >
                          {digitalImages[2] && (
                            <LazyPhoto loader={digitalImages[2]} className="w-full h-full object-cover grayscale opacity-70 hover:opacity-100 transition-opacity duration-700" alt="Ashley Full Body" />
                          )}
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* FOOTER */}
            <footer id="contact" className="py-40 px-6 bg-[#E5EAEF] text-center">
              <motion.div {...fadeUp} className="max-w-5xl mx-auto">
                <span className="text-[10px] uppercase tracking-[0.8em] text-[#5F7A91] block mb-12 font-bold">Booking</span>
                <a href="mailto:wachtendonkashley@gmail.com" className="text-4xl md:text-7xl lg:text-7xl font-serif italic hover:text-[#5F7A91] transition-all duration-700 tracking-tighter block mb-20 text-[#1A1F2B]">wachtendonkashley@gmail.com</a>
                <div className="flex justify-center gap-12 text-[10px] uppercase tracking-[0.5em] font-bold">
                  <a href="https://www.instagram.com/ajmwachtendonk/" className="hover:text-[#5F7A91]">Instagram</a>
                </div>
              </motion.div>
            </footer>
          </motion.div>
        ) : (
          /* PROJECT DETAIL VIEW */
          <motion.div 
            key="project" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }}
            className="pt-24 pb-32 min-h-screen bg-white"
          >
            <div className="max-w-7xl mx-auto px-6">
              <button 
                onClick={() => setSelectedProject(null)}
                className="flex items-center gap-4 text-[10px] uppercase tracking-[0.4em] font-bold mb-16 hover:text-[#5F7A91] transition-colors group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-2 transition-transform" /> Back to Portfolio
              </button>

              <div className="grid lg:grid-cols-12 gap-16 mb-24">
                <div className="lg:col-span-5">
                  <span className="text-[10px] uppercase tracking-[0.5em] text-[#5F7A91] mb-4 block font-bold">Creative Shoot</span>
                  <h2 className="text-5xl md:text-7xl font-serif italic mb-8 text-[#1A1F2B]">{selectedProject.title}</h2>
                  <p className="text-lg opacity-60 leading-relaxed font-light mb-12">
                    A cinematic exploration of {selectedProject.category.toLowerCase()} aesthetics.
                  </p>
                  <div className="grid grid-cols-2 gap-8 text-[9px] uppercase tracking-[0.3em]">
                    <div>
                      <p className="opacity-40 mb-1">Photography</p>
                      <p className="font-bold font-serif">Studio Noir</p>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-7 aspect-video bg-[#E5EAEF]">
                  <LazyPhoto loader={selectedProject.image} className="w-full h-full object-cover shadow-2xl" alt={selectedProject.title} />
                </div>
              </div>

              {/* Shoot Gallery */}
              <div className="space-y-24 max-w-5xl mx-auto">
                {selectedProject.gallery.length > 0 ? selectedProject.gallery.map((loader, i) => (
                  <motion.div 
                    key={i} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="w-full overflow-hidden"
                  >
                    <LazyPhoto loader={loader} className="w-full h-auto object-cover grayscale hover:grayscale-0 transition-all duration-1000" alt={`Shoot view ${i}`} />
                  </motion.div>
                )) : (
                  <div className="py-40 text-center opacity-20 uppercase tracking-[0.5em] text-sm italic">Gallery images loading</div>
                )}
              </div>
              
              <div className="mt-32 pt-24 border-t border-black/5 text-center">
                 <button 
                  onClick={() => setSelectedProject(null)}
                  className="px-12 py-4 border border-black/20 rounded-full text-[10px] uppercase tracking-[0.4em] hover:bg-black hover:text-white transition-all"
                >
                  Return to Portfolio
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
