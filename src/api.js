const COINT_API_URL = 'https://min-api.cryptocompare.com';
const API_KEY = '976e862f8ec3cbb0054f8f8da3a6ed26f0078c92474004333593c3d4aace5891';
const COIN_CURRENCY = 'USD';
const AGGREGATE_INDEX = '5';

const tickersHandlers = new Map();
const socket = new WebSocket(`wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`);

socket.addEventListener('message', (e) => {
   const { TYPE: type, FROMSYMBOL: coin, PRICE: newPrice } = JSON.parse(e.data);
   if(type !== AGGREGATE_INDEX || !newPrice) {
      return;
   }

  const handlers = tickersHandlers.get(coin) ?? [];
  handlers.forEach(fn => fn(getPrice(newPrice)));
})

function subscribeToTickerOnWs(ticker) {
  sendToWebSocket({
    action: "SubAdd",
    subs: [`${AGGREGATE_INDEX}~CCCAGG~${ticker}~${COIN_CURRENCY}`],
  });
}

function unsubscribeToTickerOnWs(ticker) {
  sendToWebSocket({
    action: "SubRemove",
    subs: [`${AGGREGATE_INDEX}~CCCAGG~${ticker}~${COIN_CURRENCY}`],
  });
}

function sendToWebSocket(message) {
  const stringifiedMessage = JSON.stringify(message);

  if(socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
  }

  socket.addEventListener('open', () => {
    socket.send(stringifiedMessage);
  }, { once: true })
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker);
}

export const unsubscribeFromTicker = (ticker) => {
  tickersHandlers.delete(ticker);
  unsubscribeToTickerOnWs(ticker);
}

export const getCoinList = async () => {
  const res = await fetch(`${COINT_API_URL}/data/all/coinlist?summary=true`);
  const { Data } = await res.json();
  return Object.keys(Data).map((key) => Data[key]);
}

const getPrice = (price) => {
  if (!price) {
    return  '-';
  }
  return price > 1 ? price.toFixed(2) : price.toPrecision(2);
}
