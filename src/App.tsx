import React, { useState } from 'react';
import AppBar from './components/AppBar/AppBar';
import { CssBaseline } from '@mui/material';
import PixiCanvas from './components/PixiCanvas/PixiCanvas';

const App: React.FC = () => {
  const [isCableEditingMode, setIsCableEditingMode] = useState(false);
  const [isLightsOn, setIsLightsOn] = useState(false);
  const [ledBarConfigs, setLedBarConfigs] = useState<LedBarData[]>([]);

  // Function to add a new LedBar
  const addLedBar = () => {
    const newLedBar: LedBarData = {
      start: { x: 100, y: 100 },
      end: { x: 400, y: 100 },
      id: ledBarConfigs.length
    };
    setLedBarConfigs([...ledBarConfigs, newLedBar]);
  };



  interface LedBarData {
    start: {
      x: number;
      y: number;
    };
    end: {
      x: number;
      y: number;
    };
    id: number;
  }


  return (
    <>
      <CssBaseline />
      <AppBar
        isCableEditingMode={isCableEditingMode}
        setIsCableEditingMode={setIsCableEditingMode}
        isLightsOn={isLightsOn}
        setIsLightsOn={setIsLightsOn}
        onAddLedBar={addLedBar}
      />
      <div>
            <PixiCanvas ledBarConfigs={ledBarConfigs} isCableEditingMode={isCableEditingMode} isLightsOn={isLightsOn}/>
      </div>
    </>
  );
};

export default App;
