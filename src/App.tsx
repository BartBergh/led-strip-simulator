import React, { useState } from 'react';
import AppBar from './components/AppBar/AppBar';
import Workspace from './components/Workspace/Workspace';
import { CssBaseline } from '@mui/material';
import { LedBar } from './components/LedBarComponent/LedBarComponent';

const App: React.FC = () => {
  const [isCableEditingMode, setIsCableEditingMode] = useState(false);
  const [isLightsOn, setIsLightsOn] = useState(false);
  const [ledBars, setLedBars] = useState<LedBar[]>([]);
  const [isPlacementActive, setIsPlacementActive] = useState(false);
  const [temporaryPosition, setTemporaryPosition] = useState({ x: 0, y: 0 });

  const handleAddLedBar = () => {
    console.log('Adding LED bar', ledBars); // For debugging
    setIsPlacementActive(true);
  };

  const handleFinalizePlacement = (position: { x: number, y: number }) => {
    console.log('Finalizing placement at: ', ledBars); // For debugging
    const newLedBar: LedBar = {
      id: ledBars.length,
      length: 100, // Example length
      color: 'white', // Example color
      ledsPerMeter: 60, // Example LEDs per meter
      position,
    };
    setLedBars([...ledBars, newLedBar]);
    setIsPlacementActive(false);
  };

  return (
    <>
      <CssBaseline />
      <AppBar
        isCableEditingMode={isCableEditingMode}
        setIsCableEditingMode={setIsCableEditingMode}
        isLightsOn={isLightsOn}
        setIsLightsOn={setIsLightsOn}
        onAddLedBar={handleAddLedBar}
      />
      <Workspace 
        isCableEditingMode={isCableEditingMode} 
        isLightsOn={isLightsOn} ledBars={ledBars}
        isPlacementActive={isPlacementActive} 
        temporaryPosition={temporaryPosition}
        onFinalizePlacement={handleFinalizePlacement} 
        setTemporaryPosition={setTemporaryPosition}
      />
      {/* Other components will go here */}
    </>
  );
};

export default App;
