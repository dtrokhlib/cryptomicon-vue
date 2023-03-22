import { SocketConnector } from "./socket-connection";

const routes = {
  coinlist: 'data/all/coinlist'
}

export class CryptoApi {
  tickerHandlers = new Map();
  tickerMetadata = new Map();

  constructor(
    apiData,
    socketConnector,
  ) {
    this.apiData = apiData;
    this.socketConnector = socketConnector;
    this.initEventListener();
  }

  initEventListener() {
    this.socketConnector.addListener('message', (e) => {
      const { TYPE, PRICE, FROMSYMBOL, PARAMETER, MESSAGE } = JSON.parse(e.data);
      if (TYPE === this.apiData.AGGREGATE_INDEX) {
        const handlers = this.tickerHandlers.get(FROMSYMBOL)?.callbacks || [];
        const price = getPrice(PRICE);
        handlers.forEach(fn => fn(price));
      }

      if(TYPE === '500' && MESSAGE === 'INVALID_SUB') {
        const params = PARAMETER.split('~');
        const tickerName = params[params.length - 2];
        this.tickerHandlers.get(tickerName)?.makeInvalid(); 
        // this.removeTicker(params[params.length - 2]);
      }
    });
  }

  addTicker(ticker, cb, makeInvalid) {
    const subscribers = this.tickerHandlers.get(ticker)?.callbacks || [];
    this.tickerHandlers.set(ticker, { 
      callbacks: [...subscribers, cb], 
      makeInvalid: makeInvalid,
    });
    this.subscribeToUpdates(ticker);
  }

  removeTicker(ticker) {
    this.tickerHandlers.delete(ticker);
    this.unsubscribeFromUpdates(ticker);
  }

  subscribeToUpdates(ticker) {
    this.socketConnector.sendMessage({
      action: "SubAdd",
      subs: [`${this.apiData.AGGREGATE_INDEX}~CCCAGG~${ticker}~${this.apiData.COIN_CURRENCY}`],
    });
  }

  unsubscribeFromUpdates(ticker) {
    this.socketConnector.sendMessage({
      action: "SubRemove",
      subs: [`${this.apiData.AGGREGATE_INDEX}~CCCAGG~${ticker}~${this.apiData.COIN_CURRENCY}`],
    });
  }

  async getCoinList() {
    const url = `${this.apiData.COIN_API_URL}/${routes.coinlist}?api_key=${this.apiData.API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    return  Object.keys(json.Data);
  }

}

const apiData = {
  COIN_API_URL: 'https://min-api.cryptocompare.com',
  COIN_SOCKET_URL: 'wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}',
  API_KEY: '976e862f8ec3cbb0054f8f8da3a6ed26f0078c92474004333593c3d4aace5891',
  COIN_CURRENCY: 'USD',
  SECONDARY_CURRENCY: 'BTC',
  AGGREGATE_INDEX: '5',
}

const connectionString = apiData.COIN_SOCKET_URL.replace('${API_KEY}', apiData.API_KEY);
const socketConnector = new SocketConnector(connectionString);
export const cryptoApi = new CryptoApi(apiData, socketConnector);

export const getPrice = (price) => {
  if (!price) {
    return  '-';
  }
  return price > 1 ? price.toFixed(2) : price.toPrecision(2);
}
