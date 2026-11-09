import { useToast } from '@chakra-ui/react';

//Convierte un archivo del navegador a base64 para Graphql.
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.readAsDataURL(file);
  });
}
//Fromato chileno
export function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function errorText(error) {
  return error?.graphQLErrors?.[0]?.message || error?.message || 'Error desconocido';
}

//Mensajes de éxito/error en pantalla
export function useNotify() {
  const toast = useToast();
  return {
    ok: title => toast({ title, status: 'success', duration: 2000, position: 'bottom-right', isClosable: true }),
    error: error =>
      toast({ title: 'Error', description: errorText(error), status: 'error', duration: 4000, position: 'bottom-right', isClosable: true }),
  };
}
