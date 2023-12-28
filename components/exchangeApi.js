export const getCur = async (date) => {


  const url = 'https://openexchangerates.org/api/historical/' + date + '.json?app_id=' + process.env.NEXT_PUBLIC_OPENEXCHANGERATES_APP_ID;

  const options = {
    method: 'GET',
  };

  try {
    return await fetch(url, options).then(response => {
      if (response.status === 400) {
        return Promise.resolve(1.05);
      } else {
        if (response.status === 200) {
          return response.json().then(data => {
            return (1/data.rates.EUR).toFixed(4)*1;
          });
        }
      }
    })
  } catch (error) {
    console.error(error);
  }
}

