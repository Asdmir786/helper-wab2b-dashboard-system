import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--body-bg)] transition-colors duration-500">
        {/* Theme toggle positioned in the corner */}
        <header className="absolute top-4 right-4 flex items-center gap-2">
          {/* WIP check-for-updates button */}
          <button
            disabled
            title="Check for updates (WIP)"
            className="w-9 h-9 rounded-full bg-[var(--control-bg)] cursor-not-allowed flex items-center justify-center"
          >
            <ArrowPathIcon className="h-5 w-5 text-[var(--control-icon)]" />
          </button>
          <ThemeToggle />
        </header>

        {/* Main rectangle */}
        <div className="w-80 p-6 rounded-lg shadow-md glass-morphism text-center">
          <h2 className="text-lg font-semibold text-[var(--panel-text)] mb-4">
            Waiting for an attachment…
          </h2>

        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
