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
      className={`popcorn-sidebar-container transition-margin shadow-lg fixed right-0 top-0 z-[9999] h-full w-1/3 transform overflow-y-auto bg-[#141414] p-5 text-gray-200 duration-500 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
    >
      <div className="popcorn-sidebar transition-width fixed right-0 top-0 z-[9999999999] h-full w-[93%] cursor-auto select-text overflow-y-auto bg-[#141414] p-5 text-gray-200 duration-200 ease-linear shadow-md">
      <div className="flex justify-between items-center mb-5">
      <h2 className="text-lg font-bold text-white">Popcorn</h2>
      <button
        onClick={closeSidebar}
        className="text-sm text-gray-300 hover:text-gray-100"
      >
        Close ✖
      </button>
      </div>
        <Banner
          title={content_title}
          actors={actors}
          description={movie_description}
          extraInfo={extra_info}
        />
        <CommentBox />
        {loadingState && (
      <div className="loading-section mt-5">
        {Array(5)
          .fill("")
          .map((_, index) => (
            <div
              key={index}
              className="animate-pulse flex space-x-4 mb-4 items-center"
            >
              <div className="rounded-full bg-[#333333] h-10 w-10"></div>
              <div className="flex-1 space-y-3 py-1">
                <div className="h-4 bg-[#333333] rounded w-1/2"></div>
                <div className="h-4 bg-[#333333] rounded w-3/4"></div>
              </div>
            </div>
          ))}
      </div>
    )}
        {!loadingState && comments.length === 0 && (
          <p className="mt-5 text-gray-400">No comments available.</p>
        )}
        {!loadingState && comments.length > 0 && (
          <div className="comments-section mt-5 space-y-4">
            {comments.map((comment, index) => (
              <div
              className="comment bg-[#1F1F1F] p-4 rounded-lg shadow-sm flex items-center"
              key={index}
            >
                <div className="vote-buttons flex flex-col items-center mr-4 space-y-2">
                <button className="upvote text-gray-400 hover:text--[#E50914]">
                ⬆
              </button>
              <span className="score text-sm text-gray-300">
                {comment.totalVote}
              </span>
              <button className="downvote text-gray-400 hover:text--[#E50914]">
                ⬇
              </button>
                </div>
                <div className="comment-content flex-1">
                <p className="text-gray-300">
                  <strong className="text-white ">{comment.author}:</strong> {" "}{comment.content}
                </p>
              </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    bgPortalDiv,
  );
}

export default PopcornSidebar;
