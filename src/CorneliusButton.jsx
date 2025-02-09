import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";

const CorneliusButton = ({ toggleSidebar }) => {
  const [playButton, setPlayButton] = useState(null);
  const [cbPortalDiv, setCBPortalDiv] = useState(null);

  useEffect(() => {
    const playButtonSelector = "a.primary-button.playLink";

    const setupPortal = () => {
      const foundButton = document.querySelector(playButtonSelector);
      if (foundButton && foundButton !== playButton) {
        setPlayButton(foundButton);

        let existingDiv =
          foundButton.parentElement.querySelector(".cornelius-portal");
        if (!existingDiv) {
          existingDiv = document.createElement("div");
          existingDiv.className = "cornelius-portal";
          foundButton.parentElement.insertBefore(
            existingDiv,
            foundButton.nextSibling,
          );
        }

        setCBPortalDiv(existingDiv);
      }
    };

    // Run setup initially and when DOM changes
    const observer = new MutationObserver(setupPortal);
    observer.observe(document.body, { childList: true, subtree: true });

    // Run setup immediately to catch the play button if it already exists
    setupPortal();

    // Cleanup observer on component unmount
    return () => observer.disconnect();
  }, [cbPortalDiv]);

  if (!cbPortalDiv) return null;

  const imgURL = chrome.runtime.getURL("/public/cornelius.svg");

  return ReactDOM.createPortal(
    <button
      onClick={toggleSidebar}
      id="native-popcorn-button"
      className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-r from-rose-300 to-rose-600 bg-clip-padding outline outline-offset-[-0.3] outline-4 outline-rose-200/50 before:absolute before:inset-0 before:rounded-full before:bg-[linear-gradient(135deg,transparent_25%,theme(colors.white/.5)_50%,transparent_75%,transparent_100%)] before:bg-[length:250%_250%,100%_100%] before:bg-[position:200%_0,0_0] before:bg-no-repeat before:[transition:background-position_0s_ease] hover:outline hover:outline-offset-[-0.5] hover:outline-4 hover:outline-white hover:before:bg-[position:-100%_0,0_0] hover:before:duration-[1500ms] focus:outline-none focus:outline-offset-[-0.5] focus:ring-4 focus:ring-white/90 dark:from-rose-200 dark:to-rose-50 dark:before:bg-[linear-gradient(135deg,transparent_25%,theme(colors.white)_50%,transparent_75%,transparent_100%)]"
    >
      <img
        src={`${imgURL}`}
        alt="Cornelius"
        className="h-full w-full will-change-transform transition-transform duration-300 hover:scale-110"
      />
    </button>,
    cbPortalDiv,
  );
};

export default CorneliusButton;
