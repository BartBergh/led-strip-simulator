// websocketService.js
class WebSocketService {
    constructor(url, onLedDataReceived, id) {
      this.url = url;
      this.onLedDataReceived = onLedDataReceived;
      this.ws = null;
      this.id = id;
      this.amountOfLeds = null;
    }
  
    connect() {
      this.ws = new WebSocket(this.url);
  
      this.ws.onopen = () => {
        console.log('WebSocket Connected');
        this.ws.send(JSON.stringify({"lv": true}));
      };
  
      this.ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
            // It's a binary message, read it as ArrayBuffer
            const reader = new FileReader();
            reader.onload = () => {
              // The reader.result contains the contents of the blob as a typed array
              const arrayBuffer = reader.result;
              const ledData = this.parseLedData(new Uint8Array(arrayBuffer));
              this.onLedDataReceived(ledData, this.id);
            };
            reader.onerror = (e) => {
              console.error('FileReader error:', e);
            };
            reader.readAsArrayBuffer(event.data);
          } else {
            console.log('WebSocket Message Received:', event.data);
            const data = JSON.parse(event.data);
            if (data.info) {
              this.amountOfLeds = data.info.leds.count;
            }
          }
        
      };
  
      this.ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
      };
  
      this.ws.onclose = () => {
        console.log('WebSocket Disconnected');
      };
    }
  
    parseLedData(data) {
        const hexString = Array.from(data).map(byte => byte.toString(16).padStart(2, '0')).join('');
        const hexStringWithoutHeader = hexString.substring(4);
        const hexValues = [];
        for (let i = 0; i < hexStringWithoutHeader.length; i += 6) {
            let hexValue = hexStringWithoutHeader.substr(i, 6);
            hexValue = parseInt(hexValue, 16)
            hexValues.push(hexValue);
            if (this.amountOfLeds > 1024) {
              hexValues.push(hexValue); // wled halves the data if it's too long, so we need to double it, we lose resolution but it's better than nothing
            }    
        }
        return hexValues;
    }
  
    disconnect() {
      if (this.ws) {
        this.ws.close();
      }
    }
  }
  
  export default WebSocketService;
  
