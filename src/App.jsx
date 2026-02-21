import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Menu, X, ArrowLeft } from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, EffectCreative, EffectFade, Navigation, Pagination } from 'swiper/modules';
import { DEFAULT_PROJECT_CONTENT, PROJECT_CONTENT } from './projectContent';
import 'swiper/css';
import 'swiper/css/effect-creative';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const HERO_PATH = "./assets/photos/A.Wachtendonk-17.JPG";
const SHOOT_FOLDER_RE = /^(\d{4})-(\d{2})-(\d{2})-(.+)$/;
const coverRegex = /^cover\.(jpg|jpeg|png)$/i;
const PHOTO_ROOT_PREFIX = "./assets/photos/";
const PROJECT_PATH_PREFIX = "/portfolio/";

const photoLoaders = import.meta.glob("./assets/photos/**/*.{jpg,JPG,jpeg,png}", {
  import: "default"
});

const toTitleCase = (value) =>
  value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const toCounterValue = (value) => value.toString().padStart(2, "0");

const toRouteSlug = (value) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizePathname = (value) => {
  if (!value || value === "/") {
    return "/";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
};

const getProjectSlugFromPathname = (pathname) => {
  const match = pathname.match(/^\/portfolio\/([^/]+)\/?$/);

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]).toLowerCase();
  } catch {
    return match[1].toLowerCase();
  }
};

