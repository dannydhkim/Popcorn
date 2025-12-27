import { supabase } from './supabaseClient.js';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Supabase initialized in background script.');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getData') {
    console.log('getting data from Supabase');
    getCommentsForVideo(message.videoId)
      .then((data) => {
        console.log('received data', data);
        sendResponse({ data });
      })
      .catch((error) => {
        console.error('failed to fetch comments:', error);
        sendResponse({ data: [], error: 'failed to fetch comments' });
      });
    return true;
  }
});

async function getCommentsForVideo(videoUrl) {
  const { data: content, error: contentError } = await supabase
    .from('contents')
    .select('id')
    .eq('netflix_url', videoUrl)
    .maybeSingle();

  if (contentError) {
    throw contentError;
  }

  if (!content) {
    console.log('No matching content found.');
    return [];
  }

  const { data: comments, error: commentsError } = await supabase
    .from('comments')
    .select('id, author, content, total_vote, created_at, parent_id, content_id')
    .eq('content_id', content.id)
    .order('created_at', { ascending: true });

  if (commentsError) {
    throw commentsError;
  }

  return comments.map(normalizeComment);
}

function normalizeComment(comment) {
  return {
    ...comment,
    totalVote: comment.total_vote ?? comment.totalVote ?? 0,
    parentId: comment.parent_id ?? comment.parentId ?? null,
    contentId: comment.content_id ?? comment.contentId ?? null,
  };
}
