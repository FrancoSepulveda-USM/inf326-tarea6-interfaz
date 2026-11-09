import React, { useState } from 'react';
import { Box, Heading, Input, Button, VStack, Text } from '@chakra-ui/react';
import { useMutation, useQuery } from '@apollo/client';

import { CREATE_CHANNEL, LIST_CHANNELS } from '../api/queries';
import { useNotify } from '../utils';

// Barra lateral: lista de canales y formulario para crear uno.
export default function ChannelList({ selectedId, onSelect }) {
  const notify = useNotify();
  const [name, setName] = useState('');
  const { data, loading, error } = useQuery(LIST_CHANNELS, { pollInterval: 5000 });
  const [createChannel, { loading: creating }] = useMutation(CREATE_CHANNEL, { refetchQueries: [LIST_CHANNELS] });

  const submit = async e => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const { data } = await createChannel({ variables: { name: name.trim() } });
      setName('');
      onSelect(data.createChannel.id);
      notify.ok(`Canal "${data.createChannel.name}" creado`);
    } catch (err) {
      notify.error(err);
    }
  };

  return (
    <Box w="240px" borderRight="1px" borderColor="gray.200" p={4} overflowY="auto">
      <Heading size="sm" mb={3}>Canales</Heading>
      {loading && <Text fontSize="sm">Cargando...</Text>}
      {error && <Text fontSize="sm" color="red.500">No se pudieron cargar los canales</Text>}
      <VStack align="stretch" spacing={1} mb={4}>
        {(data?.listChannels || []).map(c => (
          <Button
            key={c.id} size="sm" justifyContent="flex-start"
            variant={c.id === selectedId ? 'solid' : 'ghost'} colorScheme="teal"
            onClick={() => onSelect(c.id)}
          >
            # {c.name}
          </Button>
        ))}
      </VStack>
      <form onSubmit={submit}>
        <Input size="sm" mb={2} placeholder="Nombre del canal" value={name} onChange={e => setName(e.target.value)} />
        <Button size="sm" w="100%" type="submit" isLoading={creating}>Crear canal</Button>
      </form>
    </Box>
  );
}
