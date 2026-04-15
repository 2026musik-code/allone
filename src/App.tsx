import React, { useState, useEffect, useRef } from "react";
import { Search, Settings, Loader2, AlertCircle, X, Play, Image as ImageIcon, ShoppingBag, Store, MapPin, ArrowLeft, LayoutGrid, Plus, Download, Link as LinkIcon, Music, Video, Youtube, Shield, User, Crown, Moon, Sun, CheckCircle2, Pause, FastForward, Rewind, SkipForward } from "lucide-react";
import AdminPanel from "./AdminPanel";
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { useTheme } from './hooks/useTheme';

const ImageWithFallback = ({ src, alt, className }: { src: string, alt: string, className: string }) => {
  const [errorCount, setErrorCount] = useState(0);

  if (!src || errorCount >= 2) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  // Proactively proxy .heic images since browsers don't support them
  const isHeic = src.includes('.heic');
  const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(src)}&output=webp`;
  
  const currentSrc = (errorCount === 0 && !isHeic) ? src : proxyUrl;

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setErrorCount(prev => prev + 1)}
    />
  );
};

export default function App() {
  // Simple routing
  if (window.location.pathname === '/admin') {
    return <AdminPanel />;
  }

  const [apiKey, setApiKey] = useState("");
  const [currentView, setCurrentView] = useState<"home" | "gimage" | "tokopedia" | "downloader" | "tiktok" | "melolo" | "youtube">(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currentView');
      if (saved && ["home", "gimage", "tokopedia", "downloader", "tiktok", "melolo", "youtube"].includes(saved)) {
        return saved as any;
      }
    }
    return "home";
  });

  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);
  
  // Rate limiting state
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [userLimit, setUserLimit] = useState<number>(100);
  const [requestCount, setRequestCount] = useState<number>(0);
  
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchGlobalApiKey = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setApiKey(docSnap.data().apiKey || "dedi131");
        } else {
          setApiKey("dedi131");
        }
      } catch (err) {
        console.error("Error fetching API key:", err);
        setApiKey("dedi131"); // Fallback
      }
    };
    fetchGlobalApiKey();

    const initVisitor = async () => {
      try {
        // Get IP
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        const ip = data.ip;
        const id = ip.replace(/\./g, '_').replace(/:/g, '_');
        setVisitorId(id);

        const docRef = doc(db, 'visitors', id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          await setDoc(docRef, {
            ip,
            userAgent: navigator.userAgent,
            lastSeen: Date.now(),
            requestCount: 0,
            limit: 100
          });
          setUserLimit(100);
          setRequestCount(0);
        } else {
          const data = docSnap.data();
          setUserLimit(data.limit);
          setRequestCount(data.requestCount);
          await updateDoc(docRef, {
            lastSeen: Date.now(),
            userAgent: navigator.userAgent
          });
        }
      } catch (err) {
        console.error("Error initializing visitor tracking:", err);
      }
    };
    initVisitor();
  }, []);

  const checkRateLimit = async (): Promise<boolean> => {
    if (!visitorId) return true; // Fail open if tracking fails
    try {
      const docRef = doc(db, 'visitors', visitorId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserLimit(data.limit);
        setRequestCount(data.requestCount);
        
        if (data.limit > 0 && data.requestCount >= data.limit) {
          setRateLimitError("Limit request tercapai. Silakan hubungi admin.");
          return false;
        }
        await updateDoc(docRef, {
          requestCount: increment(1),
          lastSeen: Date.now()
        });
        setRequestCount(prev => prev + 1);
      }
      return true;
    } catch (err) {
      console.error("Error checking rate limit:", err);
      return true;
    }
  };

  // Separate query states for each tab
  const [gimageQuery, setGimageQuery] = useState("Cewek cantik");
  const [tokopediaQuery, setTokopediaQuery] = useState("hp");
  const [downloaderQuery, setDownloaderQuery] = useState("https://vt.tiktok.com/ZS6EMauTA/");
  const [tiktokQuery, setTiktokQuery] = useState("pargoy");
  const [meloloQuery, setMeloloQuery] = useState("");
  const [youtubeQuery, setYoutubeQuery] = useState("trending indonesia");
  
  const [results, setResults] = useState<any[]>([]);
  const [meloloCategoriesData, setMeloloCategoriesData] = useState<{category: string, items: any[]}[]>([]);
  const [downloaderResult, setDownloaderResult] = useState<any>(null);
  const [meloloDetail, setMeloloDetail] = useState<any>(null);
  const [youtubeDetail, setYoutubeDetail] = useState<any>(null);
  const [tiktokActiveVideo, setTiktokActiveVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);

  // Modal state
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoType, setActiveVideoType] = useState<"iframe" | "video">("iframe");
  const [activeEpisodeIndex, setActiveEpisodeIndex] = useState<number | null>(null);
  
  // Custom Video Player State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVideoInteraction = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  useEffect(() => {
    if (activeVideoUrl) {
      handleVideoInteraction();
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [activeVideoUrl, isPlaying]);

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
      handleVideoInteraction();
    }
  };

  const handleFastForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime += 10;
      handleVideoInteraction();
    }
  };

  const handleRewind = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime -= 10;
      handleVideoInteraction();
    }
  };

  const handleNextEpisode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentView === "melolo" && meloloDetail && activeEpisodeIndex !== null) {
      const nextIdx = activeEpisodeIndex + 1;
      if (nextIdx < meloloDetail.episodes.length) {
        handleMeloloEpisodeClick(meloloDetail.episodes[nextIdx], nextIdx);
      }
    }
  };

  const [watchedEpisodes, setWatchedEpisodes] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('watchedEpisodes');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('watchedEpisodes', JSON.stringify(watchedEpisodes));
  }, [watchedEpisodes]);

  // Autoplay TikTok videos on scroll
  useEffect(() => {
    if (currentView !== "tiktok" || results.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target.querySelector('video');
          if (!video) return;

          if (entry.isIntersecting) {
            video.play().catch(err => console.log("Autoplay prevented:", err));
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.6 } // Play when 60% of the video is visible
    );

    const containers = document.querySelectorAll('.tiktok-video-container');
    containers.forEach(c => observer.observe(c));

    return () => {
      containers.forEach(c => observer.unobserve(c));
      observer.disconnect();
    };
  }, [currentView, results]);

  useEffect(() => {
    // API Key is now fetched from Firebase in the other useEffect
  }, []);

  // Re-run search when view changes (if not home) or when apiKey is loaded
  useEffect(() => {
    if (currentView !== "home" && apiKey) {
      handleSearch(undefined, apiKey, currentView);
    }
  }, [currentView, apiKey]);

  const handleSearch = async (e?: React.FormEvent, keyToUse?: string, viewToUse?: "home" | "gimage" | "tokopedia" | "downloader" | "tiktok" | "melolo" | "youtube") => {
    if (e) e.preventDefault();
    const currentKey = keyToUse || apiKey;
    const view = viewToUse || currentView;
    
    if (view === "home") return;

    const currentQuery = view === "gimage" ? gimageQuery : view === "tokopedia" ? tokopediaQuery : view === "tiktok" ? tiktokQuery : view === "melolo" ? meloloQuery : view === "youtube" ? youtubeQuery : downloaderQuery;
    
    if (!currentKey) {
      // Wait for API key to be fetched
      return;
    }
    if (!currentQuery.trim() && view !== "melolo") return;

    setRateLimitError(null);
    const canProceed = await checkRateLimit();
    if (!canProceed) return;

    try {
      setLoading(true);
      setError(null);
      if (view === "downloader") {
        setDownloaderResult(null);
      } else {
        setResults([]);
        setMeloloCategoriesData([]);
        setMeloloDetail(null);
        setYoutubeDetail(null);
        setTiktokActiveVideo(null);
      }

      let data: any;

      if (view === "gimage") {
        const res = await fetch(`https://api.ferdev.my.id/search/gimage?query=${encodeURIComponent(currentQuery)}&apikey=${encodeURIComponent(currentKey)}`);
        data = await res.json();
        if (data.success && data.result) {
          data.result = data.result.map((item: any) => ({
            ...item,
            is_video: item.url && (item.url.includes('tiktok.com') || item.url.includes('video') || (item.title && item.title.toLowerCase().includes('video')))
          }));
        }
      } else if (view === "tokopedia") {
        const res = await fetch(`https://api.ferdev.my.id/search/tokopedia?query=${encodeURIComponent(currentQuery)}&apikey=${encodeURIComponent(currentKey)}`);
        data = await res.json();
      } else if (view === "tiktok") {
        const res = await fetch(`https://api.ferdev.my.id/search/tiktok?query=${encodeURIComponent(currentQuery)}&apikey=${encodeURIComponent(currentKey)}`);
        data = await res.json();
      } else if (view === "melolo") {
        if (!currentQuery.trim()) {
          const categories = ["Terbaru", "Terpopuler", "Family", "Aksi", "Lucu", "Percintaan", "Horor", "Drama", "Fantasi"];
          const promises = categories.map(cat => 
            fetch(`https://api.ferdev.my.id/internet/melolo/search?query=${encodeURIComponent(cat)}&apikey=${encodeURIComponent(currentKey)}`).then(res => res.json()).catch(() => ({ success: false }))
          );
          const catsResults = await Promise.all(promises);
          data = {
            success: true,
            isCategories: true,
            data: categories.map((cat, i) => ({
              category: cat,
              items: catsResults[i].success ? catsResults[i].result : []
            })).filter(c => c.items && c.items.length > 0)
          };
        } else {
          const res = await fetch(`https://api.ferdev.my.id/internet/melolo/search?query=${encodeURIComponent(currentQuery)}&apikey=${encodeURIComponent(currentKey)}`);
          data = await res.json();
        }
      } else if (view === "youtube") {
        const res = await fetch(`https://api.ferdev.my.id/search/youtube?query=${encodeURIComponent(currentQuery)}&apikey=${encodeURIComponent(currentKey)}`);
        data = await res.json();
      } else if (view === "downloader") {
        const res = await fetch(`https://api.ferdev.my.id/downloader/allinone?link=${encodeURIComponent(currentQuery)}&apikey=${encodeURIComponent(currentKey)}`);
        data = await res.json();
        
        // Fallback logic for TikTok
        if ((!data.success || !data.data) && currentQuery.includes('tiktok.com')) {
          const fallbackRes = await fetch(`https://api.ferdev.my.id/downloader/tiktok?link=${encodeURIComponent(currentQuery)}&apikey=${encodeURIComponent(currentKey)}`);
          data = await fallbackRes.json();
        }
      }

      if (data.status === 400 || data.status === 500) {
        throw new Error(data.message || data.error || "Gagal mengambil data");
      }

      if (data.success) {
        if (view === "downloader") {
          setDownloaderResult(data.data || data.result || data);
        } else if (view === "melolo" && data.isCategories) {
          setMeloloCategoriesData(data.data);
          setResults([]);
        } else {
          const items = data.result || data.data || [];
          if (Array.isArray(items)) {
            setResults(items);
          } else {
            setResults([]);
          }
          if (view === "melolo") setMeloloCategoriesData([]);
        }
      } else {
        if (view === "downloader") {
          throw new Error(data.message || "Media tidak ditemukan");
        } else {
          setResults([]);
        }
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mencari");
    } finally {
      setLoading(false);
    }
  };

  const getDownloaderVideoUrl = (result: any) => {
    if (!result) return null;
    
    // Check for medias array (like Facebook)
    if (result.medias && Array.isArray(result.medias) && result.medias.length > 0) {
      const hdMedia = result.medias.find((m: any) => m.quality === 'hd' && m.extension === 'mp4');
      if (hdMedia && hdMedia.url) return hdMedia.url;
      
      const anyMp4 = result.medias.find((m: any) => m.extension === 'mp4');
      if (anyMp4 && anyMp4.url) return anyMp4.url;
      
      if (result.medias[0].url) return result.medias[0].url;
    }
    
    // Fallback to play, video, or url
    // If source is facebook, result.url is usually the original link, not the video file.
    let videoUrl = result.play || result.video;
    
    if (!videoUrl && result.url && result.source !== 'facebook' && !result.url.includes('facebook.com')) {
      videoUrl = result.url;
    }

    if (Array.isArray(videoUrl)) {
      return videoUrl[0]?.url || videoUrl[0];
    } else if (typeof videoUrl === 'object' && videoUrl !== null) {
      return videoUrl.url || videoUrl.play;
    }
    
    return typeof videoUrl === 'string' ? videoUrl : null;
  };

  const handleMeloloCardClick = async (item: any) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`https://api.ferdev.my.id/internet/melolo/detail?bookId=${item.book_id}&apikey=${apiKey}`);
      const data = await res.json();
      if (data.success && data.result) {
        setMeloloDetail(data.result);
      } else {
        throw new Error(data.message || "Gagal mengambil detail film");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengambil detail");
    } finally {
      setLoading(false);
    }
  };

  const handleMeloloEpisodeClick = async (episode: any, index: number) => {
    try {
      if (meloloDetail?.book_id) {
        setWatchedEpisodes(prev => ({
          ...prev,
          [`${meloloDetail.book_id}_${episode.video_id}`]: true
        }));
      }
      setLoading(true);
      const res = await fetch(`https://api.ferdev.my.id/internet/melolo/stream?videoId=${episode.video_id}&apikey=${apiKey}`);
      const data = await res.json();
      if (data.success && data.result && data.result.length > 0) {
        // Find the highest quality video
        const bestQuality = data.result.reduce((prev: any, current: any) => {
          return (prev.size > current.size) ? prev : current;
        });
        setActiveVideoUrl(bestQuality.url);
        setActiveVideoType("video");
        setActiveEpisodeIndex(index);
      } else {
        alert("Video tidak tersedia");
      }
    } catch (err: any) {
      alert("Gagal memutar video: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoEnded = () => {
    if (currentView === "melolo" && meloloDetail && activeEpisodeIndex !== null) {
      const nextIdx = activeEpisodeIndex + 1;
      if (nextIdx < meloloDetail.episodes.length) {
        handleMeloloEpisodeClick(meloloDetail.episodes[nextIdx], nextIdx);
      }
    }
  };

  const handleYoutubeCardClick = (item: any, index: number) => {
    // Extract video ID from URL (e.g., https://youtube.com/watch?v=YKuHdOxj46I)
    const match = item.url.match(/v=([^&]+)/);
    if (match && match[1]) {
      const videoId = match[1];
      setYoutubeDetail({
        currentVideo: item,
        currentIndex: index,
        embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1`
      });
      // Scroll to top to see the player
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.open(item.url, '_blank');
    }
  };

  const handleCardClick = (item: any) => {
    if (currentView === "gimage") {
      if (item.is_video) {
        let embedUrl = item.url;
        let type: "iframe" | "video" = "iframe";
        if (item.image && item.image.includes('itemId=')) {
          const match = item.image.match(/itemId=(\d+)/);
          if (match && match[1]) {
            embedUrl = `https://www.tiktok.com/embed/v2/${match[1]}`;
          }
        } else if (item.url && item.url.includes('/video/')) {
          const match = item.url.match(/\/video\/(\d+)/);
          if (match && match[1]) {
            embedUrl = `https://www.tiktok.com/embed/v2/${match[1]}`;
          }
        } else if (item.url && (item.url.endsWith('.mp4') || item.url.includes('fbcdn.net'))) {
          type = "video";
        }
        setActiveVideoUrl(embedUrl);
        setActiveVideoType(type);
      } else {
        window.open(item.url, '_blank');
      }
    } else if (currentView === "tokopedia") {
      window.open(item.url, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-500/30 transition-colors duration-200">
      {/* Navbar */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {currentView !== "home" && (
              <button 
                onClick={() => {
                  setCurrentView("home");
                  setYoutubeDetail(null);
                  setMeloloDetail(null);
                }}
                className={`p-2 rounded-full transition-colors ${
                  currentView === "gimage" ? "hover:bg-pink-100 dark:hover:bg-pink-900/30 text-pink-600 dark:text-pink-400" :
                  currentView === "tokopedia" ? "hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400" :
                  currentView === "tiktok" ? "hover:bg-gray-200 dark:hover:bg-gray-800 text-black dark:text-white" :
                  currentView === "melolo" ? "hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400" :
                  currentView === "youtube" ? "hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400" :
                  "hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                }`}
                title="Kembali ke Beranda"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
              setCurrentView("home");
              setYoutubeDetail(null);
              setMeloloDetail(null);
              setTiktokActiveVideo(null);
            }}>
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-lg text-white shadow-sm">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                ALL IN ONE
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
              title="Ganti Tema"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
              title="Profil Pengguna"
            >
              {userLimit > 100 ? (
                <Crown className="w-5 h-5 text-yellow-500" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8 flex flex-col gap-8">
        
        {/* Home View - 3 Boxes */}
        {currentView === "home" && (
          <div className="w-full max-w-5xl mx-auto mt-4 md:mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight mb-4">Selamat Datang di ALL IN ONE</h2>
              <p className="text-lg text-gray-500 dark:text-gray-400 dark:text-gray-500 max-w-2xl mx-auto">Pilih fitur yang ingin Anda gunakan dari menu di bawah ini. Semua kebutuhan pencarian Anda dalam satu tempat.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
              {/* Box 1: GImage */}
              <div 
                onClick={() => setCurrentView("gimage")} 
                className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:border-pink-300 cursor-pointer transition-all duration-300 flex flex-col items-center text-center gap-5 group transform hover:-translate-y-1"
              >
                <div className="w-20 h-20 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-pink-100 transition-all duration-300">
                  <ImageIcon className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Pencarian Gambar</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 leading-relaxed">Cari gambar dan putar video dari berbagai sumber termasuk TikTok dengan mudah.</p>
                </div>
              </div>

              {/* Box 2: Tokopedia */}
              <div 
                onClick={() => setCurrentView("tokopedia")} 
                className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:border-green-300 cursor-pointer transition-all duration-300 flex flex-col items-center text-center gap-5 group transform hover:-translate-y-1"
              >
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-green-100 transition-all duration-300">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Tokopedia</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 leading-relaxed">Cari produk, cek harga, dan temukan toko terbaik dari Tokopedia secara langsung.</p>
                </div>
              </div>

              {/* Box 3: Downloader */}
              <div 
                onClick={() => setCurrentView("downloader")} 
                className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:border-blue-300 cursor-pointer transition-all duration-300 flex flex-col items-center text-center gap-5 group transform hover:-translate-y-1"
              >
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
                  <Download className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Downloader</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 leading-relaxed">Download video atau media dari berbagai platform (TikTok, dll) tanpa watermark.</p>
                </div>
              </div>

              {/* Box 4: TikTok Search */}
              <div 
                onClick={() => setCurrentView("tiktok")} 
                className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:border-black cursor-pointer transition-all duration-300 flex flex-col items-center text-center gap-5 group transform hover:-translate-y-1"
              >
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 text-black rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-gray-200 dark:bg-gray-700 transition-all duration-300">
                  <Video className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">TikTok Feed</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 leading-relaxed">Cari dan tonton video TikTok dengan pengalaman scroll vertikal seperti di aplikasinya.</p>
                </div>
              </div>

              {/* Box 5: Melolo */}
              <div 
                onClick={() => setCurrentView("melolo")} 
                className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:border-purple-300 cursor-pointer transition-all duration-300 flex flex-col items-center text-center gap-5 group transform hover:-translate-y-1"
              >
                <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-100 transition-all duration-300">
                  <Play className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Melolo</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 leading-relaxed">Cari dan tonton berbagai film serta serial favorit Anda dengan mudah.</p>
                </div>
              </div>

              {/* Box 6: Youtube */}
              <div 
                onClick={() => setCurrentView("youtube")} 
                className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-xl hover:border-red-300 cursor-pointer transition-all duration-300 flex flex-col items-center text-center gap-5 group transform hover:-translate-y-1"
              >
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-red-100 transition-all duration-300">
                  <Youtube className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">YouTube</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 leading-relaxed">Cari dan tonton video YouTube favorit Anda tanpa iklan yang mengganggu.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Views */}
        {currentView !== "home" && (
          <>
            {/* Search Form */}
            <form onSubmit={(e) => handleSearch(e)} className="relative max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-top-4 duration-300">
              <input
                type="text"
                value={currentView === "gimage" ? gimageQuery : currentView === "tokopedia" ? tokopediaQuery : currentView === "tiktok" ? tiktokQuery : currentView === "melolo" ? meloloQuery : currentView === "youtube" ? youtubeQuery : downloaderQuery}
                onChange={(e) => {
                  if (currentView === "gimage") setGimageQuery(e.target.value);
                  else if (currentView === "tokopedia") setTokopediaQuery(e.target.value);
                  else if (currentView === "tiktok") setTiktokQuery(e.target.value);
                  else if (currentView === "melolo") setMeloloQuery(e.target.value);
                  else if (currentView === "youtube") setYoutubeQuery(e.target.value);
                  else setDownloaderQuery(e.target.value);
                }}
                placeholder={currentView === "gimage" ? "Cari gambar atau video..." : currentView === "tokopedia" ? "Cari produk di Tokopedia..." : currentView === "tiktok" ? "Cari video TikTok..." : currentView === "melolo" ? "Cari film atau serial..." : currentView === "youtube" ? "Cari video YouTube..." : "Masukkan link video (TikTok, dll)..."}
                className={`w-full bg-white dark:bg-gray-800 border border-gray-300 rounded-2xl py-4 pl-5 pr-14 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm ${
                  currentView === "gimage" ? "focus:ring-pink-500" : currentView === "tokopedia" ? "focus:ring-green-500" : currentView === "tiktok" ? "focus:ring-black" : currentView === "melolo" ? "focus:ring-purple-500" : currentView === "youtube" ? "focus:ring-red-500" : "focus:ring-blue-500"
                }`}
              />
              <button
                type="submit"
                disabled={loading}
                className={`absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center text-white rounded-xl transition-colors disabled:opacity-50 ${
                  currentView === "gimage" ? "bg-pink-600 hover:bg-pink-500" : currentView === "tokopedia" ? "bg-green-600 hover:bg-green-500" : currentView === "tiktok" ? "bg-black hover:bg-gray-800" : currentView === "melolo" ? "bg-purple-600 hover:bg-purple-500" : currentView === "youtube" ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : currentView === "downloader" ? <Download className="w-5 h-5" /> : currentView === "tiktok" ? <Video className="w-5 h-5" /> : currentView === "melolo" ? <Play className="w-5 h-5" /> : currentView === "youtube" ? <Youtube className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>
            </form>

            {/* Error State */}
            {error && (
              <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-200 max-w-2xl mx-auto w-full animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Downloader Result */}
            {!loading && currentView === "downloader" && downloaderResult && (
              <div className="max-w-2xl mx-auto w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row">
                  {/* Thumbnail */}
                  <div 
                    className="w-full md:w-2/5 aspect-square md:aspect-auto bg-gray-100 dark:bg-gray-800 relative group cursor-pointer"
                    onClick={() => {
                      const videoUrl = getDownloaderVideoUrl(downloaderResult);
                      if (videoUrl) {
                        setActiveVideoUrl(videoUrl);
                        setActiveVideoType("video");
                      }
                    }}
                  >
                    {downloaderResult.cover || downloaderResult.thumbnail ? (
                      <img 
                        src={downloaderResult.cover || downloaderResult.thumbnail} 
                        alt="Thumbnail" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                    
                    {getDownloaderVideoUrl(downloaderResult) && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                        <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm text-gray-900 dark:text-gray-100 p-4 rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-8 h-8 ml-1" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Info & Actions */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                      {downloaderResult.title || "Media Siap Diunduh"}
                    </h3>
                    
                    {downloaderResult.author && (
                      <div className="flex items-center gap-2 mb-6">
                        {downloaderResult.author.avatar && (
                          <img src={downloaderResult.author.avatar} alt="Author" className="w-8 h-8 rounded-full" />
                        )}
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          @{downloaderResult.author.unique_id || downloaderResult.author.nickname || "User"}
                        </span>
                      </div>
                    )}

                    <div className="mt-auto flex flex-col gap-3">
                      {getDownloaderVideoUrl(downloaderResult) && (
                        <>
                          <button 
                            onClick={() => {
                              const videoUrl = getDownloaderVideoUrl(downloaderResult);
                              if (videoUrl) {
                                setActiveVideoUrl(videoUrl);
                                setActiveVideoType("video");
                              }
                            }}
                            className="flex items-center justify-center gap-2 w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-xl transition-colors"
                          >
                            <Play className="w-5 h-5" />
                            Preview Video
                          </button>
                          <a 
                            href={getDownloaderVideoUrl(downloaderResult) || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl transition-colors"
                          >
                            <Download className="w-5 h-5" />
                            Download Video
                          </a>
                        </>
                      )}
                      
                      {downloaderResult.music && (
                        <a 
                          href={downloaderResult.music} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium py-3 px-4 rounded-xl transition-colors"
                        >
                          <Music className="w-5 h-5" />
                          Download Audio
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TikTok Feed View */}
            {!loading && currentView === "tiktok" && results.length > 0 && (
              <div className="flex flex-col gap-4 -mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Main Vertical Feed */}
                <div className="max-w-md mx-auto w-full h-[65vh] bg-black rounded-3xl overflow-y-scroll snap-y snap-mandatory shadow-2xl border-4 border-gray-900 hide-scrollbar relative">
                  {results.map((videoUrl, idx) => (
                    <div key={idx} className="w-full h-full snap-start snap-always relative flex items-center justify-center bg-black tiktok-video-container">
                      <video 
                        src={videoUrl} 
                        controls 
                        controlsList="nodownload"
                        className="w-full h-full object-contain"
                        preload={idx === 0 ? "auto" : "metadata"}
                        loop
                        playsInline
                        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='black'/%3E%3C/svg%3E"
                      />
                    </div>
                  ))}
                </div>

                {/* Recommendations (2 rows, horizontal scroll) */}
                <div className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Video className="w-6 h-6 text-black" />
                    Rekomendasi Video
                  </h3>
                  <div 
                    className="grid grid-rows-2 grid-flow-col gap-4 overflow-x-auto pb-2 snap-x hide-scrollbar"
                    style={{ gridAutoColumns: "minmax(120px, 1fr)" }}
                  >
                    {[...results].reverse().map((videoUrl, idx) => (
                      <div 
                        key={idx}
                        onClick={() => {
                          // Find the video in the main feed and scroll to it
                          const originalIdx = results.indexOf(videoUrl);
                          const container = document.querySelector('.max-w-md.overflow-y-scroll');
                          const videoElements = container?.querySelectorAll('.tiktok-video-container');
                          if (container && videoElements && videoElements[originalIdx]) {
                            container.scrollTo({
                              top: (videoElements[originalIdx] as HTMLElement).offsetTop,
                              behavior: 'smooth'
                            });
                          }
                        }}
                        className="bg-black rounded-xl overflow-hidden aspect-[9/16] cursor-pointer hover:ring-2 hover:ring-black transition-all relative group snap-start w-[120px] sm:w-[140px]"
                      >
                        <video 
                          src={videoUrl} 
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          preload="metadata"
                          muted
                          playsInline
                          onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                          onMouseLeave={(e) => {
                            e.currentTarget.pause();
                            e.currentTarget.currentTime = 0;
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Melolo Categories View */}
            {!loading && currentView === "melolo" && !meloloDetail && meloloCategoriesData.length > 0 && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {meloloCategoriesData.map((categoryData, catIdx) => (
                  <div key={catIdx} className="bg-white dark:bg-gray-800 p-5 md:p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col gap-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Play className="w-5 h-5 text-purple-600" />
                      {categoryData.category}
                    </h3>
                    <div 
                      className="grid grid-rows-2 grid-flow-col gap-4 overflow-x-auto pb-2 snap-x hide-scrollbar"
                      style={{ gridAutoColumns: "minmax(140px, 1fr)" }}
                    >
                      {categoryData.items.map((item, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => handleMeloloCardClick(item)}
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col hover:border-purple-300 snap-start w-[140px] sm:w-[160px] md:w-[180px]"
                        >
                          <div className="relative w-full aspect-[2/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            {item.cover ? (
                              <ImageWithFallback 
                                src={item.cover} 
                                alt={item.title || "Cover"} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                              </div>
                            )}
                            {item.status && (
                              <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                                {item.status}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Play className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                            </div>
                          </div>
                          <div className="p-3 flex-1 flex flex-col gap-1">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 line-clamp-2 group-hover:text-purple-600 transition-colors">
                              {item.title || "Tanpa Judul"}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 line-clamp-1">{item.author}</p>
                            <div className="mt-auto pt-2 flex items-center justify-between">
                              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md font-medium">
                                {item.total_chapters} Eps
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Melolo Search Results List */}
            {!loading && currentView === "melolo" && !meloloDetail && results.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {results.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleMeloloCardClick(item)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col hover:border-purple-300"
                  >
                    <div className="relative w-full aspect-[2/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      {item.cover ? (
                        <ImageWithFallback 
                          src={item.cover} 
                          alt={item.title || "Cover"} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                      {item.status && (
                        <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                          {item.status}
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col gap-1">
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 line-clamp-2 group-hover:text-purple-600 transition-colors">
                        {item.title || "Tanpa Judul"}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 line-clamp-1">{item.author}</p>
                      <div className="mt-auto pt-2 flex items-center justify-between">
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md font-medium">
                          {item.total_chapters} Eps
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Melolo Detail View */}
            {!loading && currentView === "melolo" && meloloDetail && (
              <div className="flex flex-col gap-4 -mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={() => setMeloloDetail(null)}
                  className="group flex items-center gap-3 bg-white dark:bg-gray-800 hover:bg-purple-50 border border-gray-200 dark:border-gray-700 hover:border-purple-200 text-gray-700 dark:text-gray-300 hover:text-purple-700 px-5 py-2.5 rounded-full font-semibold text-sm transition-all shadow-sm hover:shadow-md w-fit"
                >
                  <div className="bg-purple-100 text-purple-600 p-1 rounded-full group-hover:bg-purple-200 transition-colors">
                    <Play className="w-4 h-4" />
                  </div>
                  Kembali ke Hasil Pencarian
                </button>
                
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-5 md:p-6 shadow-sm flex flex-col md:flex-row gap-6">
                  <div className="w-full md:w-1/4 shrink-0">
                    <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-md">
                      <ImageWithFallback src={meloloDetail.cover} alt={meloloDetail.title} className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100">{meloloDetail.title}</h2>
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full">{meloloDetail.status}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {meloloDetail.tags?.map((tag: string, i: number) => (
                          <span key={i} className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs px-2.5 py-1 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="prose prose-sm text-gray-600 dark:text-gray-300 max-w-none">
                      <p>{meloloDetail.intro || meloloDetail.sinopsis}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                    <Play className="w-6 h-6 text-purple-600" />
                    Daftar Episode ({meloloDetail.total_episodes || meloloDetail.episodes?.length})
                  </h3>
                  <div 
                    className="grid grid-rows-3 grid-flow-col gap-4 overflow-x-auto pb-6 snap-x hide-scrollbar" 
                    style={{ gridAutoColumns: "minmax(280px, 1fr)" }}
                  >
                    {meloloDetail.episodes?.map((ep: any, idx: number) => {
                      const isWatched = watchedEpisodes[`${meloloDetail.book_id}_${ep.video_id}`];
                      return (
                        <div 
                          key={idx}
                          onClick={() => handleMeloloEpisodeClick(ep, idx)}
                          className={`bg-white dark:bg-gray-800 border rounded-xl p-3 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all group snap-start relative overflow-hidden ${
                            activeEpisodeIndex === idx ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20" : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
                          }`}
                        >
                          {isWatched && (
                            <div className="absolute -right-6 top-2 bg-green-500 text-white text-[10px] font-bold px-6 py-0.5 rotate-45 shadow-sm z-10">
                              DITONTON
                            </div>
                          )}
                          <div className="relative w-24 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0">
                            <ImageWithFallback src={ep.cover} alt={`Episode ${ep.episode}`} className="w-full h-full object-cover" />
                            <div className={`absolute inset-0 flex items-center justify-center transition-colors ${
                              activeEpisodeIndex === idx ? "bg-black/40" : "bg-black/20 group-hover:bg-black/40"
                            }`}>
                              <Play className={`w-6 h-6 ${activeEpisodeIndex === idx ? "text-purple-400" : "text-white"}`} />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 pr-4">
                            <h4 className={`font-bold transition-colors truncate flex items-center gap-2 ${
                              activeEpisodeIndex === idx ? "text-purple-700 dark:text-purple-400" : "text-gray-900 dark:text-gray-100 group-hover:text-purple-600"
                            }`}>
                              Episode {ep.episode}
                              {isWatched && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{Math.floor(ep.duration / 60)}:{String(ep.duration % 60).padStart(2, '0')}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* YouTube Categories */}
            {!loading && currentView === "youtube" && !youtubeDetail && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-4 animate-in fade-in">
                {["Trending Indonesia", "Musik Populer", "Berita Terbaru", "Gaming", "Olahraga", "Film & Animasi"].map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setYoutubeQuery(cat);
                      handleSearch(undefined, undefined, "youtube");
                    }}
                    className="whitespace-nowrap px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* YouTube Results Grid */}
            {!loading && currentView === "youtube" && !youtubeDetail && results.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {results.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleYoutubeCardClick(item, idx)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:shadow-xl transition-all cursor-pointer group flex flex-col hover:border-red-300"
                  >
                    <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      {item.thumbnail ? (
                        <ImageWithFallback 
                          src={item.thumbnail} 
                          alt={item.title || "Thumbnail"} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Youtube className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                        </div>
                      )}
                      {item.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                          {item.duration}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <div className="bg-red-600 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300 shadow-lg">
                          <Play className="w-6 h-6 ml-1" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 shrink-0 overflow-hidden flex items-center justify-center">
                        <Youtube className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-red-600 transition-colors mb-1">
                          {item.title || "Tanpa Judul"}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 truncate">{item.author}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                          {item.views && <span>{item.views.toLocaleString()} views</span>}
                          {item.views && item.uploadDate && <span>•</span>}
                          {item.uploadDate && <span>{item.uploadDate}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* YouTube Detail View */}
            {!loading && currentView === "youtube" && youtubeDetail && (
              <div className="flex flex-col gap-4 -mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={() => setYoutubeDetail(null)}
                  className="group flex items-center gap-3 bg-white dark:bg-gray-800 hover:bg-red-50 border border-gray-200 dark:border-gray-700 hover:border-red-200 text-gray-700 dark:text-gray-300 hover:text-red-700 px-5 py-2.5 rounded-full font-semibold text-sm transition-all shadow-sm hover:shadow-md w-fit"
                >
                  <div className="bg-red-100 text-red-600 p-1 rounded-full group-hover:bg-red-200 transition-colors">
                    <Youtube className="w-4 h-4" />
                  </div>
                  Kembali ke Hasil Pencarian
                </button>
                
                {/* Player */}
                <div className="w-full bg-black rounded-2xl overflow-hidden shadow-xl relative h-[40vh] sm:h-[50vh] md:h-[60vh] lg:h-[75vh]">
                  <iframe 
                    src={youtubeDetail.embedUrl} 
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  ></iframe>
                </div>

                {/* Video Info */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{youtubeDetail.currentVideo.title}</h2>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Youtube className="w-4 h-4 text-red-600" />
                      </div>
                      {youtubeDetail.currentVideo.author}
                    </div>
                    {youtubeDetail.currentVideo.views && (
                      <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{youtubeDetail.currentVideo.views.toLocaleString()} views</span>
                    )}
                    {youtubeDetail.currentVideo.uploadDate && (
                      <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">{youtubeDetail.currentVideo.uploadDate}</span>
                    )}
                  </div>
                </div>

                {/* Up Next List */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Play className="w-5 h-5 text-red-600" />
                    Putar Selanjutnya
                  </h3>
                  <div className="flex flex-col gap-3">
                    {results.map((item, idx) => {
                      if (idx === youtubeDetail.currentIndex) return null;
                      return (
                        <div 
                          key={idx}
                          onClick={() => handleYoutubeCardClick(item, idx)}
                          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex gap-4 cursor-pointer hover:border-red-300 hover:shadow-md transition-all group"
                        >
                          <div className="relative w-40 aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shrink-0">
                            <ImageWithFallback src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                            {item.duration && (
                              <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                                {item.duration}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                              <Play className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0 py-1">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-red-600 transition-colors line-clamp-2 mb-1">
                              {item.title}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">{item.author}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                              {item.views && <span>{item.views.toLocaleString()} views</span>}
                              {item.views && item.uploadDate && <span>•</span>}
                              {item.uploadDate && <span>{item.uploadDate}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Results Grid (GImage & Tokopedia) */}
            {!loading && (currentView === "gimage" || currentView === "tokopedia") && results.length > 0 && (
              <div className={`grid gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ${
                currentView === "gimage" 
                  ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" 
                  : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
              }`}>
                {results.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleCardClick(item)}
                    className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col ${
                      currentView === "gimage" ? "hover:border-pink-300" : "hover:border-green-300"
                    }`}
                  >
                    {currentView === "gimage" ? (
                      // GImage Card
                      <>
                        <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          {item.image ? (
                            <ImageWithFallback 
                              src={item.image} 
                              alt={item.title || "Image"} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                          
                          {/* Video Overlay */}
                          {item.is_video && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                              <div className="bg-white dark:bg-gray-800/90 backdrop-blur-sm text-pink-600 p-3 rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                                <Play className="w-6 h-6 ml-1" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col">
                          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 group-hover:text-pink-600 transition-colors">
                            {item.title || "Tanpa Judul"}
                          </h3>
                          <div className="mt-auto pt-2">
                            <span className={`text-xs px-2 py-1 rounded-md font-medium ${item.is_video ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                              {item.is_video ? 'Video' : 'Gambar'}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      // Tokopedia Card
                      <>
                        <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
                          {item.thumbnail ? (
                            <img 
                              src={item.thumbnail} 
                              alt={item.name || "Product"} 
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col gap-1.5">
                          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 group-hover:text-green-600 transition-colors">
                            {item.name || "Tanpa Nama"}
                          </h3>
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            {item.price || "Rp0"}
                          </div>
                          <div className="mt-auto pt-2 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                            {item.shop?.name && (
                              <div className="flex items-center gap-1">
                                <Store className="w-3 h-3 shrink-0" />
                                <span className="truncate">{item.shop.name}</span>
                              </div>
                            )}
                            {item.shop?.city && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{item.shop.city}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!loading && !error && currentView !== "downloader" && results.length === 0 && meloloCategoriesData.length === 0 && !meloloDetail && !youtubeDetail && !tiktokActiveVideo && (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400 dark:text-gray-500 animate-in fade-in">
                {currentView === "gimage" ? (
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                ) : currentView === "tiktok" ? (
                  <Video className="w-12 h-12 mx-auto mb-4 opacity-20" />
                ) : currentView === "melolo" ? (
                  <Play className="w-12 h-12 mx-auto mb-4 opacity-20" />
                ) : currentView === "youtube" ? (
                  <Youtube className="w-12 h-12 mx-auto mb-4 opacity-20" />
                ) : (
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                )}
                <p>Tidak ada hasil yang ditemukan.</p>
              </div>
            )}
            
            {!loading && !error && currentView === "downloader" && !downloaderResult && (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400 dark:text-gray-500 animate-in fade-in">
                <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Masukkan link untuk mulai mengunduh.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Video Modal */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
          <div className={`relative w-full h-full md:h-auto bg-black md:rounded-2xl overflow-hidden flex flex-col shadow-2xl mx-auto ${
            currentView === 'tiktok' ? 'md:max-w-sm md:aspect-[9/16]' : 'md:max-w-4xl md:aspect-video'
          }`}>
            {/* Modal Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex justify-end p-4 bg-gradient-to-b from-black/80 to-transparent">
              <button 
                onClick={() => {
                  setActiveVideoUrl(null);
                  setActiveEpisodeIndex(null);
                }}
                className="bg-white/20 hover:bg-white/40 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                title="Tutup Video"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Iframe/Video Container */}
            <div 
              className="w-full h-full flex-1 flex items-center justify-center bg-black relative group"
              onMouseMove={handleVideoInteraction}
              onClick={handleVideoInteraction}
            >
              {activeVideoType === "iframe" ? (
                <iframe 
                  src={activeVideoUrl} 
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                ></iframe>
              ) : (
                <>
                  <video 
                    ref={videoRef}
                    src={activeVideoUrl} 
                    controls={true}
                    autoPlay
                    playsInline
                    referrerPolicy="no-referrer"
                    onEnded={handleVideoEnded}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    className="w-full h-full object-contain"
                  />
                  
                  {/* Custom Overlay Controls */}
                  <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                    {/* Top Info Bar */}
                    {currentView === 'melolo' && meloloDetail && activeEpisodeIndex !== null && (
                      <div className="absolute top-0 left-0 right-0 p-4 pt-16 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start">
                        <div className="text-white">
                          <h3 className="font-bold text-lg md:text-xl drop-shadow-md">{meloloDetail.title}</h3>
                          <p className="text-sm md:text-base text-gray-200 drop-shadow-md">
                            Episode {meloloDetail.episodes[activeEpisodeIndex].episode}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Center Controls */}
                    <div className="absolute inset-0 flex items-center justify-center gap-4 md:gap-8">
                      <button 
                        onClick={handleRewind}
                        className="pointer-events-auto bg-black/40 hover:bg-black/60 text-white p-3 md:p-4 rounded-full backdrop-blur-sm transition-all transform hover:scale-110"
                        title="Mundur 10 detik"
                      >
                        <Rewind className="w-6 h-6 md:w-8 md:h-8" />
                      </button>
                      
                      <button 
                        onClick={handlePlayPause}
                        className="pointer-events-auto bg-purple-600/80 hover:bg-purple-600 text-white p-4 md:p-6 rounded-full backdrop-blur-sm transition-all transform hover:scale-110 shadow-lg"
                        title={isPlaying ? "Jeda" : "Putar"}
                      >
                        {isPlaying ? <Pause className="w-8 h-8 md:w-10 md:h-10" /> : <Play className="w-8 h-8 md:w-10 md:h-10 ml-1" />}
                      </button>

                      <button 
                        onClick={handleFastForward}
                        className="pointer-events-auto bg-black/40 hover:bg-black/60 text-white p-3 md:p-4 rounded-full backdrop-blur-sm transition-all transform hover:scale-110"
                        title="Maju 10 detik"
                      >
                        <FastForward className="w-6 h-6 md:w-8 md:h-8" />
                      </button>
                    </div>

                    {/* Next Episode Button (Bottom Right) */}
                    {currentView === 'melolo' && meloloDetail && activeEpisodeIndex !== null && activeEpisodeIndex + 1 < meloloDetail.episodes.length && (
                      <div className="absolute bottom-20 right-4 md:bottom-24 md:right-8">
                        <button 
                          onClick={handleNextEpisode}
                          className="pointer-events-auto flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white px-4 py-2 rounded-full backdrop-blur-md transition-all transform hover:scale-105 shadow-lg"
                          title="Episode Selanjutnya"
                        >
                          <span className="text-sm font-medium hidden md:block">Episode {meloloDetail.episodes[activeEpisodeIndex + 1].episode}</span>
                          <span className="text-sm font-medium md:hidden">Next</span>
                          <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="relative h-24 bg-gradient-to-r from-indigo-500 to-purple-600">
              <button 
                onClick={() => setShowSettings(false)} 
                className="absolute top-4 right-4 p-1.5 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="px-6 pb-6 pt-0 relative text-center">
              <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-full p-1.5 absolute -top-10 left-1/2 -translate-x-1/2 shadow-md">
                <div className={`w-full h-full rounded-full flex items-center justify-center ${userLimit > 100 ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-600' : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 dark:text-gray-300'}`}>
                  {userLimit > 100 ? <Crown className="w-8 h-8" /> : <User className="w-8 h-8" />}
                </div>
              </div>
              
              <div className="mt-14 mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center justify-center gap-2">
                  {userLimit > 100 ? 'User Pro' : 'User Free'}
                  {userLimit > 100 && <Crown className="w-4 h-4 text-yellow-500" />}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
                  {visitorId ? `ID: ${visitorId.substring(0, 15)}...` : 'Memuat ID...'}
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 text-left border border-gray-100 dark:border-gray-800 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Penggunaan API</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {requestCount} / {userLimit === 0 ? '∞' : userLimit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full ${userLimit > 100 ? 'bg-yellow-400' : 'bg-indigo-500'}`} 
                    style={{ width: `${userLimit === 0 ? 0 : Math.min(100, (requestCount / userLimit) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-3 text-center">
                  {userLimit > 100 ? 'Anda memiliki akses premium tanpa batas.' : 'Upgrade ke Pro untuk menghapus batasan harian.'}
                </p>
              </div>
              
              <button
                onClick={() => setShowSettings(false)}
                className="w-full bg-gray-900 hover:bg-black text-white font-medium py-3 rounded-xl transition-colors"
              >
                Tutup Profil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate Limit Modal */}
      {rateLimitError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 text-center relative">
              <button 
                onClick={() => setRateLimitError(null)}
                className="absolute top-4 right-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Shield className="w-10 h-10" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">Upgrade Akses</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed text-sm sm:text-base">
                Mohon maaf, Anda telah mencapai batas penggunaan gratis. Untuk terus menikmati layanan tanpa batas, silakan upgrade akses Anda dengan menghubungi kami di bawah ini:
              </p>
              
              <div className="space-y-3">
                <a 
                  href="https://wa.me/6287733745059" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-[#25D366]/30 active:scale-[0.98]"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp (6287733745059)
                </a>
                <a 
                  href="https://t.me/otomotif_digital" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-3.5 px-4 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl font-medium transition-all hover:shadow-lg hover:shadow-[#0088cc]/30 active:scale-[0.98]"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                  Telegram (@otomotif_digital)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
