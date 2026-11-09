import React, { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { ChakraProvider, theme } from '@chakra-ui/react';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import App from './App';

//Conexion interfaz - gateway
const client = new ApolloClient({
  uri: import.meta.env.VITE_GATEWAY_URI || 'http://localhost:8080/graphql/',
  cache: new InMemoryCache({
    typePolicies: {
      Profile: { keyFields: ['user_id'] },
      Poll: { keyFields: ['poll_id'] },
      PollOption: { keyFields: ['option_id'] },
    },
  }),
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ApolloProvider client={client}>
      <ChakraProvider theme={theme}>
        <App />
      </ChakraProvider>
    </ApolloProvider>
  </StrictMode>
);
