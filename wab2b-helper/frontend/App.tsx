import { useState } from "react";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";
import { MediaModal, MediaItem } from "./components/MediaModal";
import { ToastContainer, useToast } from "./components/ToastContainer";
import { AttachmentHandler } from "./components/AttachmentHandler";

// Sample media items for demo
const sampleMediaItems: MediaItem[] = [
  {
    id: "1",
    type: "image",
    name: "profile_photo.jpg",
    url: "https://picsum.photos/id/237/200/300",
    thumbnailUrl: "https://picsum.photos/id/237/50/50"
  },
  {
    id: "2",
    type: "document",
    name: "contract_agreement.pdf",
    url: "https://example.com/document.pdf"
  },
  {
    id: "3",
    type: "video",
    name: "product_demo.mp4",
    url: "https://example.com/video.mp4",
    thumbnailUrl: "https://picsum.photos/id/1/50/50"
  }
];

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAttachmentHandlerOpen, setIsAttachmentHandlerOpen] = useState(true);
  const { toasts, addToast, removeToast } = useToast();
  
  // Function to open the modal with media items
  const openMediaModal = () => {
    setIsModalOpen(true);
  };

  // Function to close the attachment handler
  const closeAttachmentHandler = () => {
    setIsAttachmentHandlerOpen(false);
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
        <header className="p-4 flex justify-between items-center glass-morphism bg-white dark:bg-gray-800 shadow-md">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">WAB2B Helper</h1>
          <ThemeToggle />
        </header>
        
        <main className="container mx-auto p-6">
          <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden glass-morphism p-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              WhatsApp Business Helper
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              This tool helps you quickly copy media attachments to your clipboard for pasting into WhatsApp.
            </p>
            
            <div className="flex flex-col space-y-4">
              <button
                onClick={openMediaModal}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
              >
                Open Media Modal
              </button>
              
              <button
                onClick={() => addToast("This is a sample notification!", "success")}
                className="px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Show Success Toast
              </button>
              
              <button
                onClick={() => addToast("Something went wrong!", "error")}
                className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Show Error Toast
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">URL Scheme Usage</h3>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Use <code className="bg-blue-100 dark:bg-blue-800 px-1 py-0.5 rounded">wab2b-helper:https://example.com/file.jpg</code> to automatically copy any attachment to clipboard.
              </p>
            </div>
          </div>
        </main>
        
        {/* Media Modal Component */}
        <MediaModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          mediaItems={sampleMediaItems}
          title="MS Contact Renewal Attachments"
        />
        
        {/* Attachment Handler for URL Scheme */}
        {isAttachmentHandlerOpen && (
          <AttachmentHandler 
            onClose={closeAttachmentHandler}
            addToast={addToast}
          />
        )}
        
        {/* Toast Container */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    </ThemeProvider>
  );
}

export default App;