const getProjectPath = (projectSlug) => `${PROJECT_PATH_PREFIX}${encodeURIComponent(projectSlug)}`;

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
  const [shouldLoad, setShouldLoad] = useState(() => priority || typeof IntersectionObserver === 'undefined');
  const imageRef = useRef(null);

  useEffect(() => {
    if (priority || shouldLoad) {
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
  const [pathname, setPathname] = useState(() => normalizePathname(window.location.pathname));
  const [pendingSectionId, setPendingSectionId] = useState(null);
  const [activeWorkIndex, setActiveWorkIndex] = useState(0);
  const [workOrientations, setWorkOrientations] = useState({});
  const workMainSwiperRef = useRef(null);
  const workBgSwiperRef = useRef(null);

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
        const backgroundImage = gallery[0] || coverFile.loader;

        const match = folderName.match(SHOOT_FOLDER_RE);
        const folderSlug = match ? match[4] : folderName;
        const routeSlug = toRouteSlug(folderSlug);
        const projectContent = PROJECT_CONTENT[routeSlug] ?? {};
        const title = projectContent.title ?? toTitleCase(folderSlug);
        const category = projectContent.category ?? DEFAULT_PROJECT_CONTENT.category;
        const header = projectContent.header ?? category ?? DEFAULT_PROJECT_CONTENT.header;
        const subtext = projectContent.subtext ?? DEFAULT_PROJECT_CONTENT.subtext;
        const description = projectContent.description ?? DEFAULT_PROJECT_CONTENT.description;

        return {
          id: folderName,
          routeSlug,
          title,
          header,
          subtext,
          category,
          description,
          image: coverFile.loader,
          backgroundImage,
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

  const isProjectRoute = pathname.startsWith(PROJECT_PATH_PREFIX);
  const routeProjectSlug = useMemo(() => getProjectSlugFromPathname(pathname), [pathname]);
  const selectedProject = useMemo(() => {
    if (!routeProjectSlug) {
      return null;
    }

    return shoots.find((item) => item.routeSlug === routeProjectSlug) ?? null;
  }, [shoots, routeProjectSlug]);

  useEffect(() => {
    const handlePopState = () => {
      setPathname(normalizePathname(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!pendingSectionId || pathname !== "/") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      const section = document.getElementById(pendingSectionId);

      if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      setPendingSectionId(null);
    }, 80);

    return () => window.clearTimeout(timeoutId);
  }, [pathname, pendingSectionId]);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      setScrolled((current) => (current === isScrolled ? current : isScrolled));
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (shoots.length === 0) {
      return undefined;
    }

    let isMounted = true;

    const resolveOrientation = async () => {
      const orientationEntries = await Promise.all(
        shoots.map(async (item) => {
          try {
            const src = await item.image();
            const orientation = await new Promise((resolve) => {
              const probeImage = new Image();
              probeImage.onload = () => {
                resolve(probeImage.naturalWidth > probeImage.naturalHeight ? "landscape" : "portrait");
              };
              probeImage.onerror = () => resolve("portrait");
              probeImage.src = src;
            });

            return [item.id, orientation];
          } catch {
            return [item.id, "portrait"];
          }
        })
      );

      if (isMounted) {
        setWorkOrientations(Object.fromEntries(orientationEntries));
      }
    };

    resolveOrientation();

    return () => {
      isMounted = false;
    };
  }, [shoots]);

  const refreshWorkSliderLayout = (swiper) => {
    if (!swiper) {
      return;
    }

    const targetIndex = Number.isFinite(swiper.realIndex) ? swiper.realIndex : swiper.activeIndex || 0;
    swiper.update();
    swiper.slideTo(targetIndex, 0, false);
  };

  useEffect(() => {
    const swiper = workMainSwiperRef.current;

    if (!swiper || shoots.length === 0) {
      return undefined;
    }

    const rafId = window.requestAnimationFrame(() => {
      refreshWorkSliderLayout(swiper);
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [workOrientations, shoots.length]);

  const navigateTo = (nextPath, options = {}) => {
    const { replace = false } = options;
    const normalizedPath = normalizePathname(nextPath);
    const currentPath = normalizePathname(window.location.pathname);

    if (currentPath !== normalizedPath) {
      const historyMethod = replace ? "replaceState" : "pushState";
      window.history[historyMethod](null, "", normalizedPath);
    }

    setPathname(normalizedPath);
  };

  const goHome = () => {
    setPendingSectionId(null);
    setIsMenuOpen(false);
    navigateTo("/");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToSection = (sectionId) => {
    setIsMenuOpen(false);

    if (pathname !== "/") {
      if (sectionId === "work" && selectedProject) {
        const selectedIndex = shoots.findIndex((item) => item.id === selectedProject.id);

        if (selectedIndex >= 0) {
          setActiveWorkIndex(selectedIndex);
        }
      }

      setPendingSectionId(sectionId);
      navigateTo("/");
      return;
    }

    setPendingSectionId(null);
    const section = document.getElementById(sectionId);

    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const getValidSwiperIndex = (swiper) => {
    if (shoots.length === 0) {
      return -1;
    }

    const realIndex = Number.isFinite(swiper?.realIndex) ? swiper.realIndex : Number.NaN;
    const activeIndex = Number.isFinite(swiper?.activeIndex) ? swiper.activeIndex : Number.NaN;
    const fallbackIndex = Number.isFinite(activeWorkIndex) ? activeWorkIndex : 0;
    const resolvedIndex = Number.isFinite(realIndex)
      ? realIndex
      : Number.isFinite(activeIndex)
        ? activeIndex
        : fallbackIndex;

    return ((resolvedIndex % shoots.length) + shoots.length) % shoots.length;
  };

  const openProject = (project) => {
    if (!project) {
      return;
    }

    setPendingSectionId(null);
    setIsMenuOpen(false);
    navigateTo(getProjectPath(project.routeSlug));
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const openActiveProject = () => {
    const slideIndex = getValidSwiperIndex(workMainSwiperRef.current);

    if (slideIndex < 0) {
      return;
    }

    openProject(shoots[slideIndex]);
  };

  const handleWorkSlideChange = (swiper) => {
    const nextIndex = getValidSwiperIndex(swiper);

    if (nextIndex < 0) {
      return;
    }

    setActiveWorkIndex(nextIndex);

    if (!workBgSwiperRef.current || workBgSwiperRef.current.activeIndex === nextIndex) {
      return;
    }

    workBgSwiperRef.current.slideTo(nextIndex);
  };

  if (!heroPhoto) {
    return null;
  }

  const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  };

  const safeWorkIndex = shoots.length > 0 && Number.isFinite(activeWorkIndex)
    ? ((activeWorkIndex % shoots.length) + shoots.length) % shoots.length
    : 0;
  const activeWorkProject = shoots[safeWorkIndex];
  const currentWorkCounter = shoots.length > 0 ? toCounterValue(safeWorkIndex + 1) : "00";
  const totalWorkCounter = toCounterValue(shoots.length);
  const selectedProjectOrientation = selectedProject ? workOrientations[selectedProject.id] ?? "landscape" : "landscape";
  const isSelectedProjectPortrait = selectedProjectOrientation === "portrait";

  return (
    <div className="min-h-screen bg-[#E5EAEF] text-[#1A1F2B] font-sans selection:bg-[#5F7A91] selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className={`fixed w-full z-[100] transition-all duration-700 px-6 py-4 flex justify-between items-center ${scrolled || isProjectRoute ? 'bg-[#E5EAEF]/90 backdrop-blur-md py-3 border-b border-[#1A1F2B]/5 shadow-sm' : 'bg-transparent'}`}>
        <Motion.div 
          onClick={goHome}
          className={`flex-1 min-w-0 pr-4 text-[0.7rem] sm:text-[0.78rem] md:text-xl font-bold tracking-[0.16em] md:tracking-[0.3em] whitespace-nowrap uppercase cursor-pointer transition-all duration-500 ${(isProjectRoute || scrolled) ? 'text-[#1A1F2B] opacity-100 pointer-events-auto' : 'text-white opacity-0 pointer-events-none'}`}>
          ASHLEY WACHTENDONK
        </Motion.div>
        
        <div className={`hidden md:flex gap-12 items-center text-[15px] uppercase tracking-[0.25em] font-medium transition-colors duration-500 ${(isProjectRoute || scrolled) ? 'text-[#1A1F2B]' : 'text-white'}`}>
          <button onClick={goHome} className="hover:text-[#5F7A91] transition-colors">HOME</button>
          <button onClick={() => goToSection("work")} className="hover:text-[#5F7A91] transition-colors">Portfolio</button>
          <button onClick={() => goToSection("contact")} className="hover:text-[#5F7A91] transition-colors">Contact</button>
        </div>

        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`md:hidden ml-2 shrink-0 p-2 transition-colors duration-500 ${(isProjectRoute || scrolled) ? 'text-[#1A1F2B]' : 'text-white'}`}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <Motion.div 
            initial={{ y: "-100%" }} animate={{ y: 0 }} exit={{ y: "-100%" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 bg-[#E5EAEF] z-[110] flex flex-col justify-center items-center gap-10"
          >
            <button onClick={() => setIsMenuOpen(false)} className="absolute top-6 right-6 p-2 text-[#1A1F2B]"><X size={24} /></button>
            <button onClick={goHome} className="text-4xl uppercase tracking-[0.2em] font-light text-[#1A1F2B]">Home</button>
            <button onClick={() => goToSection("work")} className="text-4xl uppercase tracking-[0.2em] font-light text-[#1A1F2B]">Portfolio</button>
            <button onClick={() => goToSection("contact")} className="text-4xl uppercase tracking-[0.2em] font-light text-[#1A1F2B]">Contact</button>
          </Motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!isProjectRoute ? (
          <Motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* HERO SECTION - Using User Uploaded Image Background */}
            <section className="relative h-screen w-full flex items-center justify-center overflow-hidden bg-[#1A1F2B]">
              <div className="absolute inset-0 w-full h-full">
                <LazyPhoto
                  loader={heroPhoto}
                  alt="Ashley Wachtendonk Hero" 
                  className="w-full h-full object-cover object-[center_3%] opacity-100 brightness-[0.9] contrast-[1.05]"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#1A1F2B]/40 via-transparent to-[#1A1F2B]/60"></div>
              </div>
              <div className="relative z-10 text-center px-6">
                <Motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2 }}>
                  <h1 className="text-white text-4xl md:text-8xl lg:text-8xl font-tt-commons-expanded-thin tracking-tighter uppercase leading-none drop-shadow-2xl">
                    ASHLEY WACHTENDONK
                  </h1>
                  <p className="mt-4 text-white/90 text-[10px] md:text-xs uppercase tracking-[1em] font-light font-sans pl-[1em]">MODEL / ARCHITECT</p>
              
                </Motion.div>
              </div>
              <div className="absolute bottom-8 w-full px-10 flex justify-between items-end text-white/60 text-[9px] uppercase tracking-[0.3em]">
                <div className="hidden md:block">BASED IN MILWAUKEE/CHICAGO</div>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-[1px] h-14 bg-white/20"></div>
                </div>
                <div className="hidden md:block">© 2026 ALL RIGHTS RESERVED</div>
              </div>
            </section>

            {/* PORTFOLIO SLIDER */}
            <section id="work" className="work-slider-section">
              <div className="work-slider-shell">
                <div className="work-slider-bg">
                  <Swiper
                    className="work-slider-bg-swiper"
                    modules={[EffectFade, A11y]}
                    effect="fade"
                    fadeEffect={{ crossFade: true }}
                    speed={1250}
                    allowTouchMove={false}
                    onSwiper={(swiper) => {
                      workBgSwiperRef.current = swiper;
                      const initialIndex = Math.min(activeWorkIndex, Math.max(shoots.length - 1, 0));

                      if (initialIndex > 0) {
                        swiper.slideTo(initialIndex, 0, false);
                      }
                    }}
                  >
                    {shoots.map((item, index) => (
                      <SwiperSlide key={`${item.id}-bg`}>
                        <LazyPhoto
                          loader={item.backgroundImage}
                          alt={`${item.title} background`}
                          className="work-slider-bg-image"
                          priority={index === 0}
                        />
                      </SwiperSlide>
                    ))}
                  </Swiper>
                  <div className="work-slider-bg-overlay" />
                </div>

                <div className="work-slider-content">
                  <Motion.div {...fadeUp} className="work-slider-head">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.5em] text-[#5F7A91] mb-4 block font-bold">Selection</span>
                      <h2 className="text-4xl md:text-5xl font-tt-commons-expanded-thin tracking-tighter text-[#1A1F2B]">
                        Portfolio & Work
                      </h2>
                    </div>
                    <div className="work-slider-counter text-[#1A1F2B]">
                      <span className="font-tt-commons-expanded-thin">{currentWorkCounter}</span>
                      <span className="opacity-50">/</span>
                      <span className="opacity-70">{totalWorkCounter}</span>
                    </div>
                  </Motion.div>

                  <div className="work-slider-main-wrap">
                    <Swiper
                      className="work-slider-main"
                      modules={[EffectCreative, Navigation, Pagination, A11y]}
                      effect="creative"
                      speed={1250}
                      rewind={shoots.length > 1}
                      loop={false}
                      centeredSlides
                      centeredSlidesBounds={false}
                      slidesPerView="auto"
                      grabCursor={shoots.length > 1}
                      simulateTouch={shoots.length > 1}
                      allowTouchMove={shoots.length > 1}
                      preventClicks
                      preventClicksPropagation
                      touchStartPreventDefault={false}
                      threshold={8}
                      watchSlidesProgress
                      creativeEffect={{
                        prev: {
                          translate: ['-120%', 0, -500],
                          opacity: 0
                        },
                        next: {
                          translate: ['120%', 0, -500],
                          opacity: 0
                        }
                      }}
                      navigation={{
                        prevEl: '.work-slider-prev',
                        nextEl: '.work-slider-next'
                      }}
                      pagination={{
                        el: '.work-slider-pagination',
                        clickable: true,
                        bulletClass: 'work-slider-bullet',
                        bulletActiveClass: 'is-active'
                      }}
                      onResize={(swiper) => refreshWorkSliderLayout(swiper)}
                      onSwiper={(swiper) => {
                        workMainSwiperRef.current = swiper;
                        refreshWorkSliderLayout(swiper);
                        const initialIndex = Math.min(activeWorkIndex, Math.max(shoots.length - 1, 0));

                        if (initialIndex > 0) {
                          swiper.slideTo(initialIndex, 0, false);
                        }

                        setActiveWorkIndex(initialIndex);
                      }}
                      onSlideChange={handleWorkSlideChange}
                      onTap={(swiper, event) => {
                        const target = event?.target;

                        if (!(target instanceof Element)) {
                          return;
                        }

                        if (!target.closest(".work-slider-card, .work-slider-view-btn, .work-slider-cover-hit")) {
                          return;
                        }

                        const tappedIndex = getValidSwiperIndex(swiper);

                        if (tappedIndex < 0) {
                          return;
                        }

                        openProject(shoots[tappedIndex]);
                      }}
                    >
                      {shoots.map((item) => (
                        <SwiperSlide
                          key={item.id}
                          className={`work-slider-main-slide ${workOrientations[item.id] === 'landscape' ? 'is-landscape' : ''}`}
                        >
                          {({ isActive }) => (
                            <div className="work-slider-slide-stack">
                              <button
                                type="button"
                                className="work-slider-card group block"
                                onClick={() => openProject(item)}
                                aria-label={`Open ${item.title}`}
                              >
                                <LazyPhoto loader={item.image} alt={item.title} className="work-slider-main-image" />
                              </button>
                              <button
                                type="button"
                                className={`work-slider-view-btn swiper-no-swiping text-white text-[9px] uppercase tracking-[0.4em] border border-white/40 px-5 py-2 backdrop-blur-md ${isActive ? 'is-active' : ''}`}
                                onClick={() => openProject(item)}
                                aria-label={`View photos for ${item.title}`}
                              >
                                View Photos
                              </button>
                            </div>
                          )}
                        </SwiperSlide>
                      ))}
                    </Swiper>
                    {activeWorkProject && (
                      <button
                        type="button"
                        className={`work-slider-cover-hit ${workOrientations[activeWorkProject.id] === 'landscape' ? 'is-landscape' : ''}`}
                        onClick={openActiveProject}
                        aria-label={`Open ${activeWorkProject.title}`}
                      />
                    )}
                  </div>

                  <div className="work-slider-bottom">
                    {activeWorkProject && (
                      <div className="work-slider-project-meta">
                        <h3 className="text-sm md:text-lg uppercase tracking-[0.3em] font-bold text-[#1A1F2B] mb-2">
                          {activeWorkProject.title}
                        </h3>
                        <p className="text-[11px] md:text-sm uppercase tracking-[0.26em] text-[#5F7A91] font-medium">
                          {activeWorkProject.category}
                        </p>
                      </div>
                    )}
                    <div className="work-slider-controls">
                      <div className="work-slider-btn-wrap">
                        <button type="button" className="work-slider-btn work-slider-prev">Prev</button>
                        <button type="button" className="work-slider-btn work-slider-next">Next</button>
                      </div>
                      <div className="work-slider-pagination" />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* MEASUREMENTS - MATCHING SCREENSHOT 2 LAYOUT */}
            <section className="py-24 bg-[#1A1F2B] text-white">
              <div className="max-w-7xl mx-auto px-6">
                <div className="grid lg:grid-cols-12 gap-8 items-start">
                  
                  {/* Left Column Stats */}
                  <div className="lg:col-span-5 pt-8">
                    <Motion.div {...fadeUp}>
                      <div className="flex items-center gap-6 mb-20">
                        <div className="w-[1px] h-12 bg-[#5F7A91]"></div>
                        <h2 className="text-4xl font-tt-commons-expanded-thin tracking-tighter uppercase">Measurements</h2>
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
                            <p className="text-[10px] uppercase tracking-[0.5em] text-white/30 font-tt-commons-expanded-thin">{stat.label}</p>
                            <p className="text-xl md:text-2xl font-tt-commons-expanded-thin tracking-tight text-[#CED6DE]">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </Motion.div>
                  </div>

                  {/* Right Column Digitals Grid */}
                  <div className="lg:col-span-7 mt-12 lg:mt-0">
                    <div className="flex justify-between items-end mb-6 px-1">
                      <span className="text-[10px] uppercase tracking-[0.5em] text-white/40 font-bold">Digitals</span>
                      <span className="text-[10px] uppercase tracking-[0.5em] text-white/10 font-bold">Raw & Unedited</span>
                    </div>

                    <div className="grid grid-cols-2 grid-rows-2 gap-6">
                      <Motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2 }}
                        viewport={{ once: true }}
                        className="row-span-2 bg-white/5 overflow-hidden"
                      >
                        {digitalImages[0] && (
                          <LazyPhoto loader={digitalImages[0]} className="w-full h-full object-cover object-center hover:opacity-100 transition-opacity duration-700" alt="Ashley Digital" />
                        )}
                      </Motion.div>
                      <Motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        viewport={{ once: true }}
                        className="aspect-square bg-white/5 overflow-hidden"
                      >
                        {digitalImages[1] && (
                          <LazyPhoto loader={digitalImages[1]} className="w-full h-full object-cover object-[center_25%] hover:opacity-100 transition-opacity duration-700" alt="Ashley Profile" />
                        )}
                      </Motion.div>
                      <Motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        viewport={{ once: true }}
                        className="aspect-square bg-white/5 overflow-hidden"
                      >
                        {digitalImages[2] && (
                          <LazyPhoto loader={digitalImages[2]} className="w-full h-full object-cover object-[center_25%] hover:opacity-100 transition-opacity duration-700" alt="Ashley Full Body" />
                        )}
                      </Motion.div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* FOOTER */}
            <footer id="contact" className="py-40 px-6 bg-[#E5EAEF] text-center">
              <Motion.div {...fadeUp} className="max-w-5xl mx-auto">
                <span className="text-[10px] uppercase tracking-[0.8em] text-[#5F7A91] block mb-12 font-bold">Booking</span>
                <a href="mailto:wachtendonkashley@gmail.com" className="max-w-full px-1 text-[clamp(0.84rem,4vw,1.08rem)] md:text-7xl lg:text-7xl font-tt-commons-expanded-thin hover:text-[#5F7A91] transition-all duration-700 tracking-[0.02em] md:tracking-tighter block mb-20 text-[#1A1F2B] [overflow-wrap:anywhere]">wachtendonkashley@gmail.com</a>
                <div className="flex justify-center gap-12 text-[10px] uppercase tracking-[0.5em] font-tt-commons-expanded-thin">
                  <a href="https://www.instagram.com/ajmwachtendonk/" className="hover:text-[#5F7A91]">Instagram</a>
                </div>
              </Motion.div>
            </footer>
          </Motion.div>
        ) : selectedProject ? (
          /* PROJECT DETAIL VIEW */
          <Motion.div 
            key={selectedProject.routeSlug} initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }}
            className="pt-24 pb-32 min-h-screen bg-white"
          >
            <div className="max-w-7xl mx-auto px-6">
              <button 
                onClick={() => goToSection("work")}
                className="flex items-center gap-4 text-[10px] uppercase tracking-[0.4em] font-bold mb-16 hover:text-[#5F7A91] transition-colors group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-2 transition-transform" /> Back to Portfolio
              </button>

              <div className="grid lg:grid-cols-12 gap-16 mb-24">
                <div className="lg:col-span-5">
                  <span className="text-[10px] uppercase tracking-[0.5em] text-[#5F7A91] mb-4 block font-bold">{selectedProject.header}</span>
                  <h2 className="text-5xl md:text-7xl font-serif italic mb-8 text-[#1A1F2B]">{selectedProject.title}</h2>
                  <p className="text-[10px] uppercase tracking-[0.36em] text-[#5F7A91] font-bold mb-6">
                    {selectedProject.subtext}
                  </p>
                  <p className="text-lg opacity-60 leading-relaxed font-light mb-12">
                    {selectedProject.description}
                  </p>
                </div>
                <div
                  className={`lg:col-span-7 bg-[#E5EAEF] ${
                    isSelectedProjectPortrait
                      ? "aspect-[3/4] w-full max-w-[30rem] mx-auto lg:mx-0 lg:ml-auto"
                      : "aspect-video"
                  }`}
                >
                  <LazyPhoto
                    loader={selectedProject.image}
                    className={`w-full h-full shadow-2xl ${isSelectedProjectPortrait ? "object-contain" : "object-cover"}`}
                    alt={selectedProject.title}
                  />
                </div>
              </div>

              {/* Shoot Gallery */}
              <div className="columns-2 gap-6 md:gap-10 max-w-6xl mx-auto">
                {selectedProject.gallery.length > 0 ? selectedProject.gallery.map((loader, i) => (
                  <Motion.div
                    key={i}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-6 md:mb-10 break-inside-avoid overflow-hidden"
                  >
                    <LazyPhoto
                      loader={loader}
                      className="w-full h-auto object-cover"
                      alt={`${selectedProject.title} view ${i + 1}`}
                    />
                  </Motion.div>
                )) : (
                  <div className="py-40 text-center opacity-20 uppercase tracking-[0.5em] text-sm italic">Gallery images loading</div>
                )}
              </div>
              
              <div className="mt-32 pt-24 border-t border-black/5 text-center">
                 <button 
                  onClick={() => goToSection("work")}
                  className="px-12 py-4 border border-black/20 rounded-full text-[10px] uppercase tracking-[0.4em] hover:bg-black hover:text-white transition-all"
                >
                  Return to Portfolio
                </button>
              </div>
            </div>
          </Motion.div>
        ) : (
          <Motion.div
            key="project-not-found"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="pt-24 pb-32 min-h-screen bg-white"
          >
            <div className="max-w-3xl mx-auto px-6 text-center">
              <h2 className="text-4xl md:text-6xl font-serif italic mb-8 text-[#1A1F2B]">Project Not Found</h2>
              <p className="text-lg opacity-60 leading-relaxed font-light mb-12">
                The requested portfolio page does not exist.
              </p>
              <button
                onClick={() => goToSection("work")}
                className="px-12 py-4 border border-black/20 rounded-full text-[10px] uppercase tracking-[0.4em] hover:bg-black hover:text-white transition-all"
              >
                Return to Portfolio
              </button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
