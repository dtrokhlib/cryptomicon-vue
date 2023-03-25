const TickerStatuses = {
  INVALID: 'invalid',
  CONVERTED: 'converted',
};

const routes = {
  coinList: 'data/all/coinlist',
  pairsList: 'data/v2/cccagg/pairs'
}

export class CryptoApi {
  tickerHandlers = new Map();
  invalidExchanges = new Map();
  pairsList = {};
  coinPriceToUsd = new Map();

  constructor(
    apiData,
    workerConnector,
  ) {
    this.apiData = apiData;
    this.workerConnector = workerConnector;
    this.initEventListener();

  }

  async initEventListener() {
    await this.retrievePairs();
    this.workerConnector.onmessage = (e) => {
      const { TYPE, PRICE, FROMSYMBOL, TOSYMBOL, PARAMETER, MESSAGE } = JSON.parse(e.data);
      TYPE === this.apiData.AGGREGATE_INDEX && this.updateTickerPrice(FROMSYMBOL, TOSYMBOL, PRICE);
      TYPE === '500' && MESSAGE === 'INVALID_SUB' && this.validatePossibleCoinTransfers(PARAMETER);
    }
  }

  updateTickerPrice(fromSymbol, toSymbol, rawPrice) {
    console.log(fromSymbol, toSymbol);
    if (toSymbol === 'USD') {
      return this.directExchangeUpdate(fromSymbol, rawPrice)
    }
    return this.doubleConversionExchangeUpdate(fromSymbol, toSymbol, rawPrice)
  }

  directExchangeUpdate(fromSymbol, rawPrice) {
    const handlers = this.tickerHandlers.get(fromSymbol)?.callbacks || [];
    const price = this.getPrice(rawPrice);
    handlers.forEach(fn => fn(price));
    price && this.addCoinPriceMemoryStore(fromSymbol, rawPrice);
  }

  doubleConversionExchangeUpdate(fromSymbol, toSymbol, rawPrice, retry = 3) {
    console.log(this.coinPriceToUsd);
    if(!this.coinPriceToUsd.has(toSymbol)) {
      retry && setTimeout(() => this.doubleConversionExchangeUpdate(fromSymbol, toSymbol, rawPrice, retry--), 5000);
      return;
    }
    const coinForExchanges = this.coinPriceToUsd.get(toSymbol);
    const handlers = this.tickerHandlers.get(fromSymbol)?.callbacks || [];
    const price = this.getPrice(rawPrice * coinForExchanges * 1);

    price && this.tickerHandlers.get(fromSymbol)?.changeTickerStatus(TickerStatuses.CONVERTED);
    handlers.forEach(fn => fn(price));
  }

  validatePossibleCoinTransfers(parameters) {
    const params = parameters.split('~');
    const [convertToCurrency, tickerName] = params.reverse();
    if(tickerName && convertToCurrency) {
      this.handleInvalidCoinTransfer(tickerName, convertToCurrency)
    }
  }

  addCoinPriceMemoryStore(tickerName, price) {
    this.coinPriceToUsd.set(tickerName, price);
  }

  handleInvalidCoinTransfer(tickerName, convertToCurrency) {
    const currencyForDoubleConversion = this.getPossibleExchangeCurrency(tickerName);
    
    if (currencyForDoubleConversion) {
      this.subscribeToUpdates(tickerName, currencyForDoubleConversion);
      this.subscribeToUpdates(currencyForDoubleConversion);
    }


    this.tickerHandlers.get(tickerName)?.changeTickerStatus(TickerStatuses.INVALID);
    if (convertToCurrency === 'USD') {
      this.subscribeToUpdates(tickerName, 'BTC');
    }
  }

  getPossibleExchangeCurrency(ticker) {
    const exchanges = this.pairsList[ticker].tsyms;
    const exchangesList = Object.keys(exchanges);

    if(!exchangesList?.length) {
      return null;
    }

    for (let currency of exchangesList) {
      if(this.pairsList[currency]?.tsyms?.USD) {
        return currency;
      }
    }

    return null;
  }

  addTicker(ticker, cb, changeTickerStatus) {
    const subscribers = this.tickerHandlers.get(ticker)?.callbacks || [];
    this.tickerHandlers.set(ticker, { 
      callbacks: [...subscribers, cb], 
      changeTickerStatus,
    });
    this.subscribeToUpdates(ticker);
  }

  removeTicker(ticker) {
    this.tickerHandlers.delete(ticker);
    this.unsubscribeFromUpdates(ticker);
  }

  subscribeToUpdates(ticker, coinCurrency = this.apiData.COIN_CURRENCY) {
    this.workerConnector.postMessage(JSON.stringify({
      action: "SubAdd",
      subs: [`${this.apiData.AGGREGATE_INDEX}~CCCAGG~${ticker}~${coinCurrency}`],
    }));
  }

  unsubscribeFromUpdates(ticker) {
    this.workerConnector.postMessage(JSON.stringify({
      action: "SubRemove",
      subs: [`${this.apiData.AGGREGATE_INDEX}~CCCAGG~${ticker}~${this.apiData.COIN_CURRENCY}`],
    }));
  }

  async retrievePairs() {
    const url = `${this.apiData.COIN_API_URL}/${routes.pairsList}?api_key=${this.apiData.API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json?.Data) {
      this.pairsList = json.Data?.pairs || [];
    }
  }

  async getCoinList() {
    const url = `${this.apiData.COIN_API_URL}/${routes.coinList}?api_key=${this.apiData.API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    return  Object.keys(json.Data);
  }

  getPrice = (price) => {
    if (!price) {
      return  '-';
    }
    return price > 1 ? price.toFixed(2) : price.toPrecision(2);
  }
}

const apiData = {
  COIN_API_URL: 'https://min-api.cryptocompare.com',
  API_KEY: '976e862f8ec3cbb0054f8f8da3a6ed26f0078c92474004333593c3d4aace5891',
  COIN_CURRENCY: 'USD',
  SECONDARY_CURRENCY: 'BTC',
  AGGREGATE_INDEX: '5',
};


const workerConnector = new SharedWorker('worker-socket-connector.js');
workerConnector.port.start();

export const cryptoApi = new CryptoApi(apiData, workerConnector.port);