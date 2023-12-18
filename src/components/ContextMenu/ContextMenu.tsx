import React, { CSSProperties } from 'react';
import AddIcon from '@mui/icons-material/Add';
import SettingsIcon from '@mui/icons-material/Settings';
import EditIcon from '@mui/icons-material/Edit';
import { IconButton, Tooltip} from '@mui/material';


interface ContextMenuProps {
  mouseX: number | null;
  mouseY: number | null;
  handleClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ mouseX, mouseY, handleClose }) => {
  if (mouseX === null || mouseY === null) return null;

  const menuItems = [
    { icon: <AddIcon />, action: () => {/* logic for creating LED bar with last values */}, label: 'Create with Last Values' },
    { icon: <SettingsIcon />, action: () => {/* logic for creating LED bar with default values */}, label: 'Create with Default Values' },
    { icon: <EditIcon />, action: () => {/* logic for manual creation */}, label: 'Create Manually' },
  ];

  const style: CSSProperties = {
    position: 'absolute',
    left: `${mouseX}px`,
    top: `${mouseY}px`,
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  };

  return (
    <div style={style}>
      {menuItems.map((item, index) => (
        <Tooltip title={item.label} key={index}>
          <IconButton onClick={item.action}>
            {item.icon}
          </IconButton>
        </Tooltip>
      ))}
    </div>
  );
};

export default ContextMenu;
