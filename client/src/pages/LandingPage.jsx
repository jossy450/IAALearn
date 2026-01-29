import React, { useState } from 'react';

const LandingPage = () => {
  const [cvFile, setCvFile] = useState(null);
  const [jobDescriptionFile, setJobDescriptionFile] = useState(null);

  const handleCvChange = (event) => {
    setCvFile(event.target.files[0]);
  };

  const handleJobDescriptionChange = (event) => {
    setJobDescriptionFile(event.target.files[0]);
  };

  const handleSubmit = () => {
    // Handle the submission of files
    if (cvFile) {
      // Upload CV
    }
    if (jobDescriptionFile) {
      // Upload Job Description
    }
  };

  return (
    <div>
      <h1>Welcome to the Landing Page</h1>
      <input type="file" onChange={handleCvChange} accept="application/pdf" />
      <input type="file" onChange={handleJobDescriptionChange} accept="application/pdf" />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
};

export default LandingPage;