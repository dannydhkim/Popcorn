function createCustomButton() {
    if (playButton.parentElement.querySelector('.custom-button')) return;


    const playButton = document.createElement('button');
    // Add classes to match Netflix's button styles
    playButton.classList.add('color-secondary', 'hasLabel', 'hasIcon', 'ltr-18ezbm2');
    playButton.type = 'button';
    playButton.setAttribute('data-uia', 'custom-button'); // Optional identifier
  
    // Create inner content
    const divWrapper = document.createElement('div');
    divWrapper.classList.add('ltr-1st24vv');
  
    // Optional: Add an icon
    const iconDiv = document.createElement('div');
    iconDiv.classList.add('medium', 'ltr-iyulz3');
    iconDiv.setAttribute('role', 'presentation');
    // You can insert an SVG or image into iconDiv if desired
  
    // Spacer
    const spacerDiv = document.createElement('div');
    spacerDiv.classList.add('ltr-1npqywr');
    spacerDiv.style.width = '1rem';
  
    // Button text
    const spanText = document.createElement('span');
    spanText.classList.add('ltr-1vh9doa');
    spanText.textContent = 'Your Button Text'; // Replace with your text
  
    // Assemble the button
    divWrapper.appendChild(iconDiv);
    playButton.appendChild(divWrapper);
    playButton.appendChild(spacerDiv);
    playButton.appendChild(spanText);
  
    // Add an event listener if needed
    playButton.addEventListener('click', () => {
      // Define your button's functionality here
      alert('Custom button clicked!');
    });
  
    return playButton;
  }