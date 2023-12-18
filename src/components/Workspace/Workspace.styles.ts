import { styled } from '@mui/material/styles';
import Paper from '@mui/material/Paper';

export const StyledWorkspace = styled(Paper)(({ theme }) => ({
backgroundColor: '#000001', // Use a color suitable for dark mode
//   backgroundImage: 'your grid image or pattern', // Add your grid pattern here
  height: 'calc(100vh - 64px - 32px)', // Adjust height as necessary
  margin: theme.spacing(2),
  padding: theme.spacing(2),
  // Add any additional styles you want for your workspace
}));
