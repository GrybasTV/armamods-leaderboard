

interface StatusStateProps {
  type: 'loading' | 'error' | 'empty';
  message?: string;
  details?: string;
  onAction?: () => void;
  actionText?: string;
}

export function StatusState({ type, message, details, onAction, actionText }: StatusStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'loading': return (
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 bg-tactical-orange animate-pulse"></div>
            <div className="w-2 h-2 bg-tactical-orange/60 animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-tactical-orange/40 animate-pulse delay-200"></div>
            <div className="w-1 h-1 bg-tactical-orange/20 animate-pulse delay-300"></div>
          </div>
          <div className="text-[8px] text-gray-600 font-mono uppercase tracking-[0.3em] space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-tactical-orange">▸</span>
              <span>Establishing Uplink...</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-tactical-orange">▸</span>
              <span>Fetching Telemetry...</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-tactical-orange animate-pulse">▸</span>
              <span className="animate-pulse">Processing Intel...</span>
            </div>
          </div>
        </div>
      );
      case 'error': return (
        <div className="text-6xl mb-6">
          <div className="w-24 h-24 border-4 border-red-900/30 rounded-lg flex items-center justify-center bg-red-950/20">
            <span className="text-red-500">⚠</span>
          </div>
        </div>
      );
      case 'empty': return (
        <div className="text-6xl mb-6">
          <div className="w-24 h-24 border-4 border-yellow-900/30 rounded-lg flex items-center justify-center bg-yellow-950/20">
            <span className="text-yellow-500">Ø</span>
          </div>
        </div>
      );
    }
  };

  const colors = {
    loading: 'text-tactical-orange',
    error: 'text-red-500',
    empty: 'text-yellow-500'
  };

  const borderColor = {
    loading: 'border-tactical-orange/20',
    error: 'border-red-900/30',
    empty: 'border-yellow-900/30'
  };

  return (
    <div className={`
      flex flex-col items-center justify-center min-h-[500px] w-full
      bg-zinc-900/50 backdrop-blur-sm border-2 ${borderColor[type]} rounded-lg p-16
      shadow-2xl shadow-black/50
    `}>
      <div className="mb-8">
        {getIcon()}
      </div>
      <h3 className={`text-3xl font-black ${colors[type]} mb-4 uppercase tracking-widest`}>
        {message || (type === 'loading' ? 'LOADING INTEL' : type === 'error' ? 'CONNECTION FAILED' : 'NO DATA FOUND')}
      </h3>
      {details && (
        <p className="text-gray-500 max-w-md mx-auto mb-10 text-sm font-medium uppercase tracking-wider text-center">
          {details}
        </p>
      )}
      {onAction && actionText && (
        <button
          onClick={onAction}
          className={`
            px-8 py-4 bg-tactical-orange text-black border-2 border-tactical-orange/40
            hover:bg-white hover:border-tactical-orange transition-all font-black uppercase tracking-widest text-xs
            hover:shadow-[0_0_20px_rgba(255,107,0,0.3)]
          `}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
