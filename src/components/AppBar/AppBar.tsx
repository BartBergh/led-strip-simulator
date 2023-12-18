import React from 'react';
import { AppBar as MuiAppBar, Toolbar, IconButton, Typography, Switch, FormGroup, FormControlLabel } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';

interface AppBarProps {
    isCableEditingMode: boolean;
    setIsCableEditingMode: React.Dispatch<React.SetStateAction<boolean>>;
    isLightsOn: boolean;
    setIsLightsOn: React.Dispatch<React.SetStateAction<boolean>>;
    onAddLedBar: () => void; 
}

const AppBar: React.FC<AppBarProps> = ({ isLightsOn, setIsLightsOn, isCableEditingMode, setIsCableEditingMode, onAddLedBar }) => {
  const handleCableEditingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsCableEditingMode(event.target.checked);
  };

  const handleLightsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIsLightsOn(event.target.checked);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.code === 'Space') {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  // Rest of your AppBar logic...

  return (
    <MuiAppBar position="static">
      <Toolbar>
        <IconButton edge="start" color="inherit" aria-label="menu">
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          LED Strip Simulator
        </Typography>
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
