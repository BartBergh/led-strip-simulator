import React, { useState, useEffect } from 'react';
import AppBar from './components/AppBar/AppBar';
import { CssBaseline } from '@mui/material';
import PixiCanvas from './components/PixiCanvas/PixiCanvas';
import { meterToPixels, applyColors } from './components/PixiCanvas/PixiCanvas';
import WebSocketService from './services/websocketService';

const App: React.FC = () => {
  const [isCableEditingMode, setIsCableEditingMode] = useState(false);
  const [isLightsOn, setIsLightsOn] = useState(false);
  const [ledBarConfigs, setLedBarConfigs] = useState<LedBarData[]>([]);
  const [ledBarLength, setLedBarLength] = useState('');  // Length in meters
  const [ledsPerMeter, setLedsPerMeter] = useState('');  // LEDs per meter
  const [scale, setScale] = useState('');  // Scale in pixels per meter
  const [, setWebSocketService] = useState<WebSocketService[] | null>(null);
  const WEBSOCKET_URL1 = 'ws://192.168.0.123/ws';
  const WEBSOCKET_URL2 = 'ws://192.168.0.124/ws';

  // Function to add a new LedBar
  const addLedBar = () => {
    const length = ledBarLength === '' ? 1 : parseFloat(ledBarLength);
    const ledsPMeter = ledsPerMeter === '' ? 60 : parseFloat(ledsPerMeter);
    const lengthInPixels = length * meterToPixels;

    // Determine the new end position based on the length
    const newEndX = 100 + lengthInPixels;  // Assuming a horizontal LED bar for simplicity

    const newLedBar: LedBarData = {
      start: { x: 100, y: 100 },
      end: { x: newEndX, y: 100 },
      ledsPerMeter: ledsPMeter,
      id: ledBarConfigs.length
    };
    setLedBarConfigs([...ledBarConfigs, newLedBar]);
  };

  document.addEventListener('contextmenu', event => {
    event.preventDefault();
  });

  useEffect(() => {
    const webSocketService1 = new WebSocketService(WEBSOCKET_URL1, updateLedDisplay, -1);
    const webSocketService2 = new WebSocketService(WEBSOCKET_URL2, updateLedDisplay, -2);

    webSocketService1.connect();
    webSocketService2.connect();

    if (isLightsOn && !webSocketService1 && !webSocketService2) {
      const newWebSocketService1 = new WebSocketService(WEBSOCKET_URL1, updateLedDisplay);
      const newWebSocketService2 = new WebSocketService(WEBSOCKET_URL2, updateLedDisplay);
      newWebSocketService1.connect();
      newWebSocketService2.connect();
      setWebSocketService([newWebSocketService1, newWebSocketService2]);
    } else if (!isLightsOn && webSocketService1) {
      webSocketService1.disconnect();
      webSocketService2.disconnect();
      setWebSocketService(null); // Clear the WebSocket service instance
    }

    return () => {
      webSocketService1.disconnect();
      webSocketService2.disconnect();
    };
  }, [isLightsOn]);

  function updateLedDisplay(ledData: number[], id:number): void {
    // Update your PixiJS visualization with the new LED data
    applyColors(ledData, id);
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
    ledsPerMeter: number;
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
        scale={scale}
        setScale={setScale}
        onAddLedBar={addLedBar}
      />
      <div>
            <PixiCanvas ledBarConfigs={ledBarConfigs} isCableEditingMode={isCableEditingMode} isLightsOn={isLightsOn}/>
      </div>
    </>
  );
};

export default App;
