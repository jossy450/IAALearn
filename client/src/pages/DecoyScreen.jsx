import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const decoyContent = {
  'google-search': {
    title: 'interview preparation best practices - Google Search',
    content: (
      <div className="h-full bg-white">
        <div className="bg-white border-b px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-blue-600">G</div>
            <div className="text-2xl font-bold text-red-600">o</div>
            <div className="text-2xl font-bold text-yellow-500">o</div>
            <div className="text-2xl font-bold text-blue-600">g</div>
            <div className="text-2xl font-bold text-green-600">l</div>
            <div className="text-2xl font-bold text-red-600">e</div>
          </div>
          <input 
            type="text" 
            value="interview preparation best practices"
            readOnly
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full"
          />
        </div>
        <div className="p-6">
          <div className="text-sm text-gray-600 mb-4">About 847,000,000 results (0.52 seconds)</div>
          <div className="space-y-6">
            <div>
              <div className="text-blue-600 text-xl hover:underline cursor-pointer">
                10 Interview Preparation Tips: How To Prepare for an Interview
              </div>
              <div className="text-green-700 text-sm">https://www.indeed.com › career-advice › interviewing</div>
              <div className="text-gray-600 text-sm mt-1">
                Research the company and your interviewers · Practice your answers to common interview questions · Study the job description · Answer questions using...
              </div>
            </div>
            <div>
              <div className="text-blue-600 text-xl hover:underline cursor-pointer">
                How to Prepare for an Interview (With Tips and Examples)
              </div>
              <div className="text-green-700 text-sm">https://www.thebalancemoney.com › job-interview-preparation</div>
              <div className="text-gray-600 text-sm mt-1">
                Learn how to prepare for an interview, including researching the company, reviewing common questions, preparing questions to ask, and more.
              </div>
            </div>
            <div>
              <div className="text-blue-600 text-xl hover:underline cursor-pointer">
                Interview Preparation: A Complete Guide - LinkedIn
              </div>
              <div className="text-green-700 text-sm">https://www.linkedin.com › pulse › interview-preparation</div>
              <div className="text-gray-600 text-sm mt-1">
                Comprehensive guide to interview preparation including behavioral questions, technical assessments, and follow-up strategies.
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  'stackoverflow': {
    title: 'How to implement OAuth2 in React - Stack Overflow',
    content: (
      <div className="h-full bg-white">
        <div className="bg-gray-50 border-b px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="font-bold text-xl">stack<span className="text-orange-600">overflow</span></div>
            <input 
              type="text" 
              placeholder="Search..."
              className="w-96 px-4 py-1.5 border border-gray-300 rounded"
            />
          </div>
        </div>
        <div className="flex">
          <div className="w-48 bg-gray-50 border-r p-4">
            <div className="space-y-2 text-sm">
              <div className="text-gray-700">Home</div>
              <div className="font-bold">Questions</div>
              <div className="text-gray-700">Tags</div>
              <div className="text-gray-700">Users</div>
            </div>
          </div>
          <div className="flex-1 p-6">
            <h1 className="text-2xl font-bold mb-4">
              How to implement OAuth2 authentication in React application?
            </h1>
            <div className="text-sm text-gray-600 mb-4">
              Asked 2 hours ago · Modified 1 hour ago · Viewed 127 times
            </div>
            <div className="prose max-w-none">
              <p className="text-gray-700">
                I'm trying to implement OAuth2 authentication in my React application using Express backend.
                I've set up the authorization flow but having issues with token refresh...
              </p>
              <pre className="bg-gray-100 p-4 rounded mt-4">
{`const authConfig = {
  clientId: process.env.CLIENT_ID,
  redirectUri: 'http://localhost:3000/callback',
  scope: 'read write'
};`}
              </pre>
            </div>
            <div className="mt-6 border-t pt-6">
              <div className="font-bold mb-4">2 Answers</div>
              <div className="bg-green-50 border-l-4 border-green-500 p-4">
                <div className="flex items-start gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">42</div>
                    <div className="text-xs text-gray-600">votes</div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-700">
                      You should use a library like react-oauth2-hook or implement it manually using...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  'documentation': {
    title: 'React Documentation - Components and Props',
    content: (
      <div className="h-full bg-gray-50">
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold">React Documentation</div>
          <input 
            type="text" 
            placeholder="Search docs..."
            className="px-4 py-1.5 bg-gray-800 border border-gray-700 rounded text-white"
          />
        </div>
        <div className="flex">
          <div className="w-64 bg-white border-r p-6 overflow-y-auto h-screen">
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-bold text-gray-900 mb-2">Get Started</div>
                <div className="space-y-1 pl-4">
                  <div className="text-gray-600">Installation</div>
                  <div className="text-gray-600">Quick Start</div>
                </div>
              </div>
              <div>
                <div className="font-bold text-gray-900 mb-2">Learn React</div>
                <div className="space-y-1 pl-4">
                  <div className="text-blue-600">Components</div>
                  <div className="text-gray-600">Props</div>
                  <div className="text-gray-600">State</div>
                  <div className="text-gray-600">Hooks</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-y-auto">
            <h1 className="text-3xl font-bold mb-6">Components and Props</h1>
            <div className="prose max-w-none">
              <p className="text-gray-700 mb-4">
                Components let you split the UI into independent, reusable pieces, and think about each piece in isolation.
              </p>
              <h2 className="text-2xl font-bold mt-6 mb-3">Function Components</h2>
              <pre className="bg-gray-800 text-gray-100 p-4 rounded">
{`function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}

const element = <Welcome name="Sara" />;`}
              </pre>
              <p className="text-gray-700 mt-4">
                This function is a valid React component because it accepts a single "props" object argument with data and returns a React element.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  'blank': {
    title: '',
    content: <div className="h-full bg-white"></div>
  }
};

const DecoyScreen = () => {
  const { type } = useParams();
  const navigate = useNavigate();
  
  const decoy = decoyContent[type] || decoyContent['blank'];

  const handleExit = () => {
    navigate('/session/active');
  };

  // Press Escape to exit decoy
  React.useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        handleExit();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="h-screen w-screen relative">
      {decoy.content}
      
      {/* Hidden exit button (triple-click to reveal) */}
      <button
        onClick={handleExit}
        className="fixed top-2 right-2 opacity-0 hover:opacity-100 transition-opacity bg-red-500 text-white p-1 rounded"
        title="Triple-click top-right corner or press Escape to exit decoy"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default DecoyScreen;
