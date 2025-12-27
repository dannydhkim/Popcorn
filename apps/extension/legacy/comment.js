import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';

function useComments(contentId) {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const fetchComments = async () => {
      let query = supabase
        .from('comments')
        .select('id, author, content, parent_id, created_at, total_vote, content_id')
        .order('created_at', { ascending: true });

      if (contentId) {
        query = query.eq('content_id', contentId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to load comments:', error);
        return;
      }

      if (isMounted) {
        setComments(data.map(normalizeComment));
      }
    };

    fetchComments();

    const channelConfig = {
      event: '*',
      schema: 'public',
      table: 'comments',
    };

    if (contentId) {
      channelConfig.filter = `content_id=eq.${contentId}`;
    }

    const channel = supabase
      .channel('comments-changes')
      .on('postgres_changes', channelConfig, () => {
        fetchComments();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [contentId]);

  return comments;
}

function buildCommentTree(comments) {
    const commentMap = {};
    comments.forEach(comment => {
      comment.children = [];
      commentMap[comment.id] = comment;
    });
  
    const rootComments = [];
  
    comments.forEach(comment => {
      if (comment.parentId) {
        const parent = commentMap[comment.parentId];
        if (parent) {
          parent.children.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });
  
    return rootComments;
  }

function normalizeComment(comment) {
  return {
    ...comment,
    totalVote: comment.total_vote ?? comment.totalVote ?? 0,
    parentId: comment.parent_id ?? comment.parentId ?? null,
    contentId: comment.content_id ?? comment.contentId ?? null,
  };
}
