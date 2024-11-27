import React from 'react';
import { createRoot } from 'react-dom/client';
import PopcornSidebar from './sidebar.jsx';

(() => {
  "use strict";
  let sidebar = document.getElementById('popcorn-sidebar-container');
  sidebar = document.createElement('div');
  sidebar.id = 'popcorn-sidebar-container';
  sidebar.classList.add("hidden");
  const netflix_background = document.querySelector('div.bd.dark-background');
  netflix_background.parentElement.insertBefore(sidebar, netflix_background.nextSibling);

  const root = createRoot(sidebar);
  root.render(<PopcornSidebar/>);

  const addButton = function() {
      // Check if the button already exists
      if (document.getElementById("native-popcorn-button")) return;

      // Find the Netflix play button
      const playButton = document.querySelector("a.primary-button.playLink")
      if (!playButton) return;

      // Create the new button
      const newButton = document.createElement("button")
      newButton.setAttribute("style", "background: linear-gradient(273.58deg, #FFFFFF 0%, #EF3E3A 100%); \
        color: #fff; border-style: none; border-radius: 50%; padding: 0; display: flex; \
        align-items: center; justify-content: center; max-height: 45px;")
      newButton.setAttribute("id", "native-popcorn-button")
      newButton.setAttribute("class", "hasLabel")


      const extensionId = chrome.runtime.id;
      const imageUrl = `chrome-extension://${extensionId}/public/cornelius.svg`;
      
      // Create a container for the SVG
      const svgContainer = document.createElement('img');
      
      svgContainer.src = imageUrl;
      svgContainer.style.width = '45px';
      svgContainer.style.height = '45px';
      svgContainer.style.display = 'flex';
      svgContainer.style.alignItems = 'center';
      svgContainer.style.justifyContent = 'center';

      // svg.appendChild(svgElement)
      newButton.appendChild(svgContainer)

      const previewModal = document.querySelector('[data-uia="preview-modal-container-DETAIL_MODAL"]')
      const mainContentContainer = document.querySelector('.appMountPoint') || document.body

      // if (sidebar.classList.contains('active') && previewModal) {
      //   previewModal.style.marginRight = "25%";
      //   previewModal.style.transform = previewModal.style.transform + ' scale(0.8)'

      // } else if (sidebar.classList.contains('active') && mainContentContainer && (!!previewModal)) {
      //   mainContentContainer.style.marginRight = "25%";
      // }

      const toggleSidebar = (data) => {
        const ContentContainer = previewModal 
        ?? mainContentContainer
        ?? document.body;
  
        if (sidebar) {
          sidebar.classList.toggle('active');
          if (sidebar.classList.contains('active')) {
            const SidebarContainer = () => {
              const [comments, setComments] = useState([]);
              const [loading, setLoading] = useState(false);

              const fetchData = async () => {
                setLoading(true);
                try {
                  const response = await
                  chrome.runtime.sendMessage({ action: 'getData' }, (response) => {
                    setComments(response.data);
                })
              } finally {
                setLoading(false);
              }
            };

            useEffect(() => {
              fetchData();
            }, []);

            return <PopcornSidebar comments={comments} loading={loading}/>
          };
            root.render(<SidebarContainer/>);
          }
          ContentContainer.classList.toggle('scaled-down')
        //   if (sidebar.classList.contains('active')) { 
        //     ContentContainer.classList.toggle('scaled-down')
        // } else {
        //     ContentContainer.classList.toggle('scaled-down')
        //   }
        }

    };

      newButton.addEventListener('click', () => {
          toggleSidebar(response.data);
      });

      // Insert the button next to the play button
      playButton.parentElement.insertBefore(newButton, playButton.nextSibling)
    }

  setInterval( () => {
      try {
          addButton();
      } catch (e) {
          console.error(e);  // Log errors, if any
      }}, 500)
}
)();