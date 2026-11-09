import { gql } from '@apollo/client';

//Chat base

export const LIST_USERS = gql`
  query {
    listUsers {
      id
      display_name
    }
  }
`;

export const CREATE_USER = gql`
  mutation ($displayName: String!) {
    createUser(displayName: $displayName) {
      id
      display_name
    }
  }
`;

export const LIST_CHANNELS = gql`
  query {
    listChannels {
      id
      name
    }
  }
`;

export const CREATE_CHANNEL = gql`
  mutation ($name: String!) {
    createChannel(name: $name) {
      id
      name
    }
  }
`;


export const LIST_MESSAGES = gql`
  query ($channelId: ID!) {
    listMessages(channelId: $channelId) {
      id
      content
      created_at
      poll_id
      author {
        id
        display_name
        profile {
          user_id
          avatar_url
          status
        }
      }
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation ($channelId: ID!, $authorId: ID!, $content: String!) {
    sendMessage(channelId: $channelId, authorId: $authorId, content: $content) {
      id
    }
  }
`;

//Perfiles

const PROFILE_FIELDS = `
  user_id
  display_name
  bio
  status
  avatar_url
  interests
  languages
  social_handles { github linkedin twitter }
  created_at
  updated_at
`;

export const GET_PROFILE = gql`
  query ($userId: ID!) {
    getProfile(userId: $userId) { ${PROFILE_FIELDS} }
  }
`;

export const UPDATE_PROFILE = gql`
  mutation ($userId: ID!, $input: ProfileInput!) {
    updateProfile(userId: $userId, input: $input) { ${PROFILE_FIELDS} }
  }
`;

export const UPLOAD_AVATAR = gql`
  mutation ($userId: ID!, $filename: String!, $contentType: String!, $dataBase64: String!) {
    uploadAvatar(userId: $userId, filename: $filename, contentType: $contentType, dataBase64: $dataBase64) {
      ${PROFILE_FIELDS}
    }
  }
`;

export const DELETE_AVATAR = gql`
  mutation ($userId: ID!) {
    deleteAvatar(userId: $userId) { ${PROFILE_FIELDS} }
  }
`;

//Media

export const LIST_ATTACHMENTS = gql`
  query ($channelId: ID!, $userId: ID!) {
    listAttachments(channelId: $channelId, userId: $userId) {
      id
      filename
      mime_type
      size_bytes
      category
      created_at
      download_url
      uploader_id
      uploader {
        id
        display_name
      }
    }
  }
`;

export const UPLOAD_ATTACHMENT = gql`
  mutation ($channelId: ID!, $userId: ID!, $filename: String!, $contentType: String!, $dataBase64: String!) {
    uploadAttachment(channelId: $channelId, userId: $userId, filename: $filename, contentType: $contentType, dataBase64: $dataBase64) {
      id
    }
  }
`;

export const DELETE_ATTACHMENT = gql`
  mutation ($attachmentId: ID!, $userId: ID!) {
    deleteAttachment(attachmentId: $attachmentId, userId: $userId)
  }
`;

//Polls

const POLL_FIELDS = `
  poll_id
  question
  status
  total_votes
  closes_at
  created_at
  closed_at
  author_id
  author { id display_name }
  options { option_id text vote_count position }
`;

export const LIST_POLLS = gql`
  query ($channelId: ID!) {
    listPolls(channelId: $channelId) { ${POLL_FIELDS} }
  }
`;

export const CREATE_POLL = gql`
  mutation ($channelId: ID!, $authorId: ID!, $question: String!, $options: [String!]!, $durationMinutes: Int) {
    createPoll(channelId: $channelId, authorId: $authorId, question: $question, options: $options, durationMinutes: $durationMinutes) {
      ${POLL_FIELDS}
    }
  }
`;

export const VOTE_POLL = gql`
  mutation ($pollId: ID!, $voterId: ID!, $optionId: ID!) {
    votePoll(pollId: $pollId, voterId: $voterId, optionId: $optionId) { ${POLL_FIELDS} }
  }
`;

export const CLOSE_POLL = gql`
  mutation ($pollId: ID!, $authorId: ID!) {
    closePoll(pollId: $pollId, authorId: $authorId) { ${POLL_FIELDS} }
  }
`;
