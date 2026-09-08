import { BrowserRouter as Router, Routes, Route , } from 'react-router-dom';
import './App.css';

import LandingPage from './pages/LandingPage';
import Authentication from './pages/Authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import Home from './pages/Home';
import HistoryPage from './pages/History';

function App() {
  return (
    <>
      <Router>
        <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path='/home' element={<Home/>}/>
          <Route path='/auth' element={<Authentication/>} />
          <Route path='/:url' element={<VideoMeetComponent/>}/>
          <Route path='/history' element={<HistoryPage/>}/>
        </Routes>
        </AuthProvider>
      </Router>
    </>
  );
}

export default App;