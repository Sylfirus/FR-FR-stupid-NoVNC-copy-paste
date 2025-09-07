class VNCPaste {
    constructor(config = {}) {
        this.config = {
            selector: '#noVNC_canvas',
            fallbackSelector: 'canvas',
            delay: 50,
            enableLogging: true,
            rightClickEnabled: true,
            ...config
        };
        
        this.canvas = null;
        this.isInitialized = false;
        this.specialKeys = new Map([
            // chiffres et spéciaux AZERTY
            ['&', { key: '1' }],
            ['é', { key: '2' }],
            ['"', { key: '3' }],
            ["'", { key: '4' }],
            ['(', { key: '5' }],
            ['-', { key: '6' }],
            ['è', { key: '7' }],
            ['_', { key: '8' }],
            ['ç', { key: '9' }],
            ['à', { key: '0' }],
            [')', { key: '°' }],
            ['=', { key: '+' }],

            // AltGr mappings (indispensable pour SSH keys)
            ['@', { key: '0', altKey: true }],
            ['#', { key: '3', altKey: true }],
            ['[', { key: '5', altKey: true }],
            [']', { key: '°', altKey: true }],
            ['{', { key: '4', altKey: true }],
            ['}', { key: '°', altKey: true }],
            ['\\', { key: '8', altKey: true }],
            ['|', { key: '6', altKey: true }],
            ['~', { key: '2', altKey: true }],

            // QWERTY -> AZERTY corrections
            ['a', { key: 'q' }],
            ['q', { key: 'a' }],
            ['w', { key: 'z' }],
            ['z', { key: 'w' }],
            ['m', { key: ',' }],
            [',', { key: 'm' }],
            [';', { key: 'm', shiftKey: true }],
            ['A', { key: 'Q', shiftKey: true }],
            ['Q', { key: 'A', shiftKey: true }],
            ['W', { key: 'Z', shiftKey: true }],
            ['Z', { key: 'W', shiftKey: true }],
            ['M', { key: '?' }],
            ['?', { key: 'M', shiftKey: true }],
            
            // ponctuation courante
            ['.', { key: ';' }],
            [';', { key: '.' }],
            ['/', { key: ':' }],
            [':', { key: '/' }],
            ['!', { key: '1', shiftKey: true }],
            ['²', { key: '2', shiftKey: true }],

            // majuscules QWERTY -> AZERTY
            ['B', { key: 'B', shiftKey: true }],
            ['C', { key: 'C', shiftKey: true }],
            ['D', { key: 'D', shiftKey: true }],
            ['E', { key: 'E', shiftKey: true }],
            ['F', { key: 'F', shiftKey: true }],
            ['G', { key: 'G', shiftKey: true }],
            ['H', { key: 'H', shiftKey: true }],
            ['I', { key: 'I', shiftKey: true }],
            ['J', { key: 'J', shiftKey: true }],
            ['K', { key: 'K', shiftKey: true }],
            ['L', { key: 'L', shiftKey: true }],
            ['N', { key: 'N', shiftKey: true }],
            ['O', { key: 'O', shiftKey: true }],
            ['P', { key: 'P', shiftKey: true }],
            ['R', { key: 'R', shiftKey: true }],
            ['S', { key: 'S', shiftKey: true }],
            ['T', { key: 'T', shiftKey: true }],
            ['U', { key: 'U', shiftKey: true }],
            ['V', { key: 'V', shiftKey: true }],
            ['X', { key: 'X', shiftKey: true }],
            ['Y', { key: 'Y', shiftKey: true }]
            ]);
    }

    log(...args) {
        if (this.config.enableLogging) {
            console.log('[VNCPaste]', ...args);
        }
    }

    error(...args) {
        console.error('[VNCPaste]', ...args);
    }

    findCanvas() {
        this.canvas = document.querySelector(this.config.selector) || 
                     document.querySelector(this.config.fallbackSelector);
        
        if (!this.canvas) {
            throw new Error('No se encontró el elemento canvas');
        }
        return this.canvas;
    }

    createKeyboardEvent(type, key, options = {}) {
        const defaultOptions = {
            key,
            code: `Key${key.toUpperCase()}`,
            keyCode: key.charCodeAt(0),
            charCode: key.charCodeAt(0),
            which: key.charCodeAt(0),
            bubbles: true,
            ...options
        };

        return new KeyboardEvent(type, defaultOptions);
    }

    async sendKeyboardEvents(char) {
        const specialKey = this.specialKeys.get(char);
        let keyInfo;
        
        if (specialKey) {
            keyInfo = specialKey;
        } else if (/[A-Z]/.test(char)) {
            keyInfo = { key: char, shiftKey: true };
        } else {
            keyInfo = { key: char, shiftKey: false };
        }

        const events = ['keydown', 'keypress', 'keyup'];
        
        for (const eventType of events) {
            try {
                await new Promise(resolve => {
                    setTimeout(() => {
                        this.canvas.dispatchEvent(
                            this.createKeyboardEvent(eventType, keyInfo.key, {
                                shiftKey: keyInfo.shiftKey
                            })
                        );
                        resolve();
                    }, 10);
                });
            } catch (error) {
                this.error(`Error enviando evento ${eventType}:`, error);
                throw error;
            }
        }
    }

    async sendString(text) {
        if (!this.canvas) {
            this.error('Canvas no inicializado');
            return;
        }

        for (let i = 0; i < text.length; i++) {
            try {
                await new Promise(resolve => 
                    setTimeout(resolve, this.config.delay)
                );
                await this.sendKeyboardEvents(text[i]);
            } catch (error) {
                this.error(`Error enviando caracter '${text[i]}':`, error);
            }
        }
    }

    async handleRightClick(event) {
        if (event.button === 2 && this.config.rightClickEnabled) {
            event.preventDefault();
            
            try {
                const text = await navigator.clipboard.readText();
                await this.sendString(text);
                this.log('Texto pegado exitosamente');
            } catch (error) {
                this.error('Error al acceder al portapapeles:', error);
            }
        }
    }

    init() {
        if (this.isInitialized) {
            this.error('VNCPaste ya está inicializado');
            return;
        }

        try {
            this.findCanvas();
            
            this.canvas.addEventListener('mousedown', 
                this.handleRightClick.bind(this)
            );
            
            window.sendString = this.sendString.bind(this);
            
            this.isInitialized = true;
            this.log('Inicializado correctamente');
            
        } catch (error) {
            this.error('Error durante la inicialización:', error);
            throw error;
        }
    }

    destroy() {
        if (!this.isInitialized) return;

        if (this.canvas) {
            this.canvas.removeEventListener('mousedown', 
                this.handleRightClick.bind(this)
            );
        }
        
        delete window.sendString;
        this.isInitialized = false;
        this.log('Destruido correctamente');
    }
}

// Inicialización
const vncPaste = new VNCPaste({
    enableLogging: true,
    delay: 50
});

try {
    vncPaste.init();
} catch (error) {
    console.error('Error al inicializar VNCPaste:', error);
}
