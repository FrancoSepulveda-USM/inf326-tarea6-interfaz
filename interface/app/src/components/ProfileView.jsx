import React, { useEffect, useRef, useState } from 'react';
import {
  Avatar, Box, Button, Divider, Flex, FormControl, FormLabel, Heading, HStack, Input,
  Link, SimpleGrid, Tag, Text, Textarea, Wrap,
} from '@chakra-ui/react';
import { useMutation, useQuery } from '@apollo/client';

import { DELETE_AVATAR, GET_PROFILE, UPDATE_PROFILE, UPLOAD_AVATAR } from '../api/queries';
import { fileToBase64, formatDate, useNotify } from '../utils';

const SOCIAL_LINKS = {
  github: h => `https://github.com/${h}`,
  linkedin: h => `https://www.linkedin.com/in/${h}`,
  twitter: h => `https://x.com/${h}`,
};

const toList = text => text.split(',').map(t => t.trim()).filter(Boolean);

// Perfil de un usuario (nuestro servicio profiles, a través del gateway).
// Si es el usuario actual, se puede editar.
export default function ProfileView({ userId, editable, onBack }) {
  const notify = useNotify();
  const fileInput = useRef(null);
  const { data, loading, error } = useQuery(GET_PROFILE, { variables: { userId }, fetchPolicy: 'cache-and-network' });
  const [updateProfile, { loading: saving }] = useMutation(UPDATE_PROFILE);
  const [uploadAvatar, { loading: uploading }] = useMutation(UPLOAD_AVATAR);
  const [deleteAvatar] = useMutation(DELETE_AVATAR);

  const profile = data?.getProfile;
  const [form, setForm] = useState(null);

  // Rellena el formulario con los datos del perfil (solo al abrir un perfil,
  // así no se borra lo que el usuario está escribiendo si cambia la foto).
  useEffect(() => {
    if (profile) {
      setForm({
        bio: profile.bio,
        status: profile.status,
        interests: profile.interests.join(', '),
        languages: profile.languages.join(', '),
        github: profile.social_handles.github || '',
        linkedin: profile.social_handles.linkedin || '',
        twitter: profile.social_handles.twitter || '',
      });
    }
  }, [profile?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = field => e => setForm({ ...form, [field]: e.target.value });

  const save = async e => {
    e.preventDefault();
    try {
      await updateProfile({
        variables: {
          userId,
          input: { ...form, interests: toList(form.interests), languages: toList(form.languages) },
        },
      });
      notify.ok('Perfil actualizado');
    } catch (err) {
      notify.error(err);
    }
  };

  const onAvatar = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataBase64 = await fileToBase64(file);
      await uploadAvatar({ variables: { userId, filename: file.name, contentType: file.type, dataBase64 } });
      notify.ok('Foto de perfil actualizada');
    } catch (err) {
      notify.error(err);
    }
    fileInput.current.value = '';
  };

  const onDeleteAvatar = async () => {
    try {
      await deleteAvatar({ variables: { userId } });
      notify.ok('Foto de perfil eliminada');
    } catch (err) {
      notify.error(err);
    }
  };

  return (
    <Box maxW="900px">
      <Button size="sm" variant="link" mb={4} onClick={onBack}>← Volver</Button>

      {loading && !profile && <Text>Cargando perfil...</Text>}
      {error && <Text color="red.500">No se pudo cargar el perfil (servicio profiles)</Text>}

      {profile && (
        <Box bg="white" p={6} borderWidth="1px" borderRadius="md">
          {/* ---- Vista pública del perfil ---- */}
          <Flex gap={6} align="center" wrap="wrap">
            <Avatar size="2xl" name={profile.display_name} src={profile.avatar_url || undefined} />
            <Box>
              <Heading size="lg">{profile.display_name}</Heading>
              {profile.status && <Text color="teal.600">{profile.status}</Text>}
              <Text mt={2}>{profile.bio || <i>Sin biografía</i>}</Text>
              <HStack mt={2} spacing={4}>
                {Object.entries(profile.social_handles).map(([net, handle]) =>
                  handle && net in SOCIAL_LINKS ? (
                    <Link key={net} href={SOCIAL_LINKS[net](handle)} color="teal.600" isExternal>
                      {net}: {handle}
                    </Link>
                  ) : null
                )}
              </HStack>
            </Box>
          </Flex>

          <SimpleGrid columns={2} spacing={4} mt={4}>
            <Box>
              <Text fontWeight="bold" fontSize="sm">Intereses</Text>
              <Wrap mt={1}>
                {profile.interests.length ? profile.interests.map(i => <Tag key={i} colorScheme="teal">{i}</Tag>) : <Text fontSize="sm" color="gray.500">-</Text>}
              </Wrap>
            </Box>
            <Box>
              <Text fontWeight="bold" fontSize="sm">Idiomas</Text>
              <Wrap mt={1}>
                {profile.languages.length ? profile.languages.map(l => <Tag key={l}>{l}</Tag>) : <Text fontSize="sm" color="gray.500">-</Text>}
              </Wrap>
            </Box>
          </SimpleGrid>
          <Text fontSize="xs" color="gray.400" mt={4}>Última actualización: {formatDate(profile.updated_at)}</Text>

          {/* ---- Edición (solo el propio perfil) ---- */}
          {editable && form && (
            <>
              <Divider my={6} />
              <Heading size="md" mb={4}>Editar mi perfil</Heading>

              <HStack mb={6}>
                <Input type="file" accept="image/png,image/jpeg,image/webp" ref={fileInput} display="none" onChange={onAvatar} />
                <Button size="sm" colorScheme="teal" isLoading={uploading} onClick={() => fileInput.current.click()}>
                  Cambiar foto
                </Button>
                {profile.avatar_url && (
                  <Button size="sm" colorScheme="red" variant="outline" onClick={onDeleteAvatar}>Quitar foto</Button>
                )}
                <Text fontSize="xs" color="gray.500">PNG, JPG o WEBP, máx. 2 MB</Text>
              </HStack>

              <form onSubmit={save}>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="sm">Estado</FormLabel>
                    <Input value={form.status} onChange={set('status')} maxLength={60} placeholder="Ej: Estudiando" />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Intereses (separados por coma)</FormLabel>
                    <Input value={form.interests} onChange={set('interests')} placeholder="música, fútbol" />
                  </FormControl>
                  <FormControl gridColumn={{ md: 'span 2' }}>
                    <FormLabel fontSize="sm">Biografía</FormLabel>
                    <Textarea value={form.bio} onChange={set('bio')} maxLength={280} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Idiomas (separados por coma)</FormLabel>
                    <Input value={form.languages} onChange={set('languages')} placeholder="es, en" />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">GitHub</FormLabel>
                    <Input value={form.github} onChange={set('github')} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">LinkedIn</FormLabel>
                    <Input value={form.linkedin} onChange={set('linkedin')} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">Twitter / X</FormLabel>
                    <Input value={form.twitter} onChange={set('twitter')} />
                  </FormControl>
                </SimpleGrid>
                <Button type="submit" colorScheme="teal" mt={4} isLoading={saving}>Guardar cambios</Button>
              </form>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
