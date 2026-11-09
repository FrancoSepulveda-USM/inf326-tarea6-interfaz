import React, { useEffect, useRef, useState } from 'react';
import { Avatar, Badge, Box, Button, Flex, HStack, Input, Text, VStack } from '@chakra-ui/react';
import { useMutation, useQuery } from '@apollo/client';

import { LIST_MESSAGES, SEND_MESSAGE } from '../api/queries';
import { formatDate, useNotify } from '../utils';

// Mensajes del canal. El autor (nombre + foto) lo junta el API Gateway
// desde los servicios users y profiles.
export default function MessagesTab({ channelId, currentUserId, onOpenProfile, onOpenPolls }) {
  const notify = useNotify();
  const [text, setText] = useState('');
  const bottom = useRef(null);
  const { data, loading, error } = useQuery(LIST_MESSAGES, {
    variables: { channelId },
    pollInterval: 3000, // se actualiza solo cada 3 segundos
    fetchPolicy: 'cache-and-network',
  });
  const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
    refetchQueries: [{ query: LIST_MESSAGES, variables: { channelId } }],
  });

  const messages = data?.listMessages || [];

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const submit = async e => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await sendMessage({ variables: { channelId, authorId: currentUserId, content: text.trim() } });
      setText('');
    } catch (err) {
      notify.error(err);
    }
  };

  return (
    <Box>
      <VStack align="stretch" spacing={3} bg="white" p={4} borderRadius="md" borderWidth="1px" h="55vh" overflowY="auto">
        {loading && !data && <Text>Cargando mensajes...</Text>}
        {error && <Text color="red.500">No se pudieron cargar los mensajes</Text>}
        {!loading && messages.length === 0 && <Text color="gray.500">No hay mensajes todavía. ¡Escribe el primero!</Text>}
        {messages.map(m => (
          <Flex key={m.id} gap={3} align="flex-start">
            <Avatar
              size="sm" cursor="pointer"
              name={m.author?.display_name} src={m.author?.profile?.avatar_url || undefined}
              onClick={() => m.author && onOpenProfile(m.author.id)}
            />
            <Box>
              <HStack spacing={2}>
                <Text
                  fontWeight="bold" fontSize="sm" cursor="pointer" _hover={{ textDecoration: 'underline' }}
                  onClick={() => m.author && onOpenProfile(m.author.id)}
                >
                  {m.author?.display_name || 'Usuario desconocido'}
                </Text>
                {m.author?.profile?.status && <Text fontSize="xs" color="gray.500">({m.author.profile.status})</Text>}
                <Text fontSize="xs" color="gray.400">{formatDate(m.created_at)}</Text>
                {m.poll_id && <Badge colorScheme="purple">Encuesta</Badge>}
              </HStack>
              <Text whiteSpace="pre-wrap">{m.content}</Text>
              {m.poll_id && (
                <Button size="xs" mt={1} colorScheme="purple" variant="outline" onClick={onOpenPolls}>
                  Ir a votar
                </Button>
              )}
            </Box>
          </Flex>
        ))}
        <div ref={bottom} />
      </VStack>

      <HStack as="form" onSubmit={submit} mt={3}>
        <Input bg="white" placeholder="Escribe un mensaje..." value={text} onChange={e => setText(e.target.value)} />
        <Button type="submit" colorScheme="teal" isLoading={sending}>Enviar</Button>
      </HStack>
    </Box>
  );
}
