import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import CommentBox from "./commentBox.js";
import Banner from "./banner.jsx";
import { db } from "./firebaseConfig.js";
import { getFirestore, getDocs, collection } from "firebase/firestore";
// import useComments from 'comment'

function PopcornSidebar({ isOpen, closeSidebar, commentData, loading }) {
  const [comments, setComments] = useState(commentData || []);
  const [contentContainer, setContentContainer] = useState(null)
  const [loadingState, setLoadingState] = useState(false);
  const [bgElement, setBGElement] = useState(null);
  const [bgPortalDiv, setBGPortalDiv] = useState(null);

  const content_title = "Title";
  const movie_description = "Short description of the movie.";
  const extra_info =
    "Here is some extra information about the movie that only shows up when 'More Info' is clicked.";
  const actors = [
    { name: "Actor 1", link: "https://actor1.com" },
    { name: "Actor 2", link: "https://actor2.com" },
    { name: "Actor 3", link: "https://actor3.com" },
  ];

  useEffect(() => {
    const bgElementSelector = "div.bd.dark-background";

    const setupPortal = () => {
      const foundBG = document.querySelector(bgElementSelector);
      if (foundBG && foundBG !== bgElement) {
        setBGElement(foundBG);

        let existingDiv =
          foundBG.parentElement.querySelector(".sidebar-portal");
        if (!existingDiv) {
          existingDiv = document.createElement("div");
          existingDiv.className = "sidebar-portal";
          foundBG.parentElement.insertBefore(existingDiv, foundBG.nextSibling);
        }
        setBGPortalDiv(existingDiv);
      }
    };
    setupPortal();
    return () => {};
  }, [isOpen, bgPortalDiv]);

  const fetchData = async () => {
    setLoadingState(true);
    try {
      chrome.runtime.sendMessage({ action: 'getData', videoId: window.location.href}, (response) => {
        console.log(response)  
        setComments(response.data || []);
          console.log(comments)
          setLoadingState(false)
        });
    } catch (error) {
      console.log('failed to fetch comments:', error)
      throw Error('failed to fetch comments')
      }
  }

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }

    return () => {};
  }, [isOpen]);

  useEffect(() => {
    const previewModalClass = '[data-uia="preview-modal-container-DETAIL_MODAL"]'
    const homePageBGClass = ".appMountPoint"

    const selectPreviewOpen = () => {
      const previewModal = document.querySelector(previewModalClass)
      const mainContentContainer = document.querySelector(homePageBGClass) || document.body;
      setContentContainer(previewModal || mainContentContainer);
    }

    const observer = new MutationObserver(selectPreviewOpen);
    observer.observe(document.body, { childList: true, subtree: true });

    selectPreviewOpen()

    if (contentContainer) {
      contentContainer.classList.toggle("scaled-down", isOpen);
    }
    
    return () => observer.disconnect();
  }, [isOpen, contentContainer]);

  if (!bgPortalDiv) return null;

  return ReactDOM.createPortal(
    <div
      className={`popcorn-sidebar-container transition-margin shadow-sidebar fixed right-0 top-0 z-[9999] h-full w-1/4 transform overflow-y-auto bg-base-black p-5 text-gray-200 duration-500 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
    >
      <div className="popcorn-sidebar transition-width fixed right-0 top-0 z-[9999999999] h-full w-[93%] cursor-auto select-text overflow-y-auto bg-base-black p-5 text-gray-200 duration-200 ease-linear">
        <button onClick={closeSidebar}>Close</button>
        <Banner
          title={content_title}
          actors={actors}
          description={movie_description}
          extraInfo={extra_info}
        />
        <CommentBox />
        {loadingState && <p>Loading comments...</p>}
        {!loadingState && comments.length === 0 && (
          <p>No comments available.</p>
        )}
        {!loadingState && comments.length > 0 && (
          <div className="comments-section">
            {comments.map((comment, index) => (
              <div className="comment" key={index}>
                <div className="vote-buttons">
                  <button className="upvote hover:">⬆</button>
                  <span className="score">{comment.totalVote}</span>
                  <button className="downvote">⬇</button>
                </div>
                <p>
                  <strong>{comment.author}:</strong> {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}
        <div class="comments-section">
          <div class="comment">
            <div class="vote-buttons">
              <button class="upvote">⬆</button>
              <span class="score">5</span>
              <button class="downvote">⬇</button>
            </div>
            <p>
              <strong>User1:</strong> This movie was amazing! Really loved the
              cinematography.
            </p>
          </div>
          <div class="nested-comment">
            <div class="comment">
              <div class="vote-buttons">
                <button class="upvote">⬆</button>
                <span class="score">2</span>
                <button class="downvote">⬇</button>
              </div>
              <p>
                <strong>User2:</strong> I agree! The visuals were stunning.
              </p>
            </div>
            <div class="nested-comment">
              <div class="comment">
                <div class="vote-buttons">
                  <button class="upvote">⬆</button>
                  <span class="score">1</span>
                  <button class="downvote">⬇</button>
                </div>
                <p>
                  <strong>User3:</strong> Definitely! The lighting in that one
                  scene was perfect.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="comment">
          <p>
            <strong>User2:</strong> I thought the storyline was a bit
            predictable.
          </p>
        </div>
        <div class="comment">
          <p>
            <strong>User3:</strong> Great performances by the lead actors!
          </p>
        </div>
      </div>
    </div>,
    bgPortalDiv,
  );
}

export default PopcornSidebar;
