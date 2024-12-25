import React, { useState } from 'react';

const Banner = ({ title, actors, description, extraInfo }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    console.log("test")
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className={`banner bg-gray-800 p-4 rounded-md mb-5 
      ${isExpanded ? 'expanded-class' : ''}`}>
      <h1>{title}</h1>
      <div className="actors">
        {actors.map((actor, index) => (
          <a key={index} href={actor.link} target="_blank" rel="noopener noreferrer">
            {actor.name}
          </a>
        ))}
      </div>
      {isExpanded && <p>{extraInfo}</p>}
      <button onClick={toggleExpand}>
        {isExpanded ? 'Less Info' : 'More Info'}
      </button>
    </div>
  );
};

export default Banner;