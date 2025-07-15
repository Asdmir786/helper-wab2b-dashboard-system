import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { animate, createScope } from 'animejs';
import { useEffect, useRef } from 'react';

interface TitleBarProps {
	version: string;
	isDarkMode: boolean;
}

const TitleBar: React.FC<TitleBarProps> = ({ version, isDarkMode }) => {
	const buttonsRef = useRef<HTMLDivElement>(null);
	const scope = createScope();
	const appNameRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		if (buttonsRef.current) {
			// Animate the buttons on mount
			scope.add((_self) => {
				animate(buttonsRef.current!.children, {
					translateY: [10, 0],
					opacity: [0, 1],
					duration: 600,
					delay: (_el, i) => i * 100,
					easing: 'easeOutCubic',
				});
			});
		}
	}, []);

	useEffect(() => {
		if (!appNameRef.current) return;
		const targetColor = isDarkMode ? '#fff' : '#111827'; // white or gray-900
		// Animate color transition
		animate(appNameRef.current, {
			color: targetColor,
			duration: 400,
			easing: 'easeInOutQuad',
		});
	}, [isDarkMode]);

	const handleMinimize = () => WebviewWindow.getCurrent().minimize();
	const handleMaximize = () => WebviewWindow.getCurrent().toggleMaximize();
	const handleClose = () => WebviewWindow.getCurrent().close();

	const animateButtonHover = (target: HTMLElement) => {
		animate(target, {
			scale: 1.08,
			duration: 200,
			easing: 'easeOutCubic',
		});
	};

	const animateButtonLeave = (target: HTMLElement) => {
		animate(target, {
			scale: 1,
			duration: 200,
			easing: 'easeOutCubic',
		});
	};

	return (
		<div
			className="titlebar flex items-center px-2 h-10 select-none bg-gray-50 dark:bg-gray-900"
			data-tauri-drag-region
		>
			<div className="flex items-center flex-1" data-tauri-drag-region>
				<div className="flex items-center">
					<img src="/tauri.svg" className="w-5 h-5 mr-2" alt="Logo" />
					<span
						ref={appNameRef}
						className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
						data-tauri-drag-region
					>
						wab2b-helper
					</span>
					<span
						className="text-xs ml-2 text-gray-500 dark:text-gray-400 font-mono"
						data-tauri-drag-region
					>
						v{version}
					</span>
				</div>
			</div>
			<div className="flex" ref={buttonsRef}>
				<button
					className="titlebar-button group rounded-md p-2 mx-0.5 text-gray-800 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
					onClick={handleMinimize}
					onMouseEnter={(e) => animateButtonHover(e.currentTarget)}
					onMouseLeave={(e) => animateButtonLeave(e.currentTarget)}
					title="Minimize"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className={`${isDarkMode ? 'text-white' : 'text-black'} group-hover:text-white`}
					>
						<line x1="5" y1="12" x2="19" y2="12"></line>
					</svg>
				</button>
				<button
					className="titlebar-button group rounded-md p-2 mx-0.5 text-gray-800 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
					onClick={handleMaximize}
					onMouseEnter={(e) => animateButtonHover(e.currentTarget)}
					onMouseLeave={(e) => animateButtonLeave(e.currentTarget)}
					title="Maximize"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className={`${isDarkMode ? 'text-white' : 'text-black'} group-hover:text-white`}
					>
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
					</svg>
				</button>
				<button
					className="titlebar-button group rounded-md p-2 ml-0.5 text-gray-800 hover:bg-red-500 hover:text-white dark:text-gray-200 dark:hover:bg-red-500 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
					onClick={handleClose}
					onMouseEnter={(e) => animateButtonHover(e.currentTarget)}
					onMouseLeave={(e) => animateButtonLeave(e.currentTarget)}
					title="Close"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className={`${isDarkMode ? 'text-white' : 'text-black'} group-hover:text-white`}
					>
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>
		</div>
	);
};

export default TitleBar; 