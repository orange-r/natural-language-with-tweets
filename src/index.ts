import needle = require('needle');
import { format } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import { ja } from 'date-fns/locale'

// AWS
// let AccessKeyId = process.env.AWS_ACCESS_KEY_ID
// let SecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
let aws = require('aws-sdk')
const s3 = new aws.S3()

// Twitter
const Twitter = require('twitter')
const client = new Twitter({
  consumer_key        : process.env.API_KEY ,           // consumer keyを記入
  consumer_secret     : process.env.API_KEY_SECRET,     // consumer secretを記入
  access_token_key    : process.env.ACCESS_TOKEN,       // access tokenを記入
  access_token_secret : process.env.ACCESS_TOKEN_SECRET // access token secretを記入
});
let token = process.env.BEARER_TOKEN;
let endpointUrl = 'https://api.twitter.com/2/tweets/search/recent';

exports.handler = async (event: any, context: any, callback: Function) => {
  // 現在時刻(Tokyo)
  let utcDate: Date = new Date();
  let jstDate: Date = utcToZonedTime(utcDate, 'Asia/Tokyo');

  console.info(`UTC: ${utcDate}`);
  console.info(`JST: ${jstDate}`);

  // let params = {
  //   'query': 'from:twitterdev -is:retweet',
  //   'tweet.fields': 'author_id'
  // }

  // let headers = {
  //     'User-Agent': 'v2RecentSearchJS',
  //     'authorization': `Bearer ${token}`
  //   }

  // needle('get', endpointUrl, params, { headers: headers })
  // .then( (response: needle.NeedleResponse) => {
    // console.info(response.body);
  // })
  // .catch( (err: any) => {
    // throw new Error('Unsuccessful request');
  // })

  // Twitterからデータ取得
  try {
    let tweets = await client.get('search/tweets', { q: '魔王さま exclude:retweets', count: 3, lang: 'ja', locale: 'ja', result_type: 'recent' , max_id: null} );
    console.log('--- resulrt of getting Twitter ---');
    console.log('--- tweets ---');
    console.log(tweets.statuses.length);
    // console.log('--- tweets[0] ---');
    // console.dir(tweets.statuses[0], { depth: null });
    // console.log(tweets.statuses[0].text);
    console.log('--- each tweet of tweets ---');
    for (let tweet of tweets.statuses) {
      console.log('+-----------+');
      console.info(tweet.created_at);
      console.info(tweet.text);
      // console.dir(tweet, { depth: null });
      console.log('+-----------+');
    }
    // console.log('--- response ---');
    // console.log(response);
  } catch (error) {
     console.warn('ERROR: Twitter.client.get');
     console.warn(error, error.stack);
    throw error;
  }

  // S3へ書き出す(yyyy-mm-dd/)
  let destparams = {
    Bucket: 'natural-language-with-tweets',
    Key: `${format(jstDate, 'yyyy-MM-dd', {locale: ja})}/file.text`,
    Body: "test",
    ContentType: 'text/plain'
  };

  try {
    let putResult = await s3.putObject(destparams).promise();
     console.log(putResult);
  } catch(error) {
     console.warn(error, error.stack);
  }


  return ('Hello from Lambda with Typescript');
}
