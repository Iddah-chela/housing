import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

const InstallPWA = ({ isScrolled }) => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Hide if already installed
    window.addEventListener('appinstalled', () => {
      setShowInstall(false);
      setDeferredPrompt(null);
    });

    // Check if running as standalone (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstall(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  if (!showInstall) return null;

  return (
    <button
      onClick={handleInstall}
      className={`flex items-center gap-1.5 border px-3 py-1 text-sm font-light rounded-full cursor-pointer transition-all ${
        isScrolled
          ? 'text-indigo-600 border-indigo-500 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:border-indigo-400 dark:text-indigo-300'
          : 'text-white border-white/60 bg-white/10 hover:bg-white/20'
      }`}
      title="Install PataKeja app"
    >
      <Download className="w-3.5 h-3.5" />
      Install
    </button>
  );
};

export default InstallPWA;
