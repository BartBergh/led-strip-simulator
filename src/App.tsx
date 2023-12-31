import React, { useState, useEffect } from 'react';
import AppBar from './components/AppBar/AppBar';
import { CssBaseline } from '@mui/material';
import PixiCanvas from './components/PixiCanvas/PixiCanvas';
import { METERS_TO_PIXELS, applyColors } from './components/PixiCanvas/PixiCanvas';
import WebSocketService from './services/websocketService';

const App: React.FC = () => {
  const [isCableEditingMode, setIsCableEditingMode] = useState(false);
  const [isLightsOn, setIsLightsOn] = useState(false);
  const [ledBarConfigs, setLedBarConfigs] = useState<LedBarData[]>([]);
  const [ledBarLength, setLedBarLength] = useState('');  // Length in meters
  const [ledsPerMeter, setLedsPerMeter] = useState('');  // LEDs per meter
  const [webSocketService, setWebSocketService] = useState<WebSocketService | null>(null);

  const WEBSOCKET_URL = 'ws://192.168.0.123/ws';

  // Function to add a new LedBar
  const addLedBar = () => {
    const length = ledBarLength === '' ? 1 : parseFloat(ledBarLength);
    const lengthInPixels = length * METERS_TO_PIXELS;

    // Determine the new end position based on the length
    const newEndX = 100 + lengthInPixels;  // Assuming a horizontal LED bar for simplicity

    const newLedBar: LedBarData = {
      start: { x: 100, y: 100 },
      end: { x: newEndX, y: 100 },
      id: ledBarConfigs.length
    };
    setLedBarConfigs([...ledBarConfigs, newLedBar]);
  };

  useEffect(() => {
    const webSocketService = new WebSocketService(WEBSOCKET_URL, updateLedDisplay);

    webSocketService.connect();

    if (isLightsOn && !webSocketService) {
      const newWebSocketService = new WebSocketService(WEBSOCKET_URL, updateLedDisplay);
      newWebSocketService.connect();
      setWebSocketService(newWebSocketService);
    } else if (!isLightsOn && webSocketService) {
      webSocketService.disconnect();
      setWebSocketService(null); // Clear the WebSocket service instance
    }

    return () => {
      webSocketService.disconnect();
    };
  }, [isLightsOn]);

  function updateLedDisplay(ledData: number[]): void {
    // Update your PixiJS visualization with the new LED data
    applyColors(ledData);
   }

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
        ledBarLength={ledBarLength}
        setLedBarLength={setLedBarLength}
        ledsPerMeter={ledsPerMeter}
        setLedsPerMeter={setLedsPerMeter}
        onAddLedBar={addLedBar}
      />
      <div>
            <PixiCanvas ledBarConfigs={ledBarConfigs} isCableEditingMode={isCableEditingMode} isLightsOn={isLightsOn}/>
      </div>
    </>
  );
};

export default App;
