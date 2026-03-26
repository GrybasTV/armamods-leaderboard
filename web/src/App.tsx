import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ModList } from './components/ModList';
import { ServerList } from './components/ServerList';
import { ServerDetail } from './components/ServerDetail';
import { ModDetail } from './components/ModDetail';
import { TrendingPage } from './components/TrendingPage';
import { SupportPage } from './components/SupportPage';
import { Layout } from './components/Layout';

function App() {
  return (
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
  );
}

export default App;
