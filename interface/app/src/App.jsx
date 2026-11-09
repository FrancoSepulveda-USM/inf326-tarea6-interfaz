import React, { useEffect, useState } from 'react';
import { Box, Flex, Heading, Text, Tabs, TabList, Tab, TabPanels, TabPanel } from '@chakra-ui/react';
import { useQuery } from '@apollo/client';

import { LIST_CHANNELS } from './api/queries';
import UserBar from './components/UserBar';
import ChannelList from './components/ChannelList';
import MessagesTab from './components/MessagesTab';
import FilesTab from './components/FilesTab';
import PollsTab from './components/PollsTab';
import ProfileView from './components/ProfileView';

export default function App() {
  //Usuario con el que se "actúa"
  const [currentUserId, setCurrentUserId] = useState(localStorage.getItem('currentUserId') || '');
  const [channelId, setChannelId] = useState('');
  const [profileUserId, setProfileUserId] = useState(''); // si tiene valor, se muestra ese perfil
  const [tab, setTab] = useState(0);

  const { data: channelsData } = useQuery(LIST_CHANNELS);
  const channel = channelsData?.listChannels.find(c => c.id === channelId);

  useEffect(() => {
    localStorage.setItem('currentUserId', currentUserId);
  }, [currentUserId]);

  const openChannel = id => {
    setChannelId(id);
    setProfileUserId('');
    setTab(0);
  };

  return (
    <Flex direction="column" h="100vh">
      <UserBar
        currentUserId={currentUserId}
        onChangeUser={setCurrentUserId}
        onOpenProfile={() => setProfileUserId(currentUserId)}
      />

      <Flex flex="1" overflow="hidden">
        <ChannelList selectedId={channelId} onSelect={openChannel} />

        <Box flex="1" p={6} overflowY="auto" bg="gray.50">
          {/* Caso en que no haya user actual */}
          {profileUserId ? (
            <ProfileView
              userId={profileUserId}
              editable={profileUserId === currentUserId}
              onBack={() => setProfileUserId('')}
            />
          ) : !currentUserId ? (
            <Text color="gray.500">Primero crea o elige un usuario en la barra de arriba.</Text>
          ) : !channel ? (
            <Text color="gray.500">Elige o crea un canal en la izquierda.</Text>
          ) : (
            <>
              <Heading size="lg" mb={4}># {channel.name}</Heading>
              <Tabs index={tab} onChange={setTab} colorScheme="teal" isLazy>
                <TabList>
                  <Tab>Mensajes</Tab>
                  <Tab>Archivos</Tab>
                  <Tab>Encuestas</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel px={0}>
                    <MessagesTab
                      channelId={channel.id}
                      currentUserId={currentUserId}
                      onOpenProfile={setProfileUserId}
                      onOpenPolls={() => setTab(2)}
                    />
                  </TabPanel>
                  <TabPanel px={0}>
                    <FilesTab channelId={channel.id} currentUserId={currentUserId} />
                  </TabPanel>
                  <TabPanel px={0}>
                    <PollsTab channelId={channel.id} currentUserId={currentUserId} />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </>
          )}
        </Box>
      </Flex>
    </Flex>
  );
}
