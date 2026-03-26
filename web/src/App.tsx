import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ModList } from './components/ModList';
import { ServerList } from './components/ServerList';
import { ServerDetail } from './components/ServerDetail';
import { ModDetail } from './components/ModDetail';
import { TrendingPage } from './components/TrendingPage';
import { SupportPage } from './components/SupportPage';
import { Layout } from './components/Layout';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-red-500 p-20 font-mono">
          <h1 className="text-4xl font-black mb-8">// SYSTEM_CRITICAL_FAILURE</h1>
          <div className="bg-red-950/20 border border-red-900/50 p-8 rounded-lg mb-8">
            <p className="font-bold mb-4">Error Details:</p>
            <pre className="text-xs bg-black/40 p-4 border border-white/5 overflow-auto max-h-[400px]">
              {this.state.error?.stack || this.state.error?.message}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-red-600 text-white font-black hover:bg-white hover:text-black transition-all"
          >
            REBOOT SYSTEM (RELOAD)
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<ModList />} />
            <Route path="/servers" element={<ServerList />} />
            <Route path="/server/:serverId" element={<ServerDetail />} />
            <Route path="/mod/:modId" element={<ModDetail />} />
            <Route path="/trending" element={<TrendingPage />} />
            <Route path="/support" element={<SupportPage />} />
          </Routes>
        </Layout>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
