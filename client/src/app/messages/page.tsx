'use client';

import { useState } from 'react';
import AppNavbar from '@/components/shared/AppNavbar';

const conversations = [
  { id: '1', name: 'Main Street Apartment', initials: 'MS', isHousehold: true, time: '2:45 PM', preview: 'Sarah: Can someone grab groceries?', unread: 0 },
  { id: '2', name: 'Beach House', initials: 'BH', isHousehold: true, time: 'Yesterday', preview: "Emma: Don't forget to lock up", unread: 0 },
  { id: '3', name: 'Sarah Chen', initials: 'SC', isHousehold: false, time: 'Monday', preview: 'Thanks for cleaning!', unread: 2 },
  { id: '4', name: 'Campus Dorm Suite', initials: 'CD', isHousehold: true, time: 'Sunday', preview: 'You: See you later!', unread: 0 },
  { id: '5', name: 'Michael Kim', initials: 'MK', isHousehold: false, time: 'Feb 1', preview: 'Sounds good!', unread: 0 },
];

const messages = [
  { id: '1', sender: 'Sarah Chen', initials: 'SC', time: '2:30 PM', text: "Hey everyone! Quick reminder that I won't be able to vacuum this week. Can someone swap with me?", sent: false },
  { id: '2', sender: 'Michael Kim', initials: 'MK', time: '2:32 PM', text: 'I can take care of it! No problem.', sent: false },
  { id: '3', sender: 'Sarah Chen', initials: 'SC', time: '2:33 PM', text: 'Thank you!', sent: false },
  { id: '4', sender: 'You', initials: 'JD', time: '2:40 PM', text: "While we're at it, does anyone need anything from the grocery store? I'm heading there now.", sent: true },
  { id: '5', sender: 'Sarah Chen', initials: 'SC', time: '2:45 PM', text: "Can you grab some milk and eggs? We're almost out.", sent: false },
  { id: '6', sender: 'Alex Lee', initials: 'AL', time: '2:46 PM', text: 'And paper towels please!', sent: false },
];

export default function MessagesPage() {
  const [activeConvo, setActiveConvo] = useState('1');
  const [messageText, setMessageText] = useState('');

  return (
    <div className="h-screen flex flex-col bg-base overflow-hidden">
      <AppNavbar />

      <div className="flex flex-1 max-w-[1400px] mx-auto w-full overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-surface border-r border-divider flex flex-col flex-shrink-0">
          <div className="p-6 border-b border-divider">
            <h2 className="text-2xl font-heading font-semibold mb-2">Messages</h2>
            <input
              type="text"
              className="w-full px-4 py-2.5 border border-divider rounded-sm text-sm bg-base focus:outline-none focus:border-sage"
              placeholder="Search conversations..."
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveConvo(c.id)}
                className={`flex gap-4 p-4 border-b border-divider cursor-pointer transition-colors ${
                  activeConvo === c.id
                    ? 'bg-soft-highlight border-l-[3px] border-l-sage'
                    : 'hover:bg-base'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 ${
                    c.isHousehold ? 'bg-terracotta' : 'bg-sage'
                  }`}
                >
                  {c.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-semibold text-[15px]">{c.name}</span>
                    <span className="text-xs text-text-secondary">{c.time}</span>
                  </div>
                  <div className="text-sm text-text-secondary truncate">{c.preview}</div>
                </div>
                {c.unread > 0 && (
                  <div className="w-5 h-5 rounded-full bg-sage text-white flex items-center justify-center text-[11px] font-semibold flex-shrink-0 self-center">
                    {c.unread}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-base">
          <div className="px-6 py-4 bg-surface border-b border-divider flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-terracotta text-white flex items-center justify-center font-semibold">
                MS
              </div>
              <div>
                <h3 className="text-lg font-heading font-semibold">Main Street Apartment</h3>
                <div className="text-[13px] text-text-secondary">You, Sarah, Michael, Alex</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 border border-divider bg-transparent rounded-sm flex items-center justify-center hover:bg-base hover:border-sage transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87m-4-12a4 4 0 0 1 0 7.75" />
                </svg>
              </button>
              <button className="w-10 h-10 border border-divider bg-transparent rounded-sm flex items-center justify-center hover:bg-base hover:border-sage transition-all">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            <div className="text-center my-4">
              <span className="px-4 py-1 bg-surface rounded-full text-xs text-text-secondary border border-divider">
                Today
              </span>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 max-w-[70%] ${msg.sent ? 'self-end flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 ${
                    msg.sent ? 'bg-terracotta' : 'bg-sage'
                  }`}
                >
                  {msg.initials}
                </div>
                <div className="flex-1">
                  <div className={`flex items-baseline gap-2 mb-1 ${msg.sent ? 'flex-row-reverse' : ''}`}>
                    <span className="font-semibold text-sm">{msg.sender}</span>
                    <span className="text-xs text-text-secondary">{msg.time}</span>
                  </div>
                  <div
                    className={`p-4 rounded-md ${
                      msg.sent
                        ? 'bg-sage text-white border border-sage'
                        : 'bg-surface border border-divider'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-surface border-t border-divider">
            <div className="flex gap-2 items-end">
              <button className="w-10 h-10 border border-divider bg-transparent rounded-sm flex items-center justify-center hover:bg-base hover:border-sage transition-all flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>
              <textarea
                className="flex-1 px-4 py-3 border border-divider rounded-md text-base resize-none focus:outline-none focus:border-sage max-h-[120px]"
                placeholder="Type a message..."
                rows={1}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
              <button className="w-12 h-12 bg-sage text-white rounded-sm flex items-center justify-center hover:bg-sage-hover transition-all flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
