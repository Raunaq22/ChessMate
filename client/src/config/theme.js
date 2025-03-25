import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  styles: {
    global: {
      body: {
        bg: 'chess-dark',
        color: 'gray.800',
      },
    },
  },
  colors: {
    brand: {
      50: '#f5f3ff',
      100: '#ede9fe',
      500: '#6366f1',
      600: '#4f46e5',
      900: '#312e81',
    },
    'chess-dark': '#706C61',
    'chess-light': '#899E8B',
    'chess-hover': '#99C5B5',
    'primary': '#76ABAE',
    'secondary': '#EEEEEE'
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'bold',
      },
      variants: {
        primary: {
          bg: 'primary',
          color: 'white',
          _hover: {
            bg: 'blue.600',
          },
        },
        secondary: {
          bg: 'secondary',
          color: 'white',
          _hover: {
            bg: 'blue.400',
          },
        },
      },
    },
  },
});

export default theme;