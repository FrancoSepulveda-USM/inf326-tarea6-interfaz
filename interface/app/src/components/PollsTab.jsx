import React, { useState } from 'react';
import {
  Badge, Box, Button, Flex, Heading, HStack, Input, NumberInput, NumberInputField,
  Progress, Text, Textarea, VStack, FormControl, FormLabel,
} from '@chakra-ui/react';
import { useMutation, useQuery } from '@apollo/client';

import { CLOSE_POLL, CREATE_POLL, LIST_POLLS, VOTE_POLL } from '../api/queries';
import { formatDate, useNotify } from '../utils';

const STATUS = {
  open: { label: 'Abierta', color: 'green' },
  closed: { label: 'Cerrada', color: 'gray' },
  pending_announcement: { label: 'Publicándose...', color: 'yellow' },
  creation_failed: { label: 'Falló', color: 'red' },
};

// Encuestas del canal (servicio polls de otro equipo, a través del gateway).
export default function PollsTab({ channelId, currentUserId }) {
  const notify = useNotify();
  const [question, setQuestion] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [minutes, setMinutes] = useState('10');

  const refetch = { refetchQueries: [{ query: LIST_POLLS, variables: { channelId } }] };
  const { data, loading, error } = useQuery(LIST_POLLS, { variables: { channelId }, pollInterval: 5000, fetchPolicy: 'cache-and-network' });
  const [createPoll, { loading: creating }] = useMutation(CREATE_POLL, refetch);
  const [votePoll] = useMutation(VOTE_POLL, refetch);
  const [closePoll] = useMutation(CLOSE_POLL, refetch);

  const submit = async e => {
    e.preventDefault();
    const options = optionsText.split('\n').map(o => o.trim()).filter(Boolean);
    if (!question.trim() || options.length < 2) {
      notify.error({ message: 'Escribe una pregunta y al menos 2 alternativas (una por línea)' });
      return;
    }
    try {
      await createPoll({
        variables: { channelId, authorId: currentUserId, question: question.trim(), options, durationMinutes: Number(minutes) || 5 },
      });
      setQuestion('');
      setOptionsText('');
      notify.ok('Encuesta creada (también se anunció en el chat)');
    } catch (err) {
      notify.error(err);
    }
  };

  const vote = async (pollId, optionId) => {
    try {
      await votePoll({ variables: { pollId, voterId: currentUserId, optionId } });
      notify.ok('Voto registrado');
    } catch (err) {
      notify.error(err);
    }
  };

  const close = async pollId => {
    try {
      await closePoll({ variables: { pollId, authorId: currentUserId } });
      notify.ok('Encuesta cerrada');
    } catch (err) {
      notify.error(err);
    }
  };

  const polls = data?.listPolls || [];

  return (
    <Flex gap={6} direction={{ base: 'column', lg: 'row' }} align="flex-start">
      <Box as="form" onSubmit={submit} bg="white" p={4} borderWidth="1px" borderRadius="md" w={{ base: '100%', lg: '320px' }}>
        <Heading size="sm" mb={3}>Nueva encuesta</Heading>
        <FormControl mb={2}>
          <FormLabel fontSize="sm">Pregunta</FormLabel>
          <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="¿Cuándo nos juntamos?" />
        </FormControl>
        <FormControl mb={2}>
          <FormLabel fontSize="sm">Alternativas (una por línea)</FormLabel>
          <Textarea value={optionsText} onChange={e => setOptionsText(e.target.value)} placeholder={'Lunes\nMartes'} rows={4} />
        </FormControl>
        <FormControl mb={3}>
          <FormLabel fontSize="sm">Duración (minutos)</FormLabel>
          <NumberInput min={1} max={1440} value={minutes} onChange={setMinutes}>
            <NumberInputField />
          </NumberInput>
        </FormControl>
        <Button type="submit" colorScheme="purple" w="100%" isLoading={creating}>Crear encuesta</Button>
      </Box>

      <VStack flex="1" align="stretch" spacing={4} w="100%">
        {loading && !data && <Text>Cargando encuestas...</Text>}
        {error && <Text color="red.500">No se pudieron cargar las encuestas (servicio polls)</Text>}
        {!loading && polls.length === 0 && !error && <Text color="gray.500">No hay encuestas en este canal.</Text>}

        {polls.map(p => {
          const status = STATUS[p.status] || { label: p.status, color: 'gray' };
          const isOpen = p.status === 'open';
          return (
            <Box key={p.poll_id} bg="white" p={4} borderWidth="1px" borderRadius="md">
              <HStack justify="space-between" mb={1}>
                <Heading size="sm">{p.question}</Heading>
                <Badge colorScheme={status.color}>{status.label}</Badge>
              </HStack>
              <Text fontSize="xs" color="gray.500" mb={3}>
                Creada por {p.author?.display_name || '?'} · {isOpen ? `cierra ${formatDate(p.closes_at)}` : `cerró ${formatDate(p.closed_at || p.closes_at)}`}
              </Text>

              <VStack align="stretch" spacing={2}>
                {[...p.options].sort((a, b) => a.position - b.position).map(o => {
                  const pct = p.total_votes ? Math.round((o.vote_count / p.total_votes) * 100) : 0;
                  return (
                    <Box key={o.option_id}>
                      <HStack justify="space-between" fontSize="sm">
                        <Text>{o.text}</Text>
                        <HStack>
                          <Text color="gray.600">{o.vote_count} voto(s) ({pct}%)</Text>
                          {isOpen && (
                            <Button size="xs" colorScheme="purple" onClick={() => vote(p.poll_id, o.option_id)}>Votar</Button>
                          )}
                        </HStack>
                      </HStack>
                      <Progress value={pct} size="sm" colorScheme="purple" borderRadius="md" />
                    </Box>
                  );
                })}
              </VStack>

              <HStack justify="space-between" mt={3}>
                <Text fontSize="sm">Total: {p.total_votes} voto(s)</Text>
                {isOpen && p.author_id === currentUserId && (
                  <Button size="xs" colorScheme="red" variant="outline" onClick={() => close(p.poll_id)}>Cerrar encuesta</Button>
                )}
              </HStack>
            </Box>
          );
        })}
      </VStack>
    </Flex>
  );
}
