import React from 'react';
// ... other imports

export interface LedBar {
  id: number; // Unique identifier for each LED bar
  length: number; // Length of the LED bar
  ledsPerMeter: number; // Number of LEDs per meter
  color: string; // Color of the LED bar
  position: { x: number, y: number }; // Position of the LED bar
  // Add other properties as needed
}

const LedBarComponent: React.FC<LedBar> = ({ length, color, ledsPerMeter, position }) => {
  const style: React.CSSProperties = {
    position: 'absolute', // Add position absolute
    width: `${length}px`, // Use the length prop to set the width
    height: '10px', // Fixed height for the LED bar
    backgroundColor: color,
    borderRadius: '3px', // Rounded corners
    margin: '10px 0', // Add some margin for separation
    left: `${position.x}px`, // Positioning based on the passed position
    top: `${position.y}px`,
  };

  return (
    <div style={style}>
      {/* LED bar content */}
    </div>
  );
};

export default LedBarComponent;
