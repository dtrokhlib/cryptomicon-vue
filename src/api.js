const COINT_API_URL = 'https://min-api.cryptocompare.com';
const API_KEY = '976e862f8ec3cbb0054f8f8da3a6ed26f0078c92474004333593c3d4aace5891';
const COIN_CURRENCY = 'USD';

const tickersHandlers = new Map();

export const getSubscribedCoinsPrice = async () => {
  if (tickersHandlers.size === 0) {
    return;
  }

  const f = await fetch(
    `${COINT_API_URL}/data/pricemulti?fsyms=${[...tickersHandlers.keys()].join(',')}&tsyms=${COIN_CURRENCY}&api_key=${API_KEY}`
  );
  const coinsList = await f.json();

  const updatedPrices = Object.fromEntries(Object.entries(coinsList).map(([key, value]) => [key, value[COIN_CURRENCY]]));
  Object.entries(updatedPrices).forEach(([coin, newPrice]) => {
      const handlers = tickersHandlers.get(coin) ?? [];
      handlers.forEach(fn => fn(newPrice));
  });
};

export const getCoinPrice = async (tickerName) => {
  const f = await fetch(
    `${COINT_API_URL}/data/price?fsym=${tickerName}&tsyms=${COIN_CURRENCY}&api_key=${API_KEY}`
  );
  const data = await f.json();
  if (!data?.USD) {
    return null;
  }
  return getPrice(data.USD);
};

export const getCoinList = async () => {
  const res = await fetch(`${COINT_API_URL}/data/all/coinlist?summary=true`);
  const { Data } = await res.json();
  return Object.keys(Data).map((key) => Data[key]);
}

export const subscribeToTicker = (ticker, cb) => {
  if (!tickersHandlers.has(ticker)) {
    tickersHandlers.set(ticker, []);
  }

  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
}

export const unsubscribeFromTicker = (ticker) => {
  tickersHandlers.delete(ticker);
}

const getPrice = (price) => {
  if (!price) {
    return  '-';
  }
  return price > 1 ? price.toFixed(2) : price.toPrecision(2);
}
