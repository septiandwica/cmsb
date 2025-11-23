import { useRegisterSW } from "virtual:pwa-register/react";

export function PWAInstaller() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  const refresh = () => {
    updateServiceWorker(true);
    setNeedRefresh(false);
  };

  return (
    <div
      className="
        fixed bottom-4 left-4 right-4 
        max-w-sm mx-auto
        p-4 shadow-lg animate-fadeIn 
        rounded-lg 
        bg-card text-card-foreground
        border border-border
      "
      style={{ zIndex: 9999 }}
    >
      <p className="text-sm font-medium">New update available</p>

      <button
        onClick={refresh}
        className="
          mt-3 px-3 py-1.5 rounded-md text-sm font-medium
          bg-primary text-primary-foreground
          hover:opacity-90 transition
        "
      >
        Refresh
      </button>
    </div>
  );
}
