import { styled } from '@mui/material/styles';
import MuiAppBar from '@mui/material/AppBar';

export const StyledAppBar = styled(MuiAppBar)(({ theme }) => ({
  // Your styles here
  background: theme.palette.primary.main,
  // More custom styles...
}));
