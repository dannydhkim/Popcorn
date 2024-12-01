import React,  { useState, useEffect} from 'react';
import CommentBox from './CommentBox';
import Banner from './banner.jsx';
import { db } from './firebaseConfig.js';
import { getFirestore, getDocs, collection } from 'firebase/firestore';
// import useComments from 'comment'
import '../public/styles.css';

function PopcornSidebar({commentData, loading}) {
  console.log('PopcornSidebar component is rendering');
  console.log("props", {commentData, loading})
  console.log("commentData in sidebar", commentData)
  const [data, setData] = useState([]);
  const [comments, setComments] = useState(commentData || [])
  const [loadingState, setLoadingState] = useState(loading)

  const content_title = "Title"
  const movie_description = "Short description of the movie."
  const extra_info = "Here is some extra information about the movie that only shows up when 'More Info' is clicked."
  const actors = [
    { name: 'Actor 1', link: 'https://actor1.com' },
    { name: 'Actor 2', link: 'https://actor2.com' },
    { name: 'Actor 3', link: 'https://actor3.com' },
  ];

  const fetchData = () => {
    chrome.runtime.sendMessage({ action: 'getData', videoId: window.location.href}, (response) => {
      if (response) {
        setComments(response);
      } else {
        throw Error('failed to fetch comments:', response)
      }

      })
  }

  useEffect(() => {
    if (isActive) {
      fetchData();
    }
    },
    [isActive, window.location.href])

  return (
    <div class="popcorn-sidebar">
      <Banner
      title={content_title}
      actors={actors}
      description={movie_description}
      extraInfo={extra_info}
      />
      <CommentBox />
      {loadingState && <p>Loading comments...</p>}
      {!loadingState && comments.length === 0 && <p>No comments available.</p>}
      {!loadingState && comments.length > 0 && (
        <ul>
          {comments.map((comment, index) => (
            <li key={index}>{comment.text}</li>
          ))}
        </ul>
      )}
      <div class="comments-section">
        <div class="comment">
          <div class="vote-buttons">
              <button class="upvote">⬆</button>
              <span class="score">5</span>
              <button class="downvote">⬇</button>
            </div>
          <p><strong>User1:</strong> This movie was amazing! Really loved the cinematography.</p>
        </div>
        <div class="nested-comment">
          <div class="comment">
            <div class="vote-buttons">
              <button class="upvote">⬆</button>
              <span class="score">2</span>
              <button class="downvote">⬇</button>
            </div>
            <p><strong>User2:</strong> I agree! The visuals were stunning.</p>
          </div>
          <div class="nested-comment">
              <div class="comment">
                <div class="vote-buttons">
                  <button class="upvote">⬆</button>
                  <span class="score">1</span>
                  <button class="downvote">⬇</button>
                </div>
                <p><strong>User3:</strong> Definitely! The lighting in that one scene was perfect.</p>
              </div>
            </div>
        </div>
      </div>
        <div class="comment">
          <p><strong>User2:</strong> I thought the storyline was a bit predictable.</p>
        </div>
        <div class="comment">
          <p><strong>User3:</strong> Great performances by the lead actors!</p>
        </div>
    </div>
  );
};


export default PopcornSidebar;

/*
<ul>
{data.map((item) => (
  <li key={item.id}>{/* Render your item data here }</li>
))}
</ul> 
*/