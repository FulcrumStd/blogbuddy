import * as vscode from 'vscode';

export class StatusBarAnimation {
    private static instance: StatusBarAnimation;
    private currentAnimation: NodeJS.Timeout | null = null;
    private currentDisposable: vscode.Disposable | null = null;

    private constructor() {}

    static getInstance(): StatusBarAnimation {
        if (!StatusBarAnimation.instance) {
            StatusBarAnimation.instance = new StatusBarAnimation();
        }
        return StatusBarAnimation.instance;
    }

    /**
     * Start animated status bar message
     * @param messages Array of strings to cycle through, or single string for dot animation
     * @param interval Animation interval in milliseconds (default: 500ms)
     */
    start(messages: string | string[], interval: number = 500): void {
        this.stop();

        let frames: string[];
        
        if (typeof messages === 'string') {
            // Default dot animation for single string
            const baseMessage = messages;
            frames = [
                baseMessage,
                baseMessage + '.',
                baseMessage + '..',
                baseMessage + '...'
            ];
        } else {
            frames = messages;
        }

        if (frames.length === 0) {
            return;
        }

        let currentIndex = 0;

        const animate = () => {
            this.currentDisposable = vscode.window.setStatusBarMessage(frames[currentIndex]);
            currentIndex = (currentIndex + 1) % frames.length;
        };

        // Show first frame immediately
        animate();

        // Start animation loop
        this.currentAnimation = setInterval(animate, interval);
    }

    /**
     * Stop current animation and clear status bar
     */
    stop(): void {
        if (this.currentAnimation) {
            clearInterval(this.currentAnimation);
            this.currentAnimation = null;
        }

        if (this.currentDisposable) {
            this.currentDisposable.dispose();
            this.currentDisposable = null;
        }
    }

    /**
     * Show static message and stop any current animation
     * @param message Static message to display
     * @param timeout Optional timeout in milliseconds to clear the message
     */
    showStatic(message: string, timeout?: number): vscode.Disposable {
        this.stop();
        
        const disposable = timeout 
            ? vscode.window.setStatusBarMessage(message, timeout)
            : vscode.window.setStatusBarMessage(message);
        
        if (!timeout) {
            this.currentDisposable = disposable;
        }
        
        return disposable;
    }

    /**
     * Dispose of all resources
     */
    dispose(): void {
        this.stop();
    }
}