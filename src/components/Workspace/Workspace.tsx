import React, { useState, useEffect, useRef } from 'react';
// Import any additional components you might need from MUI
import { Paper } from '@mui/material';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import ContextMenu from '../ContextMenu/ContextMenu';
import LedBarComponent from '../LedBarComponent/LedBarComponent';
import { LedBar } from '../LedBarComponent/LedBarComponent';
import { StyledWorkspace } from './Workspace.styles';

interface WorkspaceProps {
  isCableEditingMode: boolean;
  isLightsOn: boolean;
  ledBars: LedBar[];
  isPlacementActive: boolean;
  temporaryPosition: { x: number; y: number };
  setTemporaryPosition: (position: { x: number; y: number }) => void;
  onFinalizePlacement: (position: { x: number, y: number }) => void;
}

const Workspace: React.FC<WorkspaceProps> = ({ isCableEditingMode, isLightsOn, ledBars, isPlacementActive, temporaryPosition, onFinalizePlacement, setTemporaryPosition }) => {
    const [isSpacePressed, setIsSpacePressed] = useState(false);
    const [transformState, setTransformState] = useState({ scale: 1, positionX: 0, positionY: 0 });
    const workspaceRef = useRef<HTMLDivElement>(null);

    const updateTransformState = (transform: ReactZoomPanPinchRef) => {
        setTransformState({
          scale: transform.state.scale,
          positionX: transform.state.positionX,
          positionY: transform.state.positionY,
        });
    };
  

    const gridStyle = {
        width: '10000px',
        height: '10000px',
        backgroundSize: '10px 10px',
        backgroundImage: `
                        linear-gradient(to right, rgba(255, 255, 255, .1) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, .1) 1px, transparent 1px)
                        `
    };

    const noGridStyle = {
        width: '100%',
        height: '100%',
    };

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.code === 'Space') {
          setIsSpacePressed(true);
        }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
        if (event.code === 'Space') {
          setIsSpacePressed(false);
        }
    };

    const [contextMenu, setContextMenu] = React.useState<{ mouseX: number | null; mouseY: number | null } >({
        mouseX: null,
        mouseY: null
      });

    const handleContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        console.log("Context menu triggered at: ", event.clientX, event.clientY); // For debugging
        setContextMenu({
            mouseX: event.clientX,
            mouseY: event.clientY,
        });
    };
      
 
    const handleClose = () => {
        setContextMenu({ mouseX: null, mouseY: null });
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
    
        return () => {
          window.removeEventListener('keydown', handleKeyDown);
          window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (workspaceRef.current) {
            const rect = workspaceRef.current.getBoundingClientRect();
            const x = (event.clientX - rect.left) / (transformState.scale * rect.width) * 10000; // 10000 is the size of the workspace
            const y = ((event.clientY - rect.top) / (transformState.scale * rect.height) * 10000) - 20;
            setTemporaryPosition({ x, y });
        }
    };    
    
    const handleWorkspaceClick = () => {
    if (isPlacementActive) {
        onFinalizePlacement(temporaryPosition);
    }
    };

    return (
        <StyledWorkspace sx={{ 
            position: 'relative',
            overflow: 'hidden',
            height: 'calc(100vh - 100px)', // Adjust the height as necessary
            margin: '16px',
            cursor: isSpacePressed ? 'grab' : 'default',
          }}>            
            <TransformWrapper
            maxScale={5}
            minScale={1.1}
            initialScale={2}
            panning={{activationKeys: [' ']}}
            >
                <TransformComponent>
                    <div style={{ ...isLightsOn ? noGridStyle : gridStyle}} onMouseMove={handleMouseMove} onClick={handleWorkspaceClick} ref={workspaceRef}>
                    {isPlacementActive && <LedBarComponent {...{id:-1, length: 100, color: 'rgba(255, 255, 255, 0.5)', ledsPerMeter: 60, position: temporaryPosition}} />}
                    {ledBars.map(ledBar => (
                        <LedBarComponent key={ledBar.id} {...ledBar} />
                    ))}
                    </div>
                    
                </TransformComponent>
            </TransformWrapper>
        </StyledWorkspace>
    );
};

export default Workspace;
