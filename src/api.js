const COINT_API_URL = 'https://min-api.cryptocompare.com';
const API_KEY = '976e862f8ec3cbb0054f8f8da3a6ed26f0078c92474004333593c3d4aace5891';
const COIN_CURRENCY = 'USD';

export const getCoinCurrentPrice = async (tickerName) => {
  const f = await fetch(
    `${COINT_API_URL}/data/price?fsym=${tickerName}&tsyms=${COIN_CURRENCY}&api_key=${API_KEY}`
  );
  const data = await f.json();
  if (!data?.USD) {
    return null;
  }
  return data.USD > 1 ? data.USD.toFixed(2) : data.USD.toPrecision(2);
};

export const getCoinList = async () => {
  const res = await fetch(`${COINT_API_URL}/data/all/coinlist?summary=true`);
  const { Data } = await res.json();
  return Object.keys(Data).map((key) => Data[key]);
}
