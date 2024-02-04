import React, {useRef} from 'react';
import { AppBar as MuiAppBar, Toolbar, IconButton, Typography, Switch, FormGroup, FormControlLabel, TextField } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import { Menu, MenuItem } from '@mui/material';
import { saveLayout, loadLayout } from '../PixiCanvas/PixiCanvas';  // Adjust the path as necessary



interface AppBarProps {
    isCableEditingMode: boolean;
    setIsCableEditingMode: React.Dispatch<React.SetStateAction<boolean>>;
    isLightsOn: boolean;
    setIsLightsOn: React.Dispatch<React.SetStateAction<boolean>>;
    onAddLedBar: () => void; 
    ledBarLength: string;
    setLedBarLength: React.Dispatch<React.SetStateAction<string>>;
    ledsPerMeter: string;
    setLedsPerMeter: React.Dispatch<React.SetStateAction<string>>;
    scale: string;
    setScale: React.Dispatch<React.SetStateAction<string>>; 
}

const AppBar: React.FC<AppBarProps> = ({ isLightsOn, setIsLightsOn, isCableEditingMode, setIsCableEditingMode, onAddLedBar, ledBarLength, setLedBarLength, ledsPerMeter, setLedsPerMeter, scale, setScale }) => {
  const handleCableEditingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsCableEditingMode(event.target.checked);
  };

  const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(menuAnchorEl);

  const handleLightsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsLightsOn(event.target.checked);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.code === 'Space') {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleSave = () => {
    const layoutData = saveLayout();
    const blob = new Blob([JSON.stringify(layoutData, null, 2)], { type: 'application/json' });
  
    // Create a link and set the URL to the blob
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'layout.json'; // Suggests the filename for download
  
    // Append the link, trigger the click, and then remove the link
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  
    handleMenuClose();
  };

  const handleLoadFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const text = e.target?.result;
            if (typeof text === 'string') {
              const ledBarConfigs = JSON.parse(text);
              if (Array.isArray(ledBarConfigs)) {
                loadLayout(ledBarConfigs); // Pass the array to your load function
              } else {
                throw new Error('The loaded file does not contain an array.');
              }
            }
          } catch (error) {
            console.error('Error loading or parsing file:', error);
            // Handle the error appropriately
          }
        };
        
        reader.onerror = (e) => {
          console.error('FileReader error:', e);
          // Handle FileReader errors appropriately
        };

        reader.readAsText(file);
      }
    }
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click(); // Open the file dialog
    handleMenuClose();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Rest of your AppBar logic...

  return (
    <MuiAppBar position="static">
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        multiple
        accept=".json"
        onChange={handleLoadFiles}
      />
      <Menu
        id="menu-appbar"
        anchorEl={menuAnchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={isMenuOpen}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleSave}>Save</MenuItem>
        <MenuItem onClick={handleLoadClick}>Load</MenuItem>
      </Menu>
      <Toolbar>
        <IconButton edge="start" color="inherit" aria-label="menu" onClick={handleMenuOpen}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          LED Strip Simulator
        </Typography>
        <TextField
            label="Scale"
            variant="outlined"
            value={scale}
            onChange={(e) => setScale(e.target.value)}
            style={{ margin: '0 10px' }}
        />
        <TextField
          label="LED Bar Length (m)"
          variant="outlined"
          value={ledBarLength}
          onChange={(e) => setLedBarLength(e.target.value)}
          style={{ margin: '0 10px' }}
        />
        <TextField
          label="LEDs per Meter"
          variant="outlined"
          value={ledsPerMeter}
          onChange={(e) => setLedsPerMeter(e.target.value)}
          style={{ margin: '0 10px' }}
        />
        <IconButton color="inherit" onClick={onAddLedBar}>
          <AddIcon />
        </IconButton>
        <FormGroup row>
          <FormControlLabel
            control={<Switch checked={isCableEditingMode} onChange={handleCableEditingChange} onKeyDown={handleKeyDown}/>}
            label="Cable Editing"
          />
          <FormControlLabel
            control={<Switch checked={isLightsOn} onChange={handleLightsChange} onKeyDown={handleKeyDown}/>}
            label="Lights"
          />
        </FormGroup>
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar;
