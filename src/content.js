import React from 'react';
import { createRoot } from 'react-dom/client';
import PopcornSidebar from './sidebar';

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

      const toggleSidebar = () => {
        const ContentContainer = previewModal 
        ?? mainContentContainer
        ?? document.body;
  
        if (sidebar) {          
          sidebar.classList.toggle('active');
          ContentContainer.classList.toggle('scaled-down')
        //   if (sidebar.classList.contains('active')) { 
        //     ContentContainer.classList.toggle('scaled-down')
        // } else {
        //     ContentContainer.classList.toggle('scaled-down')
        //   }
        }

    };

      newButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'getData' }, (response) => {
          console.log('Received data:', response.data);
          toggleSidebar();
        });
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

//   document.querySelectorAll("billboard-links button-layer forward-leaning").forEach(addIconToElement);
  
//   /* for controller on mini preview
//   <div class = "focus-trap-wrapper previewModal--wrapper mini-modal" tabindex="-1"></div>
//   div.buttonControls--CSSContainerRule.has-smaller-buttons.mini-modal
//   */
  
//   /* for controler in big preview 
//   <div class="buttonControls--container" data-uia="mini-modal-controls"><a href="/watch/81692417?trackId=252494470&amp;tctx=1%2C1%2C5a13dbbc-0873-45a4-8fe1-c65f3d11b2b1-375948914%2CNES_47D16952E1AD9D92C19E8415DB3818-665E1CE5EC4CF1-683F646EBF_p_1729057351738%2CNES_47D16952E1AD9D92C19E8415DB3818_p_1729057351738%2C%2C%2C%2C%2CVideo%3A81591296%2C" class="primary-button playLink isToolkit" data-uia="play-button" tabindex="0" role="link" aria-label="Play"><button class="color-primary hasLabel hasIcon ltr-podnco" tabindex="-1" type="button"><div class="ltr-1st24vv"><div class="medium ltr-iyulz3" role="presentation"><svg xmlns="http://www.w3.org/2000/svg" fill="none" role="img" viewBox="0 0 24 24" width="24" height="24" data-icon="PlayStandard" aria-hidden="true"><path d="M5 2.69127C5 1.93067 5.81547 1.44851 6.48192 1.81506L23.4069 11.1238C24.0977 11.5037 24.0977 12.4963 23.4069 12.8762L6.48192 22.1849C5.81546 22.5515 5 22.0693 5 21.3087V2.69127Z" fill="currentColor"></path></svg></div></div><div class="ltr-1npqywr" style="width: 1rem;"></div><span class="ltr-1vh9doa">Play</span></button></a><button style="background: linear-gradient(273.58deg, #9E55A0 0%, #EF3E3A 100%); color: #fff; border-style: none; border-radius: 0.375rem; padding: 1.1rem; display: flex; align-items: center; justify-content: center; max-height: 45px;" id="native-party-button" class="hasLabel"><span style="line-height: 1.7rem; font-size: 1.4rem; text-wrap: nowrap" class="ltr-1vh9doa">Start a Teleparty</span></button><div class="ltr-bjn8wh"><div class="ptrack-content" data-ui-tracking-context="%7B%22lolomo_id%22:%22unknown%22,%22list_id%22:%22unknown%22,%22location%22:%22homeScreen%22,%22rank%22:-99,%22request_id%22:%22unknown%22,%22row%22:-99,%22track_id%22:252494470,%22video_id%22:81591296,%22supp_video_id%22:1,%22appView%22:%22addToMyListButton%22,%22usePresentedEvent%22:true%7D" data-tracking-uuid="ebd2f107-32ff-4969-ab62-ffa115967ed4"><button aria-label="My List" class="color-supplementary hasIcon round ltr-11vo9g5" data-uia="add-to-my-list" type="button"><div class="ltr-1st24vv"><div class="small ltr-iyulz3" role="presentation"><svg xmlns="http://www.w3.org/2000/svg" fill="none" role="img" viewBox="0 0 24 24" width="24" height="24" data-icon="PlusStandard" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M11 11V2H13V11H22V13H13V22H11V13H2V11H11Z" fill="currentColor"></path></svg></div></div></button></div></div><div class="ltr-179t5g5"><button class="color-supplementary hasIcon round ltr-126oqy" data-uia="thumbs-rate-button" type="button" aria-haspopup="menu" aria-controls="#thumbs-selection-menu" aria-expanded="false"><div class="ltr-1st24vv"><div class="small ltr-iyulz3" role="presentation"><svg xmlns="http://www.w3.org/2000/svg" fill="none" role="img" viewBox="0 0 24 24" width="24" height="24" data-icon="ThumbsUpStandard" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M10.696 8.7732C10.8947 8.45534 11 8.08804 11 7.7132V4H11.8377C12.7152 4 13.4285 4.55292 13.6073 5.31126C13.8233 6.22758 14 7.22716 14 8C14 8.58478 13.8976 9.1919 13.7536 9.75039L13.4315 11H14.7219H17.5C18.3284 11 19 11.6716 19 12.5C19 12.5929 18.9917 12.6831 18.976 12.7699L18.8955 13.2149L19.1764 13.5692C19.3794 13.8252 19.5 14.1471 19.5 14.5C19.5 14.8529 19.3794 15.1748 19.1764 15.4308L18.8955 15.7851L18.976 16.2301C18.9917 16.317 19 16.4071 19 16.5C19 16.9901 18.766 17.4253 18.3994 17.7006L18 18.0006L18 18.5001C17.9999 19.3285 17.3284 20 16.5 20H14H13H12.6228C11.6554 20 10.6944 19.844 9.77673 19.5382L8.28366 19.0405C7.22457 18.6874 6.11617 18.5051 5 18.5001V13.7543L7.03558 13.1727C7.74927 12.9688 8.36203 12.5076 8.75542 11.8781L10.696 8.7732ZM10.5 2C9.67157 2 9 2.67157 9 3.5V7.7132L7.05942 10.8181C6.92829 11.0279 6.72404 11.1817 6.48614 11.2497L4.45056 11.8313C3.59195 12.0766 3 12.8613 3 13.7543V18.5468C3 19.6255 3.87447 20.5 4.95319 20.5C5.87021 20.5 6.78124 20.6478 7.65121 20.9378L9.14427 21.4355C10.2659 21.8094 11.4405 22 12.6228 22H13H14H16.5C18.2692 22 19.7319 20.6873 19.967 18.9827C20.6039 18.3496 21 17.4709 21 16.5C21 16.4369 20.9983 16.3742 20.995 16.3118C21.3153 15.783 21.5 15.1622 21.5 14.5C21.5 13.8378 21.3153 13.217 20.995 12.6883C20.9983 12.6258 21 12.5631 21 12.5C21 10.567 19.433 9 17.5 9H15.9338C15.9752 8.6755 16 8.33974 16 8C16 6.98865 15.7788 5.80611 15.5539 4.85235C15.1401 3.09702 13.5428 2 11.8377 2H10.5Z" fill="currentColor"></path></svg></div></div></button></div></div>
//   */