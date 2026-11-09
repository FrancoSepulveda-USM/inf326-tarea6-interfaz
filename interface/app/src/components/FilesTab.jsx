import React, { useRef, useState } from 'react';
import { Box, Button, HStack, Image, Input, SimpleGrid, Text, Link, Badge } from '@chakra-ui/react';
import { useMutation, useQuery } from '@apollo/client';

import { DELETE_ATTACHMENT, LIST_ATTACHMENTS, UPLOAD_ATTACHMENT } from '../api/queries';
import { fileToBase64, formatDate, formatSize, useNotify } from '../utils';

// Archivos del canal (servicio media de otro equipo, a través del gateway).
export default function FilesTab({ channelId, currentUserId }) {
  const notify = useNotify();
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const variables = { channelId, userId: currentUserId };
  const refetch = { refetchQueries: [{ query: LIST_ATTACHMENTS, variables }] };

  const { data, loading, error } = useQuery(LIST_ATTACHMENTS, { variables, pollInterval: 5000, fetchPolicy: 'cache-and-network' });
  const [upload, { loading: uploading }] = useMutation(UPLOAD_ATTACHMENT, refetch);
  const [remove] = useMutation(DELETE_ATTACHMENT, refetch);

  const submit = async e => {
    e.preventDefault();
    if (!file) return;
    try {
      const dataBase64 = await fileToBase64(file);
      await upload({
        variables: { ...variables, filename: file.name, contentType: file.type || 'application/octet-stream', dataBase64 },
      });
      setFile(null);
      fileInput.current.value = '';
      notify.ok('Archivo subido');
    } catch (err) {
      notify.error(err);
    }
  };

  const onDelete = async id => {
    try {
      await remove({ variables: { attachmentId: id, userId: currentUserId } });
      notify.ok('Archivo eliminado');
    } catch (err) {
      notify.error(err);
    }
  };

  const items = data?.listAttachments || [];

  return (
    <Box>
      <HStack as="form" onSubmit={submit} mb={2} bg="white" p={3} borderWidth="1px" borderRadius="md">
        <Input type="file" ref={fileInput} p={1} onChange={e => setFile(e.target.files[0] || null)} />
        <Button type="submit" colorScheme="teal" isLoading={uploading} isDisabled={!file}>Subir archivo</Button>
      </HStack>
      <Text fontSize="xs" color="gray.500" mb={4}>Permitidos: PNG, JPG, GIF, WEBP, PDF y TXT (máx. 10 MB).</Text>

      {loading && !data && <Text>Cargando archivos...</Text>}
      {error && <Text color="red.500">No se pudieron cargar los archivos (servicio media)</Text>}
      {!loading && items.length === 0 && !error && <Text color="gray.500">No hay archivos en este canal.</Text>}

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {items.map(a => (
          <Box key={a.id} bg="white" borderWidth="1px" borderRadius="md" p={3}>
            {a.category === 'IMAGE' ? (
              <Image src={a.download_url} alt={a.filename} h="140px" w="100%" objectFit="cover" borderRadius="md" mb={2} />
            ) : (
              <Box h="140px" bg="gray.100" borderRadius="md" mb={2} display="flex" alignItems="center" justifyContent="center" fontSize="4xl">
                📄
              </Box>
            )}
            <Text fontWeight="bold" noOfLines={1}>{a.filename}</Text>
            <HStack fontSize="xs" color="gray.500">
              <Badge>{a.category === 'IMAGE' ? 'Imagen' : 'Documento'}</Badge>
              <Text>{formatSize(a.size_bytes)}</Text>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              Subido por {a.uploader?.display_name || '?'} · {formatDate(a.created_at)}
            </Text>
            <HStack mt={2}>
              <Button as={Link} href={a.download_url} size="xs" isExternal>Descargar</Button>
              {a.uploader_id === currentUserId && (
                <Button size="xs" colorScheme="red" variant="outline" onClick={() => onDelete(a.id)}>Eliminar</Button>
              )}
            </HStack>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
