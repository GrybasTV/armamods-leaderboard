

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
        <div className="relative h-20 w-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100 scale-125 animate-ping opacity-20"></div>
          <div className="absolute inset-0 rounded-full border-b-2 border-r-2 border-blue-600 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-blue-600 font-bold text-xs uppercase tracking-widest animate-pulse">Load</div>
        </div>
      );
      case 'error': return <div className="text-6xl text-red-100 flex items-center justify-center p-8 rounded-full border-4 border-red-50 mb-6 bg-red-600/10">❌</div>;
      case 'empty': return <div className="text-6xl text-yellow-100 flex items-center justify-center p-8 rounded-full border-4 border-yellow-50 mb-6 bg-yellow-600/10">🔍</div>;
    }
  };

  const colors = {
    loading: 'text-blue-600',
    error: 'text-red-700',
    empty: 'text-yellow-700'
  };

  const bgGradient = {
    loading: 'from-blue-50 to-white',
    error: 'from-red-50 to-white',
    empty: 'from-yellow-50 to-white'
  };

  return (
    <div className={`
      flex flex-col items-center justify-center min-h-[500px] w-full 
      bg-gradient-to-b ${bgGradient[type]} border-2 border-gray-100 rounded-3xl p-16
      shadow-2xl shadow-gray-200/50 backdrop-blur-sm
    `}>
      <div className="transform hover:scale-110 transition-transform duration-500 mb-8">
        {getIcon()}
      </div>
      <h3 className={`text-4xl font-black ${colors[type]} mb-4 drop-shadow-sm`}>
        {message || (type === 'loading' ? 'Gathering Data' : type === 'error' ? 'Connection Problem' : 'No Results Found')}
      </h3>
      {details && (
        <p className="text-gray-500 max-w-md mx-auto mb-10 text-lg font-medium italic leading-relaxed">
          {details}
        </p>
      )}
      {onAction && actionText && (
        <button
          onClick={onAction}
          className={`
            px-12 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl 
            hover:shadow-2xl hover:shadow-blue-200 transition-all font-black uppercase tracking-widest text-sm
            hover:-translate-y-1 active:translate-y-0
          `}
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
