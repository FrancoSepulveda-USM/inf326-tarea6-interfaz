import React, { useState } from 'react';
import { Flex, Heading, Spacer, Select, Input, Button, HStack, Text } from '@chakra-ui/react';
import { useMutation, useQuery } from '@apollo/client';

import { CREATE_USER, LIST_USERS } from '../api/queries';
import { useNotify } from '../utils';

// Barra superior: elegir usuario actual, crear usuario y ver mi perfil.
export default function UserBar({ currentUserId, onChangeUser, onOpenProfile }) {
  const notify = useNotify();
  const [name, setName] = useState('');
  const { data } = useQuery(LIST_USERS);
  const [createUser, { loading }] = useMutation(CREATE_USER, { refetchQueries: [LIST_USERS] });

  const users = data?.listUsers || [];

  const submit = async e => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const { data } = await createUser({ variables: { displayName: name.trim() } });
      onChangeUser(data.createUser.id);
      setName('');
      notify.ok(`Usuario "${data.createUser.display_name}" creado`);
    } catch (error) {
      notify.error(error);
    }
  };

  return (
    <Flex bg="teal.600" color="white" px={6} py={3} align="center" gap={4} wrap="wrap">
      <Heading size="md">💬 Chat Microservicios</Heading>
      <Spacer />
      <HStack as="form" onSubmit={submit}>
        <Input
          size="sm" bg="white" color="black" w="160px" placeholder="Nombre nuevo usuario"
          value={name} onChange={e => setName(e.target.value)}
        />
        <Button size="sm" type="submit" isLoading={loading}>Crear usuario</Button>
      </HStack>
      <HStack>
        <Text fontSize="sm">Usuario actual:</Text>
        <Select
          size="sm" bg="white" color="black" w="180px" placeholder="Elegir usuario"
          value={currentUserId} onChange={e => onChangeUser(e.target.value)}
        >
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.display_name}</option>
          ))}
        </Select>
        <Button size="sm" onClick={onOpenProfile} isDisabled={!currentUserId}>Mi perfil</Button>
      </HStack>
    </Flex>
  );
}
