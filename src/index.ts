import needle = require("needle");

let token = process.env.BEARER_TOKEN;
let endpointUrl = "https://api.twitter.com/2/tweets/search/recent";

exports.handler = (event: any, context: any, callback: Function) => {
  console.info('[From Typescript]');
  console.info('Event not processed.');

  console.info(token);

  let params = {
    'query': 'from:twitterdev -is:retweet',
    'tweet.fields': 'author_id'
  }

  let headers = {
      "User-Agent": "v2RecentSearchJS",
      "authorization": `Bearer ${token}`
    }

  needle('get', endpointUrl, params, { headers: headers })
  .then( (response: needle.NeedleResponse) => {
    console.info(response.body);
  })
  .catch( (err: any) => {
    throw new Error('Unsuccessful request');
  })

  callback(null, 'Hello from Lambda with Typescript');
}
