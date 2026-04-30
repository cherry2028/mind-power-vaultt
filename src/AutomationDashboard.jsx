import React, { useState } from 'react';

export default function AutomationDashboard() {
  const [activeTab, setActiveTab] = useState('youtube');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 border-b border-[#2a2a2a] pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#d4af37] to-[#f9f1cc] bg-clip-text text-transparent">
              Creator Automation
            </h1>
            <p className="text-gray-400 mt-2 text-sm">Mind Power Vaultt Master Dashboard</p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#333] rounded text-sm transition-colors"
          >
            Back to Website
          </button>
        </header>

        {/* Tabs */}
        <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'youtube', label: '🔴 YouTube Auto-SEO', icon: '📹' },
            { id: 'thumbnails', label: '🎨 AI Thumbnails', icon: '🖼️' },
            { id: 'twitter', label: '🐦 X / Threads', icon: '📝' },
            { id: 'voice', label: '🎙️ Voice Cloning', icon: '🗣️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-[#d4af37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]' 
                  : 'bg-[#1a1a1a] text-gray-400 border border-[#333] hover:bg-[#222]'
              }`}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-8 min-h-[400px]">
          {activeTab === 'youtube' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-semibold mb-4 text-[#d4af37]">YouTube Auto-SEO Engine</h2>
              <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                Connect your YouTube channel to automatically analyze and update video titles, descriptions, and tags every 7 days based on current trending keywords.
              </p>
              
              <div className="bg-[#1a1a1a] p-6 rounded-lg border border-[#333] flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📺</span>
                </div>
                <h3 className="font-medium">Connect YouTube Channel</h3>
                <p className="text-xs text-gray-500 max-w-md">
                  We need your permission to manage YouTube videos. We will use the official Google API (100% secure and free).
                </p>
                <button className="mt-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors">
                  Authenticate with Google
                </button>
              </div>
            </div>
          )}

          {activeTab === 'thumbnails' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-semibold mb-4 text-[#d4af37]">AI Thumbnail Generator</h2>
              <p className="text-gray-400 mb-6 text-sm leading-relaxed">
                Generate high-converting, eye-catching thumbnails for your trading videos using AI. Just describe your video topic.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Video Topic / Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Stop Loss hit ayyaka revenge trade aapadam ela?" 
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded px-4 py-3 text-white focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Thumbnail Style</label>
                  <select className="w-full bg-[#1a1a1a] border border-[#333] rounded px-4 py-3 text-white focus:outline-none focus:border-[#d4af37]">
                    <option>Trading Chart (Dark & Neon)</option>
                    <option>Shocked Face (Vlog Style)</option>
                    <option>Minimalist Text</option>
                  </select>
                </div>
                <button className="w-full px-6 py-3 bg-[#d4af37] hover:bg-[#ebd074] text-black font-bold rounded transition-colors flex justify-center items-center gap-2">
                  <span>🎨</span> Generate Thumbnail
                </button>
              </div>
            </div>
          )}

          {activeTab === 'twitter' && (
            <div className="animate-fade-in flex flex-col items-center justify-center h-[300px] text-center">
              <span className="text-4xl mb-4">🐦</span>
              <h2 className="text-xl font-semibold mb-2">X / Threads Automation</h2>
              <p className="text-gray-500 text-sm">Coming in Phase 2</p>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="animate-fade-in flex flex-col items-center justify-center h-[300px] text-center">
              <span className="text-4xl mb-4">🎙️</span>
              <h2 className="text-xl font-semibold mb-2">Voice Cloning Studio</h2>
              <p className="text-gray-500 text-sm">Requires ElevenLabs API integration</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
