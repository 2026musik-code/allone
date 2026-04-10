import React, { useState, useEffect, useRef } from "react";
import { Search, Settings, Loader2, AlertCircle, X, Play, Image as ImageIcon, ShoppingBag, Store, MapPin, ArrowLeft, LayoutGrid, Plus, Download, Link as LinkIcon, Music, Video } from "lucide-react";

const ImageWithFallback = ({ src, alt, className }: { src: string, alt: string, className: string }) => {
  const [errorCount, setErrorCount] = useState(0);

  if (errorCount >= 2) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <ImageIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  const currentSrc = errorCount === 0 ? src : `/api/proxy-image?url=${encodeURIComponent(src)}`;

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
  const [apiKey, setApiKey] = useState("dedi131");
  const [currentView, setCurrentView] = useState<"home" | "gimage" | "tokopedia" | "downloader" | "tiktok">("home");
  
  // Separate query states for each tab
  const [gimageQuery, setGimageQuery] = useState("Cewek cantik");
  const [tokopediaQuery, setTokopediaQuery] = useState("hp");
  const [downloaderQuery, setDownloaderQuery] = useState("https://vt.tiktok.com/ZS6EMauTA/");
  const [tiktokQuery, setTiktokQuery] = useState("pargoy");
  
  const [results, setResults] = useState<any[]>([]);
  const [downloaderResult, setDownloaderResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("dedi131");

  // Modal state
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoType, setActiveVideoType] = useState<"iframe" | "video">("iframe");

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
    const savedKey = localStorage.getItem("api_key");
    if (savedKey) {
      setApiKey(savedKey);
      setTempApiKey(savedKey);
    }
  }, []);

  // Re-run search when view changes (if not home)
  useEffect(() => {
    if (currentView !== "home") {
      handleSearch(undefined, apiKey, currentView);
    }
  }, [currentView]);

  const saveSettings = () => {
    localStorage.setItem("api_key", tempApiKey);
    setApiKey(tempApiKey);
    setShowSettings(false);
    if (currentView !== "home") {
      handleSearch(undefined, tempApiKey, currentView);
    }
  };

  const handleSearch = async (e?: React.FormEvent, keyToUse?: string, viewToUse?: "home" | "gimage" | "tokopedia" | "downloader" | "tiktok") => {
    if (e) e.preventDefault();
    const currentKey = keyToUse || apiKey;
    const view = viewToUse || currentView;
    
    if (view === "home") return;

    const currentQuery = view === "gimage" ? gimageQuery : view === "tokopedia" ? tokopediaQuery : view === "tiktok" ? tiktokQuery : downloaderQuery;
    
    if (!currentKey) {
      setShowSettings(true);
      return;
    }
    if (!currentQuery.trim()) return;

    try {
      setLoading(true);
      setError(null);
      if (view === "downloader") {
        setDownloaderResult(null);
      } else {
        setResults([]);
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
        } else {
          const items = data.result || data.data || [];
          if (Array.isArray(items)) {
            setResults(items);
          } else {
            setResults([]);
          }
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-500/30">
      {/* Navbar */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {currentView !== "home" && (
              <button 
                onClick={() => setCurrentView("home")}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
                title="Kembali ke Beranda"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView("home")}>
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-1.5 rounded-lg text-white shadow-sm">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                ALL IN ONE
              </h1>
            </div>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
            title="Pengaturan"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8 flex flex-col gap-8">
        
        {/* Home View - 3 Boxes */}
        {currentView === "home" && (
          <div className="w-full max-w-5xl mx-auto mt-4 md:mt-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">Selamat Datang di ALL IN ONE</h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">Pilih fitur yang ingin Anda gunakan dari menu di bawah ini. Semua kebutuhan pencarian Anda dalam satu tempat.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Box 1: GImage */}
              <div 
                onClick={() => setCurrentView("gimage")} 
                className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-pink-300 cursor-pointer transition-all duration-300 flex flex-col items-center text-center gap-5 group transform hover:-translate-y-1"
              >
                <div className="w-20 h-20 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-pink-100 transition-all duration-300">
                  <ImageIcon className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Pencarian Gambar</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">Cari gambar dan putar video dari berbagai sumber termasuk TikTok dengan mudah.</p>
                </div>
              </div>

              {/* Box 2: Tokopedia */}
              <div 
                onClick={() => setCurrentView("tokopedia")} 
                className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-green-300 cursor-pointer transition-all duration-300 flex flex-col items-center text-center gap-5 group transform hover:-translate-y-1"
              >
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-green-100 transition-all duration-300">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Tokopedia</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">Cari produk, cek harga, dan temukan toko terbaik dari Tokopedia secara langsung.</p>
                </div>
              </div>

              {/* Box 3: Downloader */}
              <div 
                onClick={() => setCurrentView("downloader")} 
                className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-blue-300 cursor-pointer transition-all duration-300 flex flex-col items-center text-center gap-5 group transform hover:-translate-y-1"
              >
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
                  <Download className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Downloader</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">Download video atau media dari berbagai platform (TikTok, dll) tanpa watermark.</p>
                </div>
              </div>

              {/* Box 4: TikTok Search */}
              <div 
                onClick={() => setCurrentView("tiktok")} 
                className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-black cursor-pointer transition-all duration-300 flex flex-col items-center text-center gap-5 group transform hover:-translate-y-1"
              >
                <div className="w-20 h-20 bg-gray-100 text-black rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-gray-200 transition-all duration-300">
                  <Video className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">TikTok Feed</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">Cari dan tonton video TikTok dengan pengalaman scroll vertikal seperti di aplikasinya.</p>
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
                value={currentView === "gimage" ? gimageQuery : currentView === "tokopedia" ? tokopediaQuery : currentView === "tiktok" ? tiktokQuery : downloaderQuery}
                onChange={(e) => {
                  if (currentView === "gimage") setGimageQuery(e.target.value);
                  else if (currentView === "tokopedia") setTokopediaQuery(e.target.value);
                  else if (currentView === "tiktok") setTiktokQuery(e.target.value);
                  else setDownloaderQuery(e.target.value);
                }}
                placeholder={currentView === "gimage" ? "Cari gambar atau video..." : currentView === "tokopedia" ? "Cari produk di Tokopedia..." : currentView === "tiktok" ? "Cari video TikTok..." : "Masukkan link video (TikTok, dll)..."}
                className={`w-full bg-white border border-gray-300 rounded-2xl py-4 pl-5 pr-14 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm ${
                  currentView === "gimage" ? "focus:ring-pink-500" : currentView === "tokopedia" ? "focus:ring-green-500" : currentView === "tiktok" ? "focus:ring-black" : "focus:ring-blue-500"
                }`}
              />
              <button
                type="submit"
                disabled={loading}
                className={`absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center text-white rounded-xl transition-colors disabled:opacity-50 ${
                  currentView === "gimage" ? "bg-pink-600 hover:bg-pink-500" : currentView === "tokopedia" ? "bg-green-600 hover:bg-green-500" : currentView === "tiktok" ? "bg-black hover:bg-gray-800" : "bg-blue-600 hover:bg-blue-500"
                }`}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : currentView === "downloader" ? <Download className="w-5 h-5" /> : currentView === "tiktok" ? <Video className="w-5 h-5" /> : <Search className="w-5 h-5" />}
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
              <div className="max-w-2xl mx-auto w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row">
                  {/* Thumbnail */}
                  <div 
                    className="w-full md:w-2/5 aspect-square md:aspect-auto bg-gray-100 relative group cursor-pointer"
                    onClick={() => {
                      if (downloaderResult.play || downloaderResult.url) {
                        setActiveVideoUrl(downloaderResult.play || downloaderResult.url);
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
                    
                    {(downloaderResult.play || downloaderResult.url) && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                        <div className="bg-white/90 backdrop-blur-sm text-gray-900 p-4 rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play className="w-8 h-8 ml-1" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Info & Actions */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {downloaderResult.title || "Media Siap Diunduh"}
                    </h3>
                    
                    {downloaderResult.author && (
                      <div className="flex items-center gap-2 mb-6">
                        {downloaderResult.author.avatar && (
                          <img src={downloaderResult.author.avatar} alt="Author" className="w-8 h-8 rounded-full" />
                        )}
                        <span className="text-sm font-medium text-gray-600">
                          @{downloaderResult.author.unique_id || downloaderResult.author.nickname || "User"}
                        </span>
                      </div>
                    )}

                    <div className="mt-auto flex flex-col gap-3">
                      {(downloaderResult.play || downloaderResult.url) && (
                        <>
                          <button 
                            onClick={() => {
                              setActiveVideoUrl(downloaderResult.play || downloaderResult.url);
                              setActiveVideoType("video");
                            }}
                            className="flex items-center justify-center gap-2 w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-xl transition-colors"
                          >
                            <Play className="w-5 h-5" />
                            Preview Video
                          </button>
                          <a 
                            href={downloaderResult.play || downloaderResult.url} 
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
                          className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-xl transition-colors"
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
              <div className="max-w-md mx-auto w-full h-[75vh] bg-black rounded-3xl overflow-y-scroll snap-y snap-mandatory shadow-2xl border-4 border-gray-900 hide-scrollbar relative">
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
                    className={`bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col ${
                      currentView === "gimage" ? "hover:border-pink-300" : "hover:border-green-300"
                    }`}
                  >
                    {currentView === "gimage" ? (
                      // GImage Card
                      <>
                        <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
                          {item.image ? (
                            <ImageWithFallback 
                              src={item.image} 
                              alt={item.title || "Image"} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          
                          {/* Video Overlay */}
                          {item.is_video && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                              <div className="bg-white/90 backdrop-blur-sm text-pink-600 p-3 rounded-full shadow-lg transform group-hover:scale-110 transition-transform">
                                <Play className="w-6 h-6 ml-1" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col">
                          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-pink-600 transition-colors">
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
                        <div className="relative w-full aspect-square bg-gray-100 overflow-hidden">
                          {item.thumbnail ? (
                            <img 
                              src={item.thumbnail} 
                              alt={item.name || "Product"} 
                              loading="lazy"
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 flex-1 flex flex-col gap-1.5">
                          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-green-600 transition-colors">
                            {item.name || "Tanpa Nama"}
                          </h3>
                          <div className="font-bold text-gray-900">
                            {item.price || "Rp0"}
                          </div>
                          <div className="mt-auto pt-2 flex flex-col gap-1 text-xs text-gray-500">
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

            {!loading && !error && currentView !== "downloader" && results.length === 0 && (
              <div className="text-center py-20 text-gray-500 animate-in fade-in">
                {currentView === "gimage" ? (
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                ) : currentView === "tiktok" ? (
                  <Video className="w-12 h-12 mx-auto mb-4 opacity-20" />
                ) : (
                  <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                )}
                <p>Tidak ada hasil yang ditemukan.</p>
              </div>
            )}
            
            {!loading && !error && currentView === "downloader" && !downloaderResult && (
              <div className="text-center py-20 text-gray-500 animate-in fade-in">
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
          <div className="relative w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl bg-black md:rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="absolute top-0 left-0 right-0 z-10 flex justify-end p-4 bg-gradient-to-b from-black/80 to-transparent">
              <button 
                onClick={() => setActiveVideoUrl(null)}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                title="Tutup Video"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Iframe/Video Container */}
            <div className="w-full h-full flex-1 flex items-center justify-center bg-black">
              {activeVideoType === "iframe" ? (
                <iframe 
                  src={activeVideoUrl} 
                  className="w-full h-full min-h-[100dvh] md:min-h-[60vh] border-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                ></iframe>
              ) : (
                <video 
                  src={activeVideoUrl} 
                  controls 
                  autoPlay
                  className="w-full h-full max-h-[100dvh] md:max-h-[80vh] object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                Pengaturan API
              </h2>
              <button onClick={() => setShowSettings(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  API Key
                </label>
                <input
                  type="text"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Masukkan API Key"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              <button
                onClick={saveSettings}
                disabled={!tempApiKey.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                Simpan & Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
