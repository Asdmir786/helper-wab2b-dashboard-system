import { invoke } from "@tauri-apps/api/core";

const TitleBar = () => {
  const handleMinimize = async () => {
    await invoke("plugin:window|minimize");
  };
  
  const handleMaximize = async () => {
    await invoke("plugin:window|toggle_maximize");
  };
  
  const handleClose = async () => {
    await invoke("plugin:window|close");
  };

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="flex">
        <button 
          className="titlebar-button hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={handleMinimize}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button 
          className="titlebar-button hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={handleMaximize}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
        </button>
        <button 
          className="titlebar-button hover:bg-red-500 hover:text-white"
          onClick={handleClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar; 