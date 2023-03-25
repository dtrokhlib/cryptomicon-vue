const API_KEY = '976e862f8ec3cbb0054f8f8da3a6ed26f0078c92474004333593c3d4aace5891';
const COIN_SOCKET_URL = 'wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}';
const connectionString = COIN_SOCKET_URL.replace('${API_KEY}', API_KEY);


let socket;

function connectToWebSocket() {
    socket = new WebSocket(connectionString);

    socket.onopen = () => {
      console.log('WebSocket connection established');
    }

    socket.onerror = (error) => {
      console.log(`WebSocket Error: ${error}`);
    }

    socket.onmessage = (e) => {
      subscribedPorts.forEach(client => client.postMessage(e.data));
    }

    socket.onclose = () => {
      console.log('WebSocket connection closed. Trying to reconnect');
      setTimeout(connectToWebSocket, 1000);
    }
}

connectToWebSocket();

const subscribedPorts = [];

// eslint-disable-next-line no-undef
onconnect = (e) => {
    const port = e.ports[0];
    subscribedPorts.push(port);

    port.addEventListener("message", (e) => {
        if (socket.readyState === WebSocket.OPEN) {
          return socket.send(e.data);
        }
    
        socket.addEventListener('open', () => { socket.send(e.data) }, { once: true });
    });

    port.start();
} 