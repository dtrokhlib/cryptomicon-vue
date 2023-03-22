
export class SocketConnector {
    socket;

    get socket() {
        if(this.socket) {
            return this.socket;
        }
        return null;
    }

    constructor(connectionString) {
        this.socket = new WebSocket(connectionString);
    }

    addListener(event, fn) {
        this.socket.addEventListener(event, fn);
    }

    sendMessage(message) {
        const stringifiedMessage = typeof message === 'string' ? message : JSON.stringify(message);
        
        if (this.socket.readyState === WebSocket.OPEN) {
            return this.socket.send(stringifiedMessage);
        }

        this.socket.addEventListener('open', () => {
            this.socket.send(stringifiedMessage);
        }, { once: true });
    }
}