import React from 'react';

const ButtonComponent = () => {
    useEffect(() => {
        function findElement() {
            
        }
        const intervalId = setInterval(() => {
            const playButton = document.querySelector("a.primary-button.playLink")

          if (targetElement && !isButtonInjected) {
            setIsButtonInjected(true);
          }
        }, 500);
        
        return () => clearInterval(intervalId);
    }, [isButtonInjected]);


    const extensionId = chrome.runtime.id;
    const corneliusUrl = `chrome-extension://${extensionId}/public/cornelius.svg`;

    const handleClick = () => {
        window.dispatchEvent(new CustomEvent('toggleSidebar'));
    };

    const previewModal = document.querySelector('[data-uia="preview-modal-container-DETAIL_MODAL"]')
    const mainContentContainer = document.querySelector('.appMountPoint') || document.body

    const playButton = document.querySelector("a.primary-button.playLink")


    return ReactDOM.createPortal(buttonElement, targetElement)}
    <button onClick={handleClick}
                id= "native-popcorn-button" 
                classname = "hasLabel"
                > 
                <img 
                src={corneliusUrl}
                style={{ width: "45px", height: "45px", display: "flex",
                        alignItems: "center", justifyContent: "center"
                 }}
                />
                </button>;
    ;

export default ButtonComponent;