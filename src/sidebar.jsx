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

  const imgURL = chrome.runtime.getURL("/public/");

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
  className={`popcorn-sidebar-container transition-margin shadow-lg fixed right-0 top-0 z-[9999] h-full w-2/5 md:w-1/3 transform overflow-y-auto p-5 bg-[#141414] text-gray-200 duration-500 ease-in-out ${
    isOpen ? "translate-x-0" : "translate-x-full"
  }`}
>
  <div className="popcorn-sidebar transition-width fixed z-[9999999999] h-full w-full cursor-auto select-text overflow-y-auto bg-[#141414] p-5 text-gray-200 duration-200 ease-linear shadow-md">
    <div className="flex justify-between items-center mb-6 md:mb-7">
      <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r to-rose-600 from-red-400">
        Popcorn
      </h2>
      <button
        onClick={closeSidebar}
        className="text-base md:text-lg lg:text-xl mr-5 text-gray-300 hover:text-gray-100"
      >
        <img
        src={`${imgURL}cross-circle-white.svg`}
        alt="cross-circle-close-button"
        className="h-10 w-10 object-contain"
      />
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
      <div className="loading-section mt-6 md:mt-8 mr-5">
        {Array(15)
          .fill("")
          .map((_, index) => (
            <div
              key={index}
              className="animate-pulse flex space-x-4 mb-5 md:mb-6 items-center"
            >
              <div className="rounded-full bg-[#333333] h-12 w-12 md:h-14 md:w-14"></div>
              <div className="flex-1 space-y-4 py-1">
                <div className="h-5 bg-[#333333] rounded w-2/3 md:w-3/4"></div>
                <div className="h-5 bg-[#333333] rounded w-3/4 md:w-full"></div>
              </div>
            </div>
          ))}
      </div>
    )}
    {!loadingState && comments.length === 0 && (
      <p className="mt-6 md:mt-8 mr-5 text-gray-400 text-lg md:text-xl">
        No comments available.
      </p>
    )}
    {!loadingState && comments.length > 0 && (
      <div className="comments-section mt-6 md:mt-8 mr-5 space-y-5">
        {comments.map((comment, index) => (
          <div
            className="comment bg-[#1F1F1F] p-5 md:p-6 rounded-lg shadow-sm flex items-center"
            key={index}
          >
            <div className="vote-buttons flex flex-col items-center mr-5 md:mr-6 space-y-3">
              <button className="upvote text-xl md:text-2xl text-gray-400 hover:text-[#E50914]">
                ⬆
              </button>
              <span className="score text-lg md:text-xl text-gray-300">
                {comment.totalVote}
              </span>
              <button className="downvote text-xl md:text-2xl text-gray-400 hover:text-[#E50914]">
                ⬇
              </button>
            </div>
            <div className="comment flex flex-col">
              <div className="comment-username flex-1">
                <strong className="text-white text-lg md:text-xl lg:text-2xl font-bold">
                  {comment.author}
                </strong>
              </div>
              <div className="comment-content flex-1">
                <p className="text-gray-300 text-base md:text-lg lg:text-xl">
                  {comment.content}
                </p>
              </div>
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
