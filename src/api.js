const COINT_API_URL = 'https://min-api.cryptocompare.com';
const API_KEY = '976e862f8ec3cbb0054f8f8da3a6ed26f0078c92474004333593c3d4aace5891';
const COIN_CURRENCY = 'USD';

export const getSubscribedCoinsPrice = async (tickers) => {
  const f = await fetch(
    `${COINT_API_URL}/data/pricemulti?fsyms=${tickers.join(',')}&tsyms=${COIN_CURRENCY}&api_key=${API_KEY}`
  );
  const coinsList = await f.json();
  return Object.keys(coinsList).reduce((allCoins, currentCoin) => {
    allCoins[currentCoin] = getPrice(coinsList[currentCoin][COIN_CURRENCY])
    return allCoins;
  }, {});
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

const getPrice = (price) => {
  return price > 1 ? price.toFixed(2) : price.toPrecision(2);
}
