import { StoresProvider } from '../store';
import './App.css';
import Body from './Body';
import GetOtp from './GetOtp';
import TopBar from './topBar/TopBar';

function App() {
  return (
    <StoresProvider>
      <div className="App">
        <TopBar />
        <Body />
        <GetOtp />
      </div>
    </StoresProvider>
  );
}

export default App;
