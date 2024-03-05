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
  const websocketURLS = ['ws://192.168.2.78/ws', 'ws://192.168.2.99/ws']


  
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
    const webSocketServices: WebSocketService[] = [];

    websocketURLS.forEach((url, index) => {
      const webSocketService = new WebSocketService(url, updateLedDisplay, -index - 1);
      webSocketService.connect();
      webSocketServices.push(webSocketService);
    });

    if (isLightsOn && webSocketServices.length === 0) {
      const newWebSocketServices: WebSocketService[] = [];
      websocketURLS.forEach((url, index) => {
        const newWebSocketService = new WebSocketService(url, updateLedDisplay, -index - 1);
        newWebSocketService.connect();
        newWebSocketServices.push(newWebSocketService);
      });
      setWebSocketService(newWebSocketServices);
    } else if (!isLightsOn && webSocketServices.length > 0) {
      webSocketServices.forEach((webSocketService) => {
        webSocketService.disconnect();
      });
      setWebSocketService(null); // Clear the WebSocket service instances
    }

    return () => {
      webSocketServices.forEach((webSocketService) => {
        webSocketService.disconnect();
      });
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
