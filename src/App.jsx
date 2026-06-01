import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Game from './pages/Game';
import SceneBuilder from './pages/SceneBuilder';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Game />} />
        <Route path="/config" element={<SceneBuilder />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
